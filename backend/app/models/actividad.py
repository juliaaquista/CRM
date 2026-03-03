from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class TipoActividadEnum(str, enum.Enum):
    LLAMADA = "LLAMADA"
    REUNION = "REUNION"
    PROPUESTA = "PROPUESTA"
    SEGUIMIENTO = "SEGUIMIENTO"

class Actividad(Base):
    __tablename__ = "actividades"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=True)
    tipo = Column(Enum(TipoActividadEnum), nullable=False)
    fecha = Column(DateTime(timezone=True), nullable=False)
    descripcion = Column(String)
    creado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)

    empresa = relationship("Empresa", back_populates="actividades")