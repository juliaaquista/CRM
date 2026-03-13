from datetime import datetime
from pydantic import BaseModel


class EmpresaComercialCreate(BaseModel):
    comercial_id: int


class CompartirClienteRequest(BaseModel):
    comercial_destino_id: int
    fecha_fin: datetime | None = None  # NULL = indeterminado
    acceso_origen: bool = True  # si el comercial original mantiene acceso


class EmpresaComercialResponse(BaseModel):
    id: int
    empresa_id: int
    comercial_id: int
    asignado_en: datetime | None
    tipo: str = "TITULAR"
    compartido_por_id: int | None = None
    fecha_fin: datetime | None = None
    acceso_origen: bool = True
    comercial_nombre: str | None = None

    model_config = {"from_attributes": True}
