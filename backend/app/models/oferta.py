from sqlalchemy import Column, Integer, String, Float, Enum, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class EstadoOfertaEnum(str, enum.Enum):
    PREOFERTA = "PREOFERTA"
    OFICINA_TECNICA = "OFICINA_TECNICA"
    ENTREGADA = "ENTREGADA"
    VISITAR = "VISITAR"
    STANDBY = "STANDBY"
    PERDIDA = "PERDIDA"


class ModoPagoEnum(str, enum.Enum):
    EFECTIVO = "EFECTIVO"
    TRANSFERENCIA = "TRANSFERENCIA"
    CHEQUE = "CHEQUE"
    RENTING = "RENTING"
    LEASING = "LEASING"


class Oferta(Base):
    __tablename__ = "ofertas"

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String, unique=True, nullable=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    estado = Column(Enum(EstadoOfertaEnum), default=EstadoOfertaEnum.PREOFERTA)
    precio_negociado = Column(Float, nullable=True)
    condiciones_venta = Column(String, nullable=True)
    motivo_perdida = Column(String, nullable=True)
    notas = Column(String, nullable=True)
    modo_pago = Column(Enum(ModoPagoEnum), nullable=True)
    hitos_pago = Column(String, nullable=True)
    especificaciones_pago = Column(String, nullable=True)
    creado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())

    empresa = relationship("Empresa", back_populates="ofertas")
    productos = relationship("OfertaProducto", cascade="all, delete-orphan", lazy="joined")
    creado_por = relationship("Usuario")
