from sqlalchemy import Column, Integer, String, Boolean, Enum
from app.core.database import Base
import enum

class RolEnum(str, enum.Enum):
    JEFE = "JEFE"
    COMERCIAL = "COMERCIAL"

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    rol = Column(Enum(RolEnum), nullable=False)
    activo = Column(Boolean, default=True)