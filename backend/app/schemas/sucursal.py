from datetime import datetime
from pydantic import BaseModel


class SucursalCreate(BaseModel):
    nombre: str
    direccion: str | None = None
    ciudad: str | None = None
    provincia: str | None = None


class SucursalUpdate(BaseModel):
    nombre: str | None = None
    direccion: str | None = None
    ciudad: str | None = None
    provincia: str | None = None


class SucursalResponse(BaseModel):
    id: int
    empresa_id: int
    nombre: str
    direccion: str | None
    ciudad: str | None
    provincia: str | None
    latitud: float | None = None
    longitud: float | None = None
    creado_en: datetime | None

    model_config = {"from_attributes": True}
