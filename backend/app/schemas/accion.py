from datetime import datetime
from pydantic import BaseModel
from app.models.accion import TipoAccionEnum, EstadoAccionEnum


class AccionCreate(BaseModel):
    empresa_id: int | None = None
    contacto_id: int | None = None
    tipo: TipoAccionEnum
    tipo_otro: str | None = None
    fecha_hora: datetime
    todo_el_dia: bool = False
    duracion_minutos: int = 60
    descripcion: str | None = None
    es_resumida: bool = False
    nombre_cliente_resumida: str | None = None


class AccionUpdate(BaseModel):
    tipo: TipoAccionEnum | None = None
    tipo_otro: str | None = None
    estado: EstadoAccionEnum | None = None
    fecha_hora: datetime | None = None
    todo_el_dia: bool | None = None
    duracion_minutos: int | None = None
    descripcion: str | None = None


class AccionResponse(BaseModel):
    id: int
    empresa_id: int | None
    contacto_id: int | None
    tipo: TipoAccionEnum
    tipo_otro: str | None = None
    estado: EstadoAccionEnum
    fecha_hora: datetime
    todo_el_dia: bool = False
    duracion_minutos: int
    descripcion: str | None
    es_resumida: bool
    nombre_cliente_resumida: str | None
    creado_por_id: int
    creado_en: datetime | None
    empresa_razon_social: str | None = None

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, **kwargs):
        # Enrich with empresa_razon_social from relationship
        if hasattr(obj, 'empresa') and obj.empresa:
            instance = super().model_validate(obj, **kwargs)
            instance.empresa_razon_social = obj.empresa.razon_social
            return instance
        return super().model_validate(obj, **kwargs)
