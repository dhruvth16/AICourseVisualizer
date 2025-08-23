from pydantic import BaseModel
from typing import Optional, List

class ContentSchema(BaseModel):
    title: str
    text: str
    metadata: Optional[dict] = {}

class SubtopicSchema(BaseModel):
    name: str
    content_id: Optional[str] = None   # linked content

class LessonSchema(BaseModel):
    title: str
    mermaidDiagram: str
    subtopics: Optional[List[str]] = []  # store ObjectIds of subtopics

class UserSchema(BaseModel):
    email: str
    name: str
    otp: str
