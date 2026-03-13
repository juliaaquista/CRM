from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import distinct

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.producto import Producto
from app.models.usuario import Usuario, RolEnum
from app.schemas.producto import ProductoCreate, ProductoUpdate, ProductoResponse
from app.utils.audit import registrar_cambio

router = APIRouter(prefix="/api/productos", tags=["Productos"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "fichas_tecnicas"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.get("/")
def listar_productos(
    categoria: str | None = None,
    activo: bool | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    query = db.query(Producto)

    if categoria:
        query = query.filter(Producto.categoria == categoria)
    if activo is not None:
        query = query.filter(Producto.activo == activo)

    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return {"items": items, "total": total}


@router.get("/categorias")
def listar_categorias(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """Devuelve lista de categorías únicas existentes, ordenadas alfabéticamente."""
    rows = db.query(distinct(Producto.categoria)).filter(
        Producto.categoria.isnot(None),
        Producto.categoria != '',
    ).order_by(Producto.categoria).all()
    return [r[0] for r in rows]


# --- Ficha Tecnica PDF endpoints ---

@router.post("/{producto_id}/ficha-tecnica")
def subir_ficha_tecnica(
    producto_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    if current_user.rol != RolEnum.JEFE:
        raise HTTPException(status_code=403, detail="Solo el jefe puede subir fichas tecnicas")

    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")

    contents = file.file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="El archivo supera el limite de 10MB")

    # Delete old file if exists
    if producto.ficha_tecnica:
        old_path = UPLOAD_DIR / f"{producto_id}_{producto.ficha_tecnica}"
        if old_path.exists():
            old_path.unlink()

    safe_filename = file.filename.replace(" ", "_")
    disk_filename = f"{producto_id}_{safe_filename}"
    file_path = UPLOAD_DIR / disk_filename
    with open(file_path, "wb") as f:
        f.write(contents)

    producto.ficha_tecnica = safe_filename
    registrar_cambio(db, current_user.id, "EDITAR", "producto", producto.id,
                     f"Ficha tecnica subida: {safe_filename}")
    db.commit()
    db.refresh(producto)
    return {"filename": safe_filename, "message": "Ficha tecnica subida correctamente"}


@router.get("/{producto_id}/ficha-tecnica")
def descargar_ficha_tecnica(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if not producto.ficha_tecnica:
        raise HTTPException(status_code=404, detail="Este producto no tiene ficha tecnica")

    file_path = UPLOAD_DIR / f"{producto_id}_{producto.ficha_tecnica}"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado en el servidor")

    return FileResponse(
        path=str(file_path),
        filename=producto.ficha_tecnica,
        media_type="application/pdf",
    )


@router.delete("/{producto_id}/ficha-tecnica", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_ficha_tecnica(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    if current_user.rol != RolEnum.JEFE:
        raise HTTPException(status_code=403, detail="Solo el jefe puede eliminar fichas tecnicas")

    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if not producto.ficha_tecnica:
        raise HTTPException(status_code=404, detail="Este producto no tiene ficha tecnica")

    file_path = UPLOAD_DIR / f"{producto_id}_{producto.ficha_tecnica}"
    if file_path.exists():
        file_path.unlink()

    old_name = producto.ficha_tecnica
    producto.ficha_tecnica = None
    registrar_cambio(db, current_user.id, "EDITAR", "producto", producto.id,
                     f"Ficha tecnica eliminada: {old_name}")
    db.commit()


# --- CRUD endpoints ---

@router.get("/{producto_id}", response_model=ProductoResponse)
def obtener_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto


@router.post("/", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
def crear_producto(
    data: ProductoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    # Solo JEFE puede crear productos
    if current_user.rol != RolEnum.JEFE:
        raise HTTPException(status_code=403, detail="Solo el jefe puede crear productos")

    producto = Producto(**data.model_dump())
    db.add(producto)
    db.flush()
    registrar_cambio(db, current_user.id, "CREAR", "producto", producto.id, f"Producto: {producto.nombre}")
    db.commit()
    db.refresh(producto)
    return producto


@router.put("/{producto_id}", response_model=ProductoResponse)
def actualizar_producto(
    producto_id: int,
    data: ProductoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    if current_user.rol != RolEnum.JEFE:
        raise HTTPException(status_code=403, detail="Solo el jefe puede actualizar productos")

    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    cambios = data.model_dump(exclude_unset=True)
    for field, value in cambios.items():
        setattr(producto, field, value)

    registrar_cambio(db, current_user.id, "EDITAR", "producto", producto.id, str(cambios))
    db.commit()
    db.refresh(producto)
    return producto


@router.delete("/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    if current_user.rol != RolEnum.JEFE:
        raise HTTPException(status_code=403, detail="Solo el jefe puede eliminar productos")

    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Clean up ficha tecnica file
    if producto.ficha_tecnica:
        ft_path = UPLOAD_DIR / f"{producto_id}_{producto.ficha_tecnica}"
        if ft_path.exists():
            ft_path.unlink()

    nombre = producto.nombre
    db.delete(producto)
    registrar_cambio(db, current_user.id, "ELIMINAR", "producto", producto_id, f"Producto: {nombre}")
    db.commit()
