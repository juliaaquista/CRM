from datetime import date, datetime
from pydantic import BaseModel


class AlertaCreate(BaseModel):
    fecha: date
    motivo: str
    empresa_id: int | None = None


class AlertaUpdate(BaseModel):
    fecha: date | None = None
    motivo: str | None = None
    empresa_id: int | None = None
    completada: bool | None = None


class AlertaResponse(BaseModel):
    id: int
    fecha: date
    motivo: str
    empresa_id: int | None
    completada: bool
    creado_por_id: int
    creado_en: datetime | None

    model_config = {"from_attributes": True}
