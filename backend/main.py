import os
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from req_models.req_models import LessonRequest, SubtopicRequest
from helper.extract_nodes_from_mermaid import extract_nodes_from_mermaid
from fastapi import HTTPException

load_dotenv()

app = FastAPI()

# ✅ Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# -------------------------
# AI GENERATION HELPERS
# -------------------------
def generate_mermaid_code_ai(lesson_name: str, model: str) -> dict:
    prompt = f"""
    Generate only Mermaid.js code (no explanation, no text, no markdown formatting). 
    The code should describe a flowchart for the lesson "{lesson_name}" 
    with all the important subtopics and their dependencies, use upto 3500 tokens only. 
    Output only the Mermaid code, starting directly with 'graph TD'.
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
async def get_lessons():
    try:
        lessons = await lessons_collection.find().to_list(50)
        
        # Convert ObjectId to string
        for lesson in lessons:
            lesson["_id"] = str(lesson["_id"])
            lesson["subtopics"] = [str(s) for s in lesson.get("subtopics", [])]
        
        return lessons
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/lesson/{lesson_id}")
async def get_lesson(lesson_id: str):
    try:
        # 1. Fetch the lesson
        lesson = await lessons_collection.find_one({"_id": ObjectId(lesson_id)})
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")

        # 2. Convert ObjectId to string
        lesson["_id"] = str(lesson["_id"])

        # Extract only labels (titles) from subtopics
        subtopic_ids = lesson.get("subtopics", [])
        subtopic_titles = [s["label"] for s in subtopic_ids if "label" in s]

        print("Subtopic Titles:", subtopic_titles)

        if subtopic_titles:
            lesson["subtopics"] = subtopic_titles

        return lesson

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))