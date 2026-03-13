from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog


def registrar_cambio(
    db: Session,
    usuario_id: int,
    accion: str,
    entidad: str,
    entidad_id: int,
    detalle: str = "",
):
    """Registra un cambio en el audit log. No hace commit — se comitea con la transacción principal."""
    log = AuditLog(
        usuario_id=usuario_id,
        accion=accion,
        entidad=entidad,
        entidad_id=entidad_id,
        detalle=detalle,
    )
    db.add(log)
