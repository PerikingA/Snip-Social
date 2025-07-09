from fastapi import FastAPI, HTTPException, Query, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
import shutil, uuid, os, json, subprocess
from fastapi.middleware.cors import CORSMiddleware
import httpx
from dotenv import load_dotenv
from typing import Dict
from openai import OpenAI

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

app = FastAPI()

origins = [
    "http://localhost:3000",  # Next.js dev server
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

result_store: Dict[str, dict] = {}

@app.get("/check-email")
async def check_email_availability(email: str = Query(...)):
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Missing Supabase config")

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }

    url = f"{SUPABASE_URL}/auth/v1/admin/users?email={email}"

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)

    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to contact Supabase")

    data = response.json()
    print("🔍 Supabase response:", data)

    users = data.get("users", [])

    for user_info in users:
        if user_info.get("email", "").lower() == email.lower():
            raise HTTPException(status_code=409, detail="Email already in use.")

    return {"available": True}

# @app.post("/upload")
# async def upload_file(file: UploadFile = File(...)):
#     try:
#         temp_dir = "temp_uploads"
#         os.makedirs(temp_dir, exist_ok=True)
#         file_path = os.path.join(temp_dir, file.filename)

#         with open(file_path, "wb") as buffer:
#             shutil.copyfileobj(file.file, buffer)

#         print(f"✅ File saved to: {file_path}")

#         return {"filename": file.filename, "path": file_path}

#     except Exception as e:
#         print("❌ Upload error:", e)
#         raise HTTPException(status_code=500, detail="File upload failed")



@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user_email: str = Form(...),
    platform: str = Form(...)
):
    temp_dir = "temp_uploads"
    clip_dir = "clips"
    os.makedirs(temp_dir, exist_ok=True)
    os.makedirs(clip_dir, exist_ok=True)

    temp_path = os.path.join(temp_dir, file.filename)

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        with open(temp_path, "rb") as audio_file:
            transcript_response = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="text"
            )
        transcription = transcript_response

        function_schema = {
            "name": "extract_viral_content",
            "description": "Extract viral clips and captions",
            "parameters": {
                "type": "object",
                "properties": {
                    "clips": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "start_time": {"type": "string"},
                                "end_time": {"type": "string"},
                                "description": {"type": "string"}
                            },
                            "required": ["start_time", "end_time", "description"]
                        }
                    },
                    "texts": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                },
                "required": ["clips", "texts"]
            }
        }

        tone_map = {
            "linkedin": "professional and insightful",
            "instagram": "aesthetic and emotionally engaging",
            "tiktok": "fast-paced and entertaining",
            "twitter": "short, witty, and viral"
        }

        completion = client.chat.completions.create(
            model="gpt-4-1106-preview",
            messages=[
                {
                    "role": "system",
                    "content": f"You are a content strategist optimizing posts for {platform}."
                },
                {
                    "role": "user",
                    "content": f"""Analyze this transcript from a {platform} video/audio and:
1. Identify 3 viral clips with start_time and end_time in format HH:MM:SS.
2. Write 5 captions for {platform} in a {tone_map.get(platform, "engaging")} tone.

Transcript:
\"\"\"{transcription}\"\"\"
"""
                }
            ],
            functions=[function_schema],
            function_call={"name": "extract_viral_content"}
        )

        parsed_args = json.loads(completion.choices[0].message.function_call.arguments)
        viral_clips = parsed_args["clips"]
        viral_texts = parsed_args["texts"]

        job_id = str(uuid.uuid4())
        clip_paths = []

        for i, clip in enumerate(viral_clips):
            start = clip["start_time"]
            end = clip["end_time"]
            out_path = os.path.join(clip_dir, f"{job_id}_clip{i+1}.mp4")

            cmd = [
                "ffmpeg", "-y", "-i", temp_path,
                "-ss", start, "-to", end,
                "-c", "copy", out_path
            ]
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

            # ✅ Serve path for frontend
            clip_paths.append(f"clips/{os.path.basename(out_path)}")

        # Save to Supabase
        async with httpx.AsyncClient() as http_client:
            supabase_response = await http_client.post(
                f"{SUPABASE_URL}/rest/v1/jobs",
                headers={
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=representation"
                },
                json={
                    "id": job_id,
                    "filename": file.filename,
                    "type": file.content_type,
                    "summary": transcription[:500],
                    "user_email": user_email,
                    "platform": platform,
                    "clips": clip_paths,
                    "texts": viral_texts
                }
            )

        if supabase_response.status_code != 201:
            raise HTTPException(status_code=500, detail="Supabase insert failed")

        return {
            "job_id": job_id,
            "clips": clip_paths,
            "texts": viral_texts
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.get("/results")
async def get_results(job_id: str, user_email: str):
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{SUPABASE_URL}/rest/v1/jobs?id=eq.{job_id}&user_email=eq.{user_email}",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}"
            }
        )

    if res.status_code != 200 or not res.json():
        raise HTTPException(status_code=404, detail="Result not found")

    return res.json()[0]