import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from google import genai

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

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def generate_mermaid_code_ai(lesson_name: str) -> str:
    prompt = f"""
    Generate only Mermaid.js code (no explanation, no text, no markdown formatting). 
    The code should describe a flowchart for the lesson "{lesson_name}" 
    with all the important subtopics and their dependencies. 
    Output only the Mermaid code, starting directly with 'graph TD'.
    """
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )
    return response.text.strip()

def generate_subtopic_content(lesson_name: str, subtopic_name: str) -> str:
    prompt = f"""
    Generate the quick revision notes for the lesson "{lesson_name}" and subtopic "{subtopic_name}"
    which contains all the important points and concepts in a descriptive manner.
    """
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )
    return response.text.strip()

@app.get("/")
def read_root():
    return {"Hello World"}

@app.post("/api/lesson/{lesson_name}")
def create_lesson(lesson_name: str):
    mermaid_code = generate_mermaid_code_ai(lesson_name)
    return {"lesson_name": lesson_name, "mermaid_code": mermaid_code}

@app.post("/api/{lesson_name}/{subtopic_name}")
def create_subtopic(lesson_name: str, subtopic_name: str):
    subtopic_content = generate_subtopic_content(lesson_name, subtopic_name)
    return {"lesson_name": lesson_name, "subtopic_name": subtopic_name, "subtopic_content": subtopic_content}
