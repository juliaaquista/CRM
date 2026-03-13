from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class EmpresaArchivo(Base):
    __tablename__ = "empresa_archivos"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    nombre_original = Column(String, nullable=False)
    nombre_disco = Column(String, nullable=False)
    tamano = Column(Integer, nullable=False)  # bytes
    subido_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    subido_en = Column(DateTime(timezone=True), server_default=func.now())

    empresa = relationship("Empresa", back_populates="archivos")
    subido_por = relationship("Usuario")
