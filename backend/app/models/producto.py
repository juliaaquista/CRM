from sqlalchemy import Column, Integer, String, Boolean
from app.core.database import Base


class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    descripcion = Column(String)
    categoria = Column(String)
    activo = Column(Boolean, default=True)
    ficha_tecnica = Column(String, nullable=True)  # PDF filename
