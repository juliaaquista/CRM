from typing import Optional

from pydantic import BaseModel, EmailStr, Field
from app.models.usuario import RolEnum


# --- Request schemas ---

class UsuarioCreate(BaseModel):
    nombre: str
    email: EmailStr
    password: str
    rol: RolEnum


class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[EmailStr] = None
    rol: Optional[RolEnum] = None
    activo: Optional[bool] = None


class PasswordReset(BaseModel):
    nueva_password: str = Field(..., min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# --- Response schemas ---

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UsuarioResponse(BaseModel):
    id: int
    nombre: str
    email: str
    rol: RolEnum
    activo: bool

    model_config = {"from_attributes": True}
