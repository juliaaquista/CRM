from pydantic import BaseModel


class ContactoCreate(BaseModel):
    empresa_id: int
    nombre: str
    cargo: str | None = None
    email: str | None = None
    telefono: str | None = None
    telefono2: str | None = None
    extension: str | None = None
    sucursal: str | None = None


class ContactoUpdate(BaseModel):
    nombre: str | None = None
    cargo: str | None = None
    email: str | None = None
    telefono: str | None = None
    telefono2: str | None = None
    extension: str | None = None
    sucursal: str | None = None


class ContactoResponse(BaseModel):
    id: int
    empresa_id: int
    nombre: str
    cargo: str | None
    email: str | None
    telefono: str | None
    telefono2: str | None
    extension: str | None
    sucursal: str | None

    model_config = {"from_attributes": True}
