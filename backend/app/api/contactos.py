from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.contacto import Contacto
from app.models.empresa import Empresa
from app.models.empresa_comercial import EmpresaComercial
from app.models.usuario import Usuario, RolEnum
from app.schemas.contacto import ContactoCreate, ContactoUpdate, ContactoResponse
from app.api.empresas import verificar_acceso_empresa
from app.utils.audit import registrar_cambio

router = APIRouter(prefix="/api/contactos", tags=["Contactos"])


def _get_empresa(db: Session, empresa_id: int, user: Usuario) -> Empresa:
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    verificar_acceso_empresa(db, empresa, user)
    return empresa


@router.get("/")
def listar_contactos(
    empresa_id: int | None = None,
    q: str | None = Query(None, description="Buscar por nombre, email o cargo"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    query = db.query(Contacto)
    if empresa_id:
        _get_empresa(db, empresa_id, current_user)
        query = query.filter(Contacto.empresa_id == empresa_id)
    elif current_user.rol == RolEnum.COMERCIAL:
        ids = [r[0] for r in db.query(EmpresaComercial.empresa_id).filter(
            EmpresaComercial.comercial_id == current_user.id).all()]
        query = query.filter(Contacto.empresa_id.in_(ids))
    if q:
        pattern = f"%{q}%"
        query = query.filter(
            Contacto.nombre.ilike(pattern)
            | Contacto.email.ilike(pattern)
            | Contacto.cargo.ilike(pattern)
        )
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return {"items": items, "total": total}


@router.get("/{contacto_id}", response_model=ContactoResponse)
def obtener_contacto(
    contacto_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    contacto = db.query(Contacto).filter(Contacto.id == contacto_id).first()
    if not contacto:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    _get_empresa(db, contacto.empresa_id, current_user)
    return contacto


@router.post("/", response_model=ContactoResponse, status_code=status.HTTP_201_CREATED)
def crear_contacto(
    data: ContactoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    _get_empresa(db, data.empresa_id, current_user)
    contacto = Contacto(**data.model_dump())
    db.add(contacto)
    db.flush()
    registrar_cambio(db, current_user.id, "CREAR", "contacto", contacto.id, f"Contacto: {contacto.nombre}")
    db.commit()
    db.refresh(contacto)
    return contacto


@router.put("/{contacto_id}", response_model=ContactoResponse)
def actualizar_contacto(
    contacto_id: int,
    data: ContactoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    contacto = db.query(Contacto).filter(Contacto.id == contacto_id).first()
    if not contacto:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    _get_empresa(db, contacto.empresa_id, current_user)
    cambios = data.model_dump(exclude_unset=True)
    for field, value in cambios.items():
        setattr(contacto, field, value)
    registrar_cambio(db, current_user.id, "EDITAR", "contacto", contacto.id, str(cambios))
    db.commit()
    db.refresh(contacto)
    return contacto


@router.delete("/{contacto_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_contacto(
    contacto_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    contacto = db.query(Contacto).filter(Contacto.id == contacto_id).first()
    if not contacto:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    _get_empresa(db, contacto.empresa_id, current_user)
    nombre = contacto.nombre
    db.delete(contacto)
    registrar_cambio(db, current_user.id, "ELIMINAR", "contacto", contacto_id, f"Contacto: {nombre}")
    db.commit()
