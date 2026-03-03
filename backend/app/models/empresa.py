from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class EstadoEmpresaEnum(str, enum.Enum):
    PROSPECTO = "PROSPECTO"
    CONTACTADO = "CONTACTADO"
    PROPUESTA_ENVIADA = "PROPUESTA_ENVIADA"
    NEGOCIANDO = "NEGOCIANDO"
    CERRADO_GANADO = "CERRADO_GANADO"
    CERRADO_PERDIDO = "CERRADO_PERDIDO"

class Empresa(Base):
    __tablename__ = "empresas"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    industria = Column(String)
    ciudad = Column(String)
    pais = Column(String)
    descripcion = Column(String)
    estado = Column(Enum(EstadoEmpresaEnum), default=EstadoEmpresaEnum.PROSPECTO)
    comercial_id = Column(Integer, ForeignKey("usuarios.id"))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    contactos = relationship("Contacto", back_populates="empresa")
    actividades = relationship("Actividad", back_populates="empresa")
    productos = relationship("EmpresaProducto", back_populates="empresa")