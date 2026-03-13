from pydantic import BaseModel


class ProductoCreate(BaseModel):
    nombre: str
    descripcion: str | None = None
    categoria: str | None = None


class ProductoUpdate(BaseModel):
    nombre: str | None = None
    descripcion: str | None = None
    categoria: str | None = None
    activo: bool | None = None


class ProductoResponse(BaseModel):
    id: int
    nombre: str
    descripcion: str | None
    categoria: str | None
    activo: bool
    ficha_tecnica: str | None = None

    model_config = {"from_attributes": True}
