from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)

class ClientCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None

class ClientOut(BaseModel):
    id: int
    name: str
    email: Optional[EmailStr]
    created_at: datetime

    class Config:
        from_attributes = True

class InvoiceCreate(BaseModel):
    client_id: int
    title: str
    amount: float
    due_date: Optional[datetime] = None

class InvoiceOut(BaseModel):
    id: int
    client_id: int
    title: str
    amount: float
    due_date: Optional[datetime]
    is_paid: bool
    created_at: datetime

    class Config:
        from_attributes = True

