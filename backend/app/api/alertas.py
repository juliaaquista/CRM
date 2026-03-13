from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.empresa import Empresa
from app.models.alerta import Alerta
from app.models.empresa_comercial import EmpresaComercial
from app.models.usuario import Usuario, RolEnum
from app.schemas.alerta import AlertaCreate, AlertaUpdate, AlertaResponse
from app.api.empresas import verificar_acceso_empresa
from app.utils.audit import registrar_cambio

router = APIRouter(prefix="/api/alertas", tags=["Alertas"])


@router.get("/")
def listar_alertas(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    query = db.query(Alerta)
    if current_user.rol == RolEnum.COMERCIAL:
        emp_ids = [r[0] for r in db.query(EmpresaComercial.empresa_id).filter(
            EmpresaComercial.comercial_id == current_user.id).all()]
        query = query.filter(
            (Alerta.empresa_id.in_(emp_ids))
            | (Alerta.empresa_id.is_(None))
            & (Alerta.creado_por_id == current_user.id)
        )
    total = query.count()
    items = query.order_by(Alerta.fecha.desc()).offset(skip).limit(limit).all()
    return {"items": items, "total": total}


@router.get("/calendario", response_model=list[AlertaResponse])
def alertas_calendario(
    desde: date | None = None,
    hasta: date | None = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """Endpoint para calendario. Devuelve alertas en un rango de fechas."""
    query = db.query(Alerta)
    if current_user.rol == RolEnum.COMERCIAL:
        emp_ids = [r[0] for r in db.query(EmpresaComercial.empresa_id).filter(
            EmpresaComercial.comercial_id == current_user.id).all()]
        query = query.filter(
            (Alerta.empresa_id.in_(emp_ids))
            | (Alerta.empresa_id.is_(None))
            & (Alerta.creado_por_id == current_user.id)
        )
    if desde:
        query = query.filter(Alerta.fecha >= desde)
    if hasta:
        query = query.filter(Alerta.fecha <= hasta)
    return query.order_by(Alerta.fecha).all()


@router.get("/{alerta_id}", response_model=AlertaResponse)
def obtener_alerta(
    alerta_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    alerta = db.query(Alerta).filter(Alerta.id == alerta_id).first()
    if not alerta:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    return alerta


@router.post("/", response_model=AlertaResponse, status_code=status.HTTP_201_CREATED)
def crear_alerta(
    data: AlertaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    if data.empresa_id:
        empresa = db.query(Empresa).filter(Empresa.id == data.empresa_id).first()
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        verificar_acceso_empresa(db, empresa, current_user)
    alerta = Alerta(**data.model_dump(), creado_por_id=current_user.id)
    db.add(alerta)
    db.flush()
    registrar_cambio(db, current_user.id, "CREAR", "alerta", alerta.id, f"Alerta: {data.motivo[:50]}")
    db.commit()
    db.refresh(alerta)
    return alerta


@router.put("/{alerta_id}", response_model=AlertaResponse)
def actualizar_alerta(
    alerta_id: int,
    data: AlertaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    alerta = db.query(Alerta).filter(Alerta.id == alerta_id).first()
    if not alerta:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    if alerta.creado_por_id != current_user.id and current_user.rol != RolEnum.JEFE:
        raise HTTPException(status_code=403, detail="Solo puedes editar tus propias alertas")
    cambios = data.model_dump(exclude_unset=True)
    for field, value in cambios.items():
        setattr(alerta, field, value)
    registrar_cambio(db, current_user.id, "EDITAR", "alerta", alerta.id, str(cambios))
    db.commit()
    db.refresh(alerta)
    return alerta


@router.delete("/{alerta_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_alerta(
    alerta_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    alerta = db.query(Alerta).filter(Alerta.id == alerta_id).first()
    if not alerta:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    if alerta.creado_por_id != current_user.id and current_user.rol != RolEnum.JEFE:
        raise HTTPException(status_code=403, detail="Solo puedes eliminar tus propias alertas")
    db.delete(alerta)
    registrar_cambio(db, current_user.id, "ELIMINAR", "alerta", alerta_id, f"Alerta #{alerta_id}")
    db.commit()
