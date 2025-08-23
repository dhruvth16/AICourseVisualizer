import os
import requests

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

__all__ = ["generate_mermaid_code_ai", "generate_subtopic_content"]

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
