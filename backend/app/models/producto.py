from sqlalchemy import Column, Integer, String, Float, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    descripcion = Column(String)
    precio_base = Column(Float)
    categoria = Column(String)
    promocion = Column(Boolean, default=False)
    activo = Column(Boolean, default=True)

    empresas = relationship("EmpresaProducto", back_populates="producto")