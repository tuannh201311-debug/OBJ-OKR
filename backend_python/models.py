import uuid
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

# Helper to generate UUIDs
def generate_uuid():
    return str(uuid.uuid4())

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    display_name: Optional[str] = None

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    password: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    display_name: Optional[str] = None
    role: Optional[str] = "user"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class RoleCreate(BaseModel):
    user_id: str
    role: str

# OKR Models
class OKRBase(BaseModel):
    title: str
    objective: Optional[str] = ""
    description: Optional[str] = None
    deadline: Optional[str] = "2026-12-31"
    ownerId: Optional[str] = "Chưa gán"
    target: Optional[str] = "OKR"
    progress: Optional[float] = 0.0

class OKRCreate(OKRBase):
    pass

class OKRResponse(OKRBase):
    id: str
    user_id: Optional[str] = None
    created_at: Optional[str] = None

# BigTask Models
class BigTaskBase(BaseModel):
    okr_id: str
    title: str
    weight: float = 0.0
    progress: Optional[float] = 0.0
    deadline: Optional[str] = "2026-12-31"

class BigTaskCreate(BigTaskBase):
    pass

class BigTaskResponse(BigTaskBase):
    id: str
    created_at: Optional[str] = None

# SubTask Models
class SubTaskBase(BaseModel):
    big_task_id: str
    title: str
    status: str = "todo"
    progress: float = 0.0
    assignee: Optional[str] = "Chưa gán"
    weight: float = 0.0
    deadline: Optional[str] = "2026-12-31"
    note: Optional[str] = ""

class SubTaskCreate(SubTaskBase):
    pass

class SubTaskResponse(SubTaskBase):
    id: str
    created_at: Optional[str] = None
