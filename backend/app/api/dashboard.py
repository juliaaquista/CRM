from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.empresa import Empresa
from app.models.oferta import Oferta, EstadoOfertaEnum
from app.models.accion import Accion, EstadoAccionEnum
from app.models.alerta import Alerta
from app.models.empresa_comercial import EmpresaComercial
from app.models.usuario import Usuario, RolEnum

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


def _get_empresa_ids(db: Session, user: Usuario) -> list[int]:
    """IDs de empresas del usuario (todas si JEFE, asignadas si COMERCIAL)."""
    if user.rol == RolEnum.JEFE:
        return [r[0] for r in db.query(Empresa.id).all()]
    rows = db.query(EmpresaComercial.empresa_id).filter(
        EmpresaComercial.comercial_id == user.id
    ).all()
    return [r[0] for r in rows]


@router.get("/mi-resumen")
def mi_resumen(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """Resumen personal del usuario: KPIs, acciones proximas, pipeline."""
    emp_ids = _get_empresa_ids(db, current_user)
    now = datetime.now(timezone.utc)
    hoy_inicio = now.replace(hour=0, minute=0, second=0, microsecond=0)
    hoy_fin = hoy_inicio + timedelta(days=1)

    # --- KPIs ---
    empresas_asignadas = len(emp_ids)

    ofertas_pendientes = db.query(func.count(Oferta.id)).filter(
        Oferta.empresa_id.in_(emp_ids),
        Oferta.estado.in_([
            EstadoOfertaEnum.PREOFERTA,
            EstadoOfertaEnum.OFICINA_TECNICA,
            EstadoOfertaEnum.ENTREGADA,
            EstadoOfertaEnum.VISITAR,
            EstadoOfertaEnum.STANDBY,
        ]),
    ).scalar() or 0

    acciones_pendientes = db.query(func.count(Accion.id)).filter(
        Accion.creado_por_id == current_user.id,
        Accion.estado == EstadoAccionEnum.PENDIENTE,
    ).scalar() or 0

    # Alertas vencidas: fecha pasada + no completada
    alertas_vencidas_query = db.query(func.count(Alerta.id)).filter(
        Alerta.fecha < hoy_inicio.date(),
        Alerta.completada == False,
    )
    if current_user.rol == RolEnum.COMERCIAL:
        alertas_vencidas_query = alertas_vencidas_query.filter(
            (Alerta.empresa_id.in_(emp_ids))
            | (Alerta.creado_por_id == current_user.id)
        )
    alertas_vencidas = alertas_vencidas_query.scalar() or 0

    # Helper: serializar accion con empresa_nombre
    def _accion_dict(a):
        return {
            "id": a.id,
            "tipo": a.tipo.value if a.tipo else None,
            "estado": a.estado.value if a.estado else None,
            "fecha_hora": a.fecha_hora.isoformat() if a.fecha_hora else None,
            "duracion_minutos": a.duracion_minutos,
            "descripcion": a.descripcion,
            "empresa_id": a.empresa_id,
            "empresa_nombre": a.empresa.nombre if a.empresa else None,
            "empresa_razon_social": a.empresa.razon_social if a.empresa else None,
            "es_resumida": a.es_resumida,
            "nombre_cliente_resumida": a.nombre_cliente_resumida,
        }

    # --- Acciones de hoy ---
    acciones_hoy_raw = db.query(Accion).filter(
        Accion.creado_por_id == current_user.id,
        Accion.fecha_hora >= hoy_inicio,
        Accion.fecha_hora < hoy_fin,
    ).order_by(Accion.fecha_hora).all()
    acciones_hoy = [_accion_dict(a) for a in acciones_hoy_raw]

    # --- Proximas acciones (futuras, pendientes) ---
    proximas_raw = db.query(Accion).filter(
        Accion.creado_por_id == current_user.id,
        Accion.fecha_hora >= now,
        Accion.estado == EstadoAccionEnum.PENDIENTE,
    ).order_by(Accion.fecha_hora).limit(8).all()
    proximas_acciones = [_accion_dict(a) for a in proximas_raw]

    # --- Pipeline: ofertas por estado ---
    ofertas_por_estado = {}
    for estado in EstadoOfertaEnum:
        count = db.query(func.count(Oferta.id)).filter(
            Oferta.empresa_id.in_(emp_ids),
            Oferta.estado == estado,
        ).scalar() or 0
        ofertas_por_estado[estado.value] = count

    return {
        "empresas_asignadas": empresas_asignadas,
        "ofertas_pendientes": ofertas_pendientes,
        "acciones_pendientes": acciones_pendientes,
        "alertas_vencidas": alertas_vencidas,
        "acciones_hoy": acciones_hoy,
        "proximas_acciones": proximas_acciones,
        "ofertas_por_estado": ofertas_por_estado,
    }
