import os
import requests
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from req_models.req_models import LessonRequest, SubtopicRequest, SignInRequest
from helper.extract_nodes_from_mermaid import extract_nodes_from_mermaid
from fastapi import HTTPException
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import BaseModel, EmailStr
from fastapi import FastAPI, HTTPException
import random, string
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi.responses import JSONResponse
from settings import conf

app = FastAPI()

otp_store = {}

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    name: str
    otp: str

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://ai-course-visualizer.vercel.app/", "https://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Setup
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = "lessonDB"

mongo_client = AsyncIOMotorClient(MONGO_URI)
db = mongo_client[DB_NAME]

lessons_collection = db["lessons"]
subtopics_collection = db["subtopics"]
contents_collection = db["contents"]
users_collection = db["users"]

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# -------------------------
# AI GENERATION HELPERS
# -------------------------
def generate_mermaid_code_ai(lesson_name: str, model: str) -> dict:
    prompt = f"""
    Generate only Mermaid.js code flowchart (no explanation, no text, no markdown formatting). 
    The code should describe a flowchart for the lesson "{lesson_name}" 
    with all the important subtopics and their dependencies. 
    Output only the Mermaid code, starting directly with 
    'flowchart TD' or 'flowchart LR' or 'graph TD' or 'graph LR'
    according to the size of the code so that it looks good, and 
    make sure to give the correct mermaid code which does not breaks at the time of rendering.
    """
    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a helpful tutor."},
                {"role": "user", "content": prompt}
            ],
        },
    )
    data = response.json()
    if "choices" not in data:
        return {"error": data}
    return {
        "model_used": model,
        "content": data["choices"][0]["message"]["content"]
        .strip()
        .replace("```mermaid", "")
        .replace("```", "")
        .strip(),
    }

def generate_subtopic_content(lesson_name: str, subtopic_name: str, model: str) -> dict:
    prompt = f"""
    Generate the quick revision notes for the lesson "{lesson_name}" 
    and subtopic "{subtopic_name}"
    which contains all the important points and concepts in a descriptive manner.
    """
    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a helpful tutor."},
                {"role": "user", "content": prompt},
            ],
        },
    )
    data = response.json()
    if "choices" not in data:
        return {"error": data}
    return {
        "model_used": model,
        "content": data["choices"][0]["message"]["content"].strip(),
    }


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=60))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, os.getenv("SECRET_KEY"), algorithm=os.getenv("ALGORITHM"))
    return encoded_jwt

# -------------------------
# ROUTES
# -------------------------
@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.post("/api/lesson")
async def create_lesson(req: LessonRequest):
    mermaid_code = generate_mermaid_code_ai(req.lesson_name, req.model)
    nodes = extract_nodes_from_mermaid(mermaid_code["content"])

    lesson_doc = {
        "user_id": req.user_id,
        "title": req.lesson_name,
        "mermaidDiagram": mermaid_code["content"],
        "model_used": req.model,
        "subtopics": nodes,
    }
    try:
        result = await lessons_collection.insert_one(lesson_doc)
        if result.inserted_id is None:
            return {"error": "Failed to insert lesson"}
        return {
            "user_id": str(result.inserted_id),
            "lesson_id": str(result.inserted_id),
            "lesson_name": req.lesson_name,
            "model": req.model,
            "mermaid_code": mermaid_code["content"],
        }

    except Exception as e:
        return {"error": str(e)}


@app.post("/api/subtopic")
async def create_subtopic(req: SubtopicRequest):
    subtopic_content = generate_subtopic_content(
        req.lesson_name, req.subtopic_name, req.model
    )

    content_doc = {
        "text": subtopic_content["content"],
        "title": req.subtopic_name,
        "metadata": {"model": req.model},
    }
    try:
        content_result = await contents_collection.insert_one(content_doc)
        if content_result.inserted_id is None:
            return {"error": "Failed to insert content"}
        return {
            "lesson_name": req.lesson_name,
            "subtopic_name": req.subtopic_name,
            "model": req.model,
            "subtopic_content": subtopic_content["content"],
        }

    except Exception as e:
        return {"error": str(e)}


@app.get("/api/lessons")
async def get_lessons(user_id: str, request: Request):
    print(user_id)
    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = auth_header.split(" ")[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        lessons = await lessons_collection.find({"user_id": user_id}).to_list(50)

        # Convert ObjectId to string
        for lesson in lessons:
            lesson["_id"] = str(lesson["_id"])
            lesson["subtopics"] = [str(s) for s in lesson.get("subtopics", [])]
        
        return lessons
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/lesson/{lesson_id}")
async def get_lesson(lesson_id: str, user_id: str, request: Request):
    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = auth_header.split(" ")[1]
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        # 1. Fetch the lesson
        lesson = await lessons_collection.find_one({"_id": ObjectId(lesson_id), "user_id": user_id})
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")

        # 2. Convert ObjectId to string
        lesson["_id"] = str(lesson["_id"])

        # Extract only labels (titles) from subtopics
        subtopic_ids = lesson.get("subtopics", [])
        subtopic_titles = [s["label"] for s in subtopic_ids if "label" in s]

        if subtopic_titles:
            lesson["subtopics"] = subtopic_titles

        return lesson

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@app.delete("/api/clear_history")
async def clear_history(user_id: str):
    try:
        await lessons_collection.delete_many({"user_id": user_id})
        return {"message": "Search history cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/clear/{chat_id}")
async def clear_chat_history(chat_id: str, user_id: str):
    try:
        await lessons_collection.delete_many({"_id": ObjectId(chat_id), "user_id": user_id})
        return {"message": "Chat history cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/initiate-signin")
async def initiate_signin(req: SignInRequest):
    # 1. Generate OTP
    otp = ''.join(random.choices(string.digits, k=6))
    expiry = datetime.utcnow() + timedelta(minutes=5)

    otp_store[req.email] = {"otp": otp, "expires": expiry, "name": req.name}

    # 2. Send Email
    message = MessageSchema(
        subject="Your OTP Code",
        recipients=[req.email],
        body=f"Hi {req.name},\n\nYour OTP is: {otp}. It will expire in 5 minutes.\n\nRegards,\nTeam",
        subtype="plain"
    )
    fm = FastMail(conf)
    await fm.send_message(message)

    return {"message": f"OTP sent successfully to {req.email}"}

@app.post("/api/verify-otp")
async def verify_otp(req: VerifyOTPRequest):
    # 1. Validate OTP
    if req.email not in otp_store:
        raise HTTPException(status_code=400, detail="No OTP request found")

    data = otp_store[req.email]
    if datetime.utcnow() > data["expires"]:
        raise HTTPException(status_code=400, detail="OTP expired")
    if req.otp != data["otp"]:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    # OTP valid — remove from store
    del otp_store[req.email]

    # 2. Check if user exists
    user = await users_collection.find_one({"email": req.email})

    if not user:
        # New signup
        new_user = {
            "email": req.email,
            "name": req.name,
            "created_at": datetime.utcnow()
        }
        result = await users_collection.insert_one(new_user)
        user_id = str(result.inserted_id)
    else:
        user_id = str(user["_id"])

    # 3. Issue JWT Token
    access_token_expires = timedelta(
        minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
    )
    token = create_access_token(
        data={"sub": req.email, "user_id": user_id},
        expires_delta=access_token_expires
    )

    # 4. Return response with HttpOnly cookie
    response = JSONResponse(
        content={
            "message": "OTP verified, login successful",
            "user": {"id": user_id, "email": req.email, "name": req.name, "token": token}
        }
    )
    response.set_cookie(
        key="token",
        value=token,
        httponly=True,
        secure=os.getenv("ENV") == "production",
        samesite="strict",
        max_age=int(access_token_expires.total_seconds()),
        path="/"
    )

    return response

@app.post("/api/logout")
def logout():
    response = JSONResponse(
        content={"message": "Logout successful"}
    )
    response.delete_cookie("token", path="/")
    return response
