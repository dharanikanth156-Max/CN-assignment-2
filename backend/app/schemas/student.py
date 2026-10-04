from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_name: str
    user_email: str
    user_role: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    name: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class StudentBase(BaseModel):
    roll_no: str
    name: str
    email: EmailStr
    department: str
    year: int
    subscribed: bool = True

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    roll_no: Optional[str] = None
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    department: Optional[str] = None
    year: Optional[int] = None
    subscribed: Optional[bool] = None

class StudentResponse(StudentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class StudentBulkImportResponse(BaseModel):
    total_processed: int
    imported_count: int
    duplicate_count: int
    invalid_count: int
    errors: list[str]
