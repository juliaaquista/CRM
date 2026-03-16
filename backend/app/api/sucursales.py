from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.empresa import Empresa
from app.models.sucursal import Sucursal
from app.models.usuario import Usuario
from app.api.empresas import verificar_acceso_empresa
from app.schemas.sucursal import SucursalCreate, SucursalUpdate, SucursalResponse
from app.utils.geocoding import geocode_ciudad

router = APIRouter(prefix="/api/empresas/{empresa_id}/sucursales", tags=["Sucursales"])
router_global = APIRouter(prefix="/api/sucursales", tags=["Sucursales"])


def _get_empresa_or_404(db: Session, empresa_id: int, user: Usuario, solo_lectura: bool = False) -> Empresa:
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    verificar_acceso_empresa(db, empresa, user, solo_lectura=solo_lectura)
    return empresa


@router.get("/", response_model=list[SucursalResponse])
def listar_sucursales(
    empresa_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    _get_empresa_or_404(db, empresa_id, current_user, solo_lectura=True)
    return db.query(Sucursal).filter(Sucursal.empresa_id == empresa_id).order_by(Sucursal.nombre).all()


@router.post("/", response_model=SucursalResponse, status_code=status.HTTP_201_CREATED)
def crear_sucursal(
    empresa_id: int,
    data: SucursalCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    _get_empresa_or_404(db, empresa_id, current_user)
    sucursal = Sucursal(empresa_id=empresa_id, **data.model_dump())
    lat, lon = geocode_ciudad(sucursal.ciudad, sucursal.provincia)
    sucursal.latitud = lat
    sucursal.longitud = lon
    db.add(sucursal)
    db.commit()
    db.refresh(sucursal)
    return sucursal


@router.put("/{sucursal_id}", response_model=SucursalResponse)
def actualizar_sucursal(
    empresa_id: int,
    sucursal_id: int,
    data: SucursalUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    _get_empresa_or_404(db, empresa_id, current_user)
    sucursal = db.query(Sucursal).filter(
        Sucursal.id == sucursal_id, Sucursal.empresa_id == empresa_id
    ).first()
    if not sucursal:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")
    cambios = data.model_dump(exclude_unset=True)
    ciudad_cambia = "ciudad" in cambios or "provincia" in cambios
    for field, value in cambios.items():
        setattr(sucursal, field, value)
    if ciudad_cambia:
        lat, lon = geocode_ciudad(sucursal.ciudad, sucursal.provincia)
        sucursal.latitud = lat
        sucursal.longitud = lon
    db.commit()
    db.refresh(sucursal)
    return sucursal


@router.delete("/{sucursal_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_sucursal(
    empresa_id: int,
    sucursal_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    _get_empresa_or_404(db, empresa_id, current_user)
    sucursal = db.query(Sucursal).filter(
        Sucursal.id == sucursal_id, Sucursal.empresa_id == empresa_id
    ).first()
    if not sucursal:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")
    db.delete(sucursal)
    db.commit()


@router_global.get("/", response_model=list[SucursalResponse])
def listar_todas_sucursales(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """Lista todas las sucursales accesibles (para el mapa)."""
    from app.models.empresa_comercial import EmpresaComercial
    from app.models.usuario import RolEnum
    query = db.query(Sucursal).join(Empresa)
    if current_user.rol == RolEnum.COMERCIAL:
        emp_ids = [r[0] for r in db.query(EmpresaComercial.empresa_id).filter(
            EmpresaComercial.comercial_id == current_user.id
        ).all()]
        query = query.filter(Sucursal.empresa_id.in_(emp_ids))
    return query.all()
