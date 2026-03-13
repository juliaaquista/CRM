from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class EmpresaComercial(Base):
    __tablename__ = "empresa_comercial"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    comercial_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    asignado_en = Column(DateTime(timezone=True), server_default=func.now())

    # Tipo: TITULAR (dueño original) o COMPARTIDO (acceso temporal/compartido)
    tipo = Column(String, default="TITULAR", nullable=False)

    # Para compartidos: quién compartió y hasta cuándo
    compartido_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    fecha_fin = Column(DateTime(timezone=True), nullable=True)  # NULL = indeterminado

    # Si el comercial original mantiene acceso durante la compartición
    acceso_origen = Column(Boolean, default=True, nullable=False)

    empresa = relationship("Empresa", back_populates="comerciales")
    comercial = relationship("Usuario", foreign_keys=[comercial_id])
    compartido_por = relationship("Usuario", foreign_keys=[compartido_por_id])
