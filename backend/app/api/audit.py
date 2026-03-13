from datetime import datetime

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.audit_log import AuditLog
from app.models.usuario import Usuario, RolEnum

router = APIRouter(prefix="/api/audit", tags=["Audit"])


@router.get("/")
def listar_audit(
    entidad: str | None = Query(None),
    entidad_id: int | None = Query(None),
    usuario_id: int | None = Query(None),
    desde: datetime | None = Query(None),
    hasta: datetime | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """Lista audit logs. Solo JEFE puede acceder."""
    if current_user.rol != RolEnum.JEFE:
        raise HTTPException(status_code=403, detail="Solo JEFE puede ver el historial")

    query = db.query(AuditLog)

    if entidad:
        query = query.filter(AuditLog.entidad == entidad)
    if entidad_id is not None:
        query = query.filter(AuditLog.entidad_id == entidad_id)
    if usuario_id is not None:
        query = query.filter(AuditLog.usuario_id == usuario_id)
    if desde:
        query = query.filter(AuditLog.creado_en >= desde)
    if hasta:
        query = query.filter(AuditLog.creado_en <= hasta)

    total = query.count()
    items = query.order_by(desc(AuditLog.creado_en)).offset(skip).limit(limit).all()

    # Serializar con nombre de usuario
    result = []
    for log in items:
        result.append({
            "id": log.id,
            "usuario_id": log.usuario_id,
            "usuario_nombre": log.usuario.nombre if log.usuario else None,
            "accion": log.accion,
            "entidad": log.entidad,
            "entidad_id": log.entidad_id,
            "detalle": log.detalle,
            "creado_en": log.creado_en.isoformat() if log.creado_en else None,
        })

    return {"items": result, "total": total}
