import uuid
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_validator
import re

# Helper to generate UUIDs
def generate_uuid():
    return str(uuid.uuid4())

def validate_date_format(v):
    # We still prefer YYYY-MM-DD but won't block the API if it's different
    return v

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
    title: str = Field(..., min_length=1)
    objective: Optional[str] = ""
    description: Optional[str] = None
    deadline: Optional[str] = "2026-12-31"
    target: Optional[str] = "OKR"
    progress: Optional[float] = Field(0.0, ge=0, le=100)

    @field_validator('deadline')
    @classmethod
    def check_deadline(cls, v):
        return validate_date_format(v)

class OKRCreate(OKRBase):
    pass

class OKRResponse(OKRBase):
    id: str
    user_id: Optional[str] = None
    created_at: Optional[str] = None
    completed_at: Optional[str] = None

# BigTask Models
class BigTaskBase(BaseModel):
    okr_id: str
    title: str = Field(..., min_length=1)
    weight: float = Field(0.0, ge=0)
    progress: Optional[float] = Field(0.0, ge=0, le=100)
    deadline: Optional[str] = "2026-12-31"

    @field_validator('deadline')
    @classmethod
    def check_deadline(cls, v):
        return validate_date_format(v)

class BigTaskCreate(BigTaskBase):
    pass

class BigTaskResponse(BigTaskBase):
    id: str
    created_at: Optional[str] = None
    completed_at: Optional[str] = None

# SubTask Models
class SubTaskBase(BaseModel):
    big_task_id: str
    title: str = Field(..., min_length=1)
    status: str = "todo"
    progress: float = Field(0.0, ge=0, le=100)
    assignee: Optional[str] = "Chưa gán"
    weight: float = Field(0.0, ge=0)
    deadline: Optional[str] = "2026-12-31"
    note: Optional[str] = ""

    @field_validator('deadline')
    @classmethod
    def check_deadline(cls, v):
        return validate_date_format(v)

class SubTaskCreate(SubTaskBase):
    pass

class SubTaskResponse(SubTaskBase):
    id: str
    created_at: Optional[str] = None
    completed_at: Optional[str] = None

# Weekly Report Models
class WeeklyReportBase(BaseModel):
    week_number: int
    year: int
    done_tasks: List[dict] = [] # List of {title, okr_title}
    doing_tasks: List[dict] = [] # List of {title, okr_title}
    challenges: Optional[str] = ""
    next_week_plan: Optional[str] = ""
    ad_hoc_tasks: List[str] = [] # Tasks not in OKR system

class WeeklyReportCreate(WeeklyReportBase):
    pass

class WeeklyReportResponse(WeeklyReportBase):
    id: str
    user_id: str
    user_name: Optional[str] = None
    submitted_at: str
