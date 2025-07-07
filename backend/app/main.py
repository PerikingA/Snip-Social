from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
from dotenv import load_dotenv

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
