from pydantic import BaseModel
# Export the request models for use in other modules
__all__ = ['LessonRequest', 'SubtopicRequest', 'SignInRequest']
class LessonRequest(BaseModel):
    user_id: str
    lesson_name: str
    model: str
    grade: str

class SubtopicRequest(BaseModel):
    lesson_name: str
    subtopic_name: str
    model: str
    grade: str

class SignInRequest(BaseModel):
    email: str
    name: str

class UpdateProfileRequest(BaseModel):
    name: str