from fastapi import FastAPI, HTTPException, Query, UploadFile, File, Form
import shutil, uuid, os
from fastapi.middleware.cors import CORSMiddleware
import httpx
from dotenv import load_dotenv
from typing import Dict

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

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
    user_email: str = Form(...)
):
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, file.filename)

    try:
        print(f"📄 Received file: {file.filename}")
        print(f"📦 Content type: {file.content_type}")

        # Save file temporarily
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        print(f"📥 Temp file saved: {temp_path}")

        # Dummy processing
        content_summary = f"This is a dummy summary of {file.filename}"
        job_id = str(uuid.uuid4())

        # Save to Supabase via REST API
        async with httpx.AsyncClient() as client:
            response = await client.post(
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
                    "summary": content_summary,
                    "user_email": user_email
                }
        )

        if response.status_code != 201:
            print("❌ Supabase insert error:", response.text)
            raise HTTPException(status_code=500, detail="Failed to store job in Supabase")

        print(f"✅ Supabase stored job_id={job_id} for {user_email}")
        return { "job_id": job_id }

    except Exception as e:
        print("❌ Upload error:", e)
        raise HTTPException(status_code=500, detail="File upload failed")

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
            print(f"🧹 Temp file deleted: {temp_path}")

@app.get("/results")
async def get_results(job_id: str = Query(...), user_email: str = Query(...)):
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }

    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{SUPABASE_URL}/rest/v1/jobs?id=eq.{job_id}&user_email=eq.{user_email}",
            headers=headers
        )

    if res.status_code != 200 or not res.json():
        raise HTTPException(status_code=404, detail="Result not found or not authorized")

    return res.json()[0]