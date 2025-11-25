from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    firstName: str | None = None
    lastName: str | None = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ProfileUpdate(BaseModel):
    firstName: str
    lastName: str | None = None


class PasswordUpdate(BaseModel):
    currentPassword: str
    newPassword: str