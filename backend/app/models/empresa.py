from sqlalchemy import Column, Integer, String, Float, Enum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class OrigenEmpresaEnum(str, enum.Enum):
    WEB = "WEB"
    FERIAS = "FERIAS"
    RRSS = "RRSS"
    ABISYSA = "ABISYSA"
    REFERIDO = "REFERIDO"
    PROSPECCION = "PROSPECCION"
    OTRO = "OTRO"


class Empresa(Base):
    __tablename__ = "empresas"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    direccion = Column(String, nullable=True)
    ciudad = Column(String)
    provincia = Column(String)
    razon_social = Column(String, nullable=True)
    notas_comerciales = Column(String)
    origen = Column(Enum(OrigenEmpresaEnum), nullable=False)
    origen_detalle = Column(String, nullable=True)
    latitud = Column(Float, nullable=True)
    longitud = Column(Float, nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    contactos = relationship("Contacto", back_populates="empresa", cascade="all, delete-orphan")
    ofertas = relationship("Oferta", back_populates="empresa", cascade="all, delete-orphan")
    acciones = relationship("Accion", back_populates="empresa", cascade="all, delete-orphan")
    comerciales = relationship("EmpresaComercial", back_populates="empresa", cascade="all, delete-orphan")
    archivos = relationship("EmpresaArchivo", back_populates="empresa", cascade="all, delete-orphan")
    sucursales = relationship("Sucursal", back_populates="empresa", cascade="all, delete-orphan")
