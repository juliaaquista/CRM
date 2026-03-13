from datetime import datetime
from pydantic import BaseModel
from app.models.empresa import OrigenEmpresaEnum


class EmpresaCreate(BaseModel):
    nombre: str
    ciudad: str | None = None
    provincia: str | None = None
    razon_social: str | None = None
    notas_comerciales: str | None = None
    origen: OrigenEmpresaEnum
    origen_detalle: str | None = None


class EmpresaUpdate(BaseModel):
    nombre: str | None = None
    ciudad: str | None = None
    provincia: str | None = None
    razon_social: str | None = None
    notas_comerciales: str | None = None
    origen: OrigenEmpresaEnum | None = None
    origen_detalle: str | None = None


class EmpresaResponse(BaseModel):
    id: int
    nombre: str
    ciudad: str | None
    provincia: str | None
    razon_social: str | None
    notas_comerciales: str | None
    origen: OrigenEmpresaEnum
    origen_detalle: str | None = None
    latitud: float | None = None
    longitud: float | None = None
    creado_en: datetime | None

    model_config = {"from_attributes": True}
