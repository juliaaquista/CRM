from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    accion = Column(String, nullable=False)       # "CREAR", "EDITAR", "ELIMINAR"
    entidad = Column(String, nullable=False)       # "empresa", "contacto", "oferta", "accion", "producto", "usuario", "alerta"
    entidad_id = Column(Integer, nullable=False)
    detalle = Column(Text, default="")             # JSON string con cambios o descripción
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario")
