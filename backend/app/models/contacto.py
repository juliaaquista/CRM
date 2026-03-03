from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Contacto(Base):
    __tablename__ = "contactos"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    nombre = Column(String, nullable=False)
    cargo = Column(String)
    email = Column(String)
    telefono = Column(String)

    empresa = relationship("Empresa", back_populates="contactos")