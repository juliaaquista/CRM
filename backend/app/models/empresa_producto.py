from sqlalchemy import Column, Integer, String, Float, Date, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

class EstadoProductoEnum(str, enum.Enum):
    INTERESADO = "INTERESADO"
    VENDIDO = "VENDIDO"
    DESCARTADO = "DESCARTADO"

class EmpresaProducto(Base):
    __tablename__ = "empresa_producto"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    estado = Column(Enum(EstadoProductoEnum), default=EstadoProductoEnum.INTERESADO)
    notas = Column(String)
    fecha_venta = Column(Date, nullable=True)
    vendedor_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    empresa = relationship("Empresa", back_populates="productos")
    producto = relationship("Producto", back_populates="empresas")