from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class TipoAccionEnum(str, enum.Enum):
    LLAMADA = "LLAMADA"
    VISITA = "VISITA"
    SEGUIMIENTO = "SEGUIMIENTO"
    VIDEOLLAMADA = "VIDEOLLAMADA"
    OTRO = "OTRO"


class EstadoAccionEnum(str, enum.Enum):
    PENDIENTE = "PENDIENTE"
    FINALIZADA = "FINALIZADA"
    ANULADA = "ANULADA"


class AccionParticipante(Base):
    __tablename__ = "accion_participantes"

    id = Column(Integer, primary_key=True, index=True)
    accion_id = Column(Integer, ForeignKey("acciones.id", ondelete="CASCADE"), nullable=False)
    contacto_id = Column(Integer, ForeignKey("contactos.id", ondelete="CASCADE"), nullable=False)


class Accion(Base):
    __tablename__ = "acciones"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=True)
    contacto_id = Column(Integer, ForeignKey("contactos.id", ondelete="SET NULL"), nullable=True)
    tipo = Column(Enum(TipoAccionEnum), nullable=False)
    tipo_otro = Column(String, nullable=True)
    estado = Column(Enum(EstadoAccionEnum), default=EstadoAccionEnum.PENDIENTE)
    fecha_hora = Column(DateTime(timezone=True), nullable=False)
    todo_el_dia = Column(Boolean, default=False)
    duracion_minutos = Column(Integer, default=60)
    descripcion = Column(String)
    enlace_videollamada = Column(String, nullable=True)
    es_resumida = Column(Boolean, default=False)
    nombre_cliente_resumida = Column(String, nullable=True)
    creado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    empresa = relationship("Empresa", back_populates="acciones")
    contacto = relationship("Contacto", back_populates="acciones")
    creado_por = relationship("Usuario")
    participantes = relationship("Contacto", secondary="accion_participantes")
