from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.empresa import Empresa
from app.models.accion import Accion
from app.models.contacto import Contacto
from app.models.empresa_comercial import EmpresaComercial
from app.models.usuario import Usuario, RolEnum
from app.schemas.accion import AccionCreate, AccionUpdate, AccionResponse
from app.api.empresas import verificar_acceso_empresa
from app.utils.audit import registrar_cambio

router = APIRouter(prefix="/api/acciones", tags=["Acciones"])


@router.get("/")
def listar_acciones(
    empresa_id: int | None = None,
    contacto_id: int | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    query = db.query(Accion)
    if empresa_id:
        empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        verificar_acceso_empresa(db, empresa, current_user, solo_lectura=True)
        query = query.filter(Accion.empresa_id == empresa_id)
    elif contacto_id:
        query = query.filter(Accion.contacto_id == contacto_id)
    elif current_user.rol == RolEnum.COMERCIAL:
        emp_ids = [r[0] for r in db.query(EmpresaComercial.empresa_id).filter(
            EmpresaComercial.comercial_id == current_user.id).all()]
        query = query.filter(
            (Accion.empresa_id.in_(emp_ids)) | (Accion.creado_por_id == current_user.id)
        )
    total = query.count()
    items = query.order_by(Accion.fecha_hora.desc()).offset(skip).limit(limit).all()
    return {"items": items, "total": total}


@router.get("/calendario")
def acciones_calendario(
    desde: datetime | None = None,
    hasta: datetime | None = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """Endpoint optimizado para el calendario. Devuelve acciones en un rango de fechas."""
    query = db.query(Accion).options(joinedload(Accion.empresa), joinedload(Accion.participantes))
    if current_user.rol == RolEnum.COMERCIAL:
        emp_ids = [r[0] for r in db.query(EmpresaComercial.empresa_id).filter(
            EmpresaComercial.comercial_id == current_user.id).all()]
        query = query.filter(
            (Accion.empresa_id.in_(emp_ids)) | (Accion.creado_por_id == current_user.id)
        )
    if desde:
        query = query.filter(Accion.fecha_hora >= desde)
    if hasta:
        query = query.filter(Accion.fecha_hora <= hasta)
    acciones = query.order_by(Accion.fecha_hora).all()
    return [AccionResponse.model_validate(a) for a in acciones]


@router.get("/{accion_id}", response_model=AccionResponse)
def obtener_accion(
    accion_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    accion = db.query(Accion).filter(Accion.id == accion_id).first()
    if not accion:
        raise HTTPException(status_code=404, detail="Accion no encontrada")
    if accion.empresa_id:
        empresa = db.query(Empresa).filter(Empresa.id == accion.empresa_id).first()
        verificar_acceso_empresa(db, empresa, current_user, solo_lectura=True)
    elif accion.creado_por_id != current_user.id and current_user.rol != RolEnum.JEFE:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta accion")
    return accion


@router.post("/", response_model=AccionResponse, status_code=status.HTTP_201_CREATED)
def crear_accion(
    data: AccionCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    if data.empresa_id:
        empresa = db.query(Empresa).filter(Empresa.id == data.empresa_id).first()
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        verificar_acceso_empresa(db, empresa, current_user)
    participante_ids = data.participante_ids or []
    accion_data = data.model_dump(exclude={"participante_ids"})
    accion = Accion(**accion_data, creado_por_id=current_user.id)
    db.add(accion)
    db.flush()
    if participante_ids:
        contactos = db.query(Contacto).filter(Contacto.id.in_(participante_ids)).all()
        accion.participantes = contactos
    registrar_cambio(db, current_user.id, "CREAR", "accion", accion.id, f"Accion {data.tipo}")
    db.commit()
    db.refresh(accion)
    return accion


@router.put("/{accion_id}", response_model=AccionResponse)
def actualizar_accion(
    accion_id: int,
    data: AccionUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    accion = db.query(Accion).filter(Accion.id == accion_id).first()
    if not accion:
        raise HTTPException(status_code=404, detail="Accion no encontrada")
    # Solo el creador o JEFE puede editar
    if accion.creado_por_id != current_user.id and current_user.rol != RolEnum.JEFE:
        raise HTTPException(status_code=403, detail="Solo puedes editar tus propias acciones")
    cambios = data.model_dump(exclude_unset=True)
    participante_ids = cambios.pop("participante_ids", None)
    if participante_ids is not None:
        contactos = db.query(Contacto).filter(Contacto.id.in_(participante_ids)).all()
        accion.participantes = contactos
    for field, value in cambios.items():
        setattr(accion, field, value)
    registrar_cambio(db, current_user.id, "EDITAR", "accion", accion.id, str(cambios))
    db.commit()
    db.refresh(accion)
    return accion


@router.delete("/{accion_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_accion(
    accion_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    accion = db.query(Accion).filter(Accion.id == accion_id).first()
    if not accion:
        raise HTTPException(status_code=404, detail="Accion no encontrada")
    if accion.creado_por_id != current_user.id and current_user.rol != RolEnum.JEFE:
        raise HTTPException(status_code=403, detail="Solo puedes eliminar tus propias acciones")
    db.delete(accion)
    registrar_cambio(db, current_user.id, "ELIMINAR", "accion", accion_id, f"Accion #{accion_id}")
    db.commit()
