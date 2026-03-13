from sqlalchemy import Column, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class OfertaProducto(Base):
    __tablename__ = "oferta_productos"

    id = Column(Integer, primary_key=True, index=True)
    oferta_id = Column(Integer, ForeignKey("ofertas.id", ondelete="CASCADE"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id", ondelete="CASCADE"), nullable=False)
    cantidad = Column(Integer, default=1)
    precio_unitario = Column(Float, nullable=True)

    producto = relationship("Producto", lazy="joined")

    @property
    def producto_nombre(self) -> str | None:
        return self.producto.nombre if self.producto else None
