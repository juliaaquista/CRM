from datetime import datetime
from pydantic import BaseModel
from app.models.oferta import EstadoOfertaEnum, ModoPagoEnum


class OfertaProductoItem(BaseModel):
    producto_id: int
    cantidad: int = 1
    precio_unitario: float | None = None


class OfertaProductoResponse(BaseModel):
    id: int
    producto_id: int
    producto_nombre: str | None = None
    cantidad: int
    precio_unitario: float | None

    model_config = {"from_attributes": True}


class OfertaCreate(BaseModel):
    empresa_id: int
    productos: list[OfertaProductoItem] = []
    precio_negociado: float | None = None
    notas: str | None = None
    modo_pago: ModoPagoEnum | None = None
    hitos_pago: str | None = None
    especificaciones_pago: str | None = None
    fecha_oferta: datetime | None = None  # Para cargar ofertas del pasado
    estado: EstadoOfertaEnum | None = None  # Permite setear estado al crear


class OfertaUpdate(BaseModel):
    estado: EstadoOfertaEnum | None = None
    precio_negociado: float | None = None
    condiciones_venta: str | None = None
    motivo_perdida: str | None = None
    notas: str | None = None
    productos: list[OfertaProductoItem] | None = None
    modo_pago: ModoPagoEnum | None = None
    hitos_pago: str | None = None
    especificaciones_pago: str | None = None


class OfertaResponse(BaseModel):
    id: int
    numero: str | None = None
    empresa_id: int
    estado: EstadoOfertaEnum
    precio_negociado: float | None
    condiciones_venta: str | None
    motivo_perdida: str | None
    notas: str | None
    modo_pago: ModoPagoEnum | None = None
    hitos_pago: str | None = None
    especificaciones_pago: str | None = None
    creado_por_id: int
    creado_en: datetime | None
    actualizado_en: datetime | None
    productos: list[OfertaProductoResponse] = []

    model_config = {"from_attributes": True}
