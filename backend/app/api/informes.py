from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.usuario import Usuario, RolEnum
from app.models.empresa import Empresa
from app.models.empresa_comercial import EmpresaComercial
from app.models.contacto import Contacto
from app.models.oferta import Oferta, EstadoOfertaEnum
from app.models.oferta_producto import OfertaProducto
from app.models.accion import Accion, EstadoAccionEnum

router = APIRouter(prefix="/api/informes", tags=["informes"])


def require_jefe(user: Usuario):
    if user.rol != RolEnum.JEFE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el JEFE puede ver informes",
        )


@router.get("/resumen")
def get_resumen(
    desde: Optional[datetime] = Query(None),
    hasta: Optional[datetime] = Query(None),
    comercial_id: Optional[int] = Query(None),
    empresa_id: Optional[int] = Query(None),
    producto_id: Optional[int] = Query(None),
    estado_oferta: Optional[str] = Query(None),
    origen: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    require_jefe(current_user)

    def fdate(q, col):
        if desde:
            q = q.filter(col >= desde)
        if hasta:
            q = q.filter(col <= hasta)
        return q

    def fuser(q, col):
        if comercial_id:
            q = q.filter(col == comercial_id)
        return q

    def fempresa_direct(q, col):
        if empresa_id:
            q = q.filter(col == empresa_id)
        return q

    def forigen(q):
        if origen:
            q = q.filter(Empresa.origen == origen)
        return q

    # Totales
    q_emp = db.query(func.count(Empresa.id))
    q_emp = fdate(q_emp, Empresa.creado_en)
    q_emp = forigen(q_emp)
    if comercial_id:
        q_emp = q_emp.join(EmpresaComercial).filter(EmpresaComercial.comercial_id == comercial_id)
    if empresa_id:
        q_emp = q_emp.filter(Empresa.id == empresa_id)
    total_empresas = q_emp.scalar()

    q_cont = db.query(func.count(Contacto.id))
    if empresa_id:
        q_cont = q_cont.filter(Contacto.empresa_id == empresa_id)
    if comercial_id:
        q_cont = q_cont.join(Empresa).join(EmpresaComercial).filter(EmpresaComercial.comercial_id == comercial_id)
    total_contactos = q_cont.scalar()

    q_of = db.query(func.count(Oferta.id))
    q_of = fdate(q_of, Oferta.creado_en)
    q_of = fuser(q_of, Oferta.creado_por_id)
    q_of = fempresa_direct(q_of, Oferta.empresa_id)
    if producto_id:
        q_of = q_of.join(OfertaProducto).filter(OfertaProducto.producto_id == producto_id)
    if estado_oferta:
        q_of = q_of.filter(Oferta.estado == estado_oferta)
    total_ofertas = q_of.scalar()

    q_acc = db.query(func.count(Accion.id))
    q_acc = fdate(q_acc, Accion.fecha_hora)
    q_acc = fuser(q_acc, Accion.creado_por_id)
    q_acc = fempresa_direct(q_acc, Accion.empresa_id)
    total_acciones = q_acc.scalar()

    # Pipeline ofertas por estado
    q_oe = db.query(Oferta.estado, func.count(Oferta.id), func.coalesce(func.sum(Oferta.precio_negociado), 0))
    q_oe = fdate(q_oe, Oferta.creado_en)
    q_oe = fuser(q_oe, Oferta.creado_por_id)
    q_oe = fempresa_direct(q_oe, Oferta.empresa_id)
    if producto_id:
        q_oe = q_oe.join(OfertaProducto).filter(OfertaProducto.producto_id == producto_id)
    if estado_oferta:
        q_oe = q_oe.filter(Oferta.estado == estado_oferta)
    ofertas_estado = {
        e.value: {"cantidad": c, "valor": round(float(v), 2)}
        for e, c, v in q_oe.group_by(Oferta.estado).all()
    }

    # Empresas por origen
    q_orig = db.query(Empresa.origen, func.count(Empresa.id))
    q_orig = fdate(q_orig, Empresa.creado_en)
    q_orig = forigen(q_orig)
    if comercial_id:
        q_orig = q_orig.join(EmpresaComercial).filter(EmpresaComercial.comercial_id == comercial_id)
    if empresa_id:
        q_orig = q_orig.filter(Empresa.id == empresa_id)
    origenes = {o.value: c for o, c in q_orig.group_by(Empresa.origen).all()}

    # Acciones por tipo
    q_at = db.query(Accion.tipo, func.count(Accion.id))
    q_at = fdate(q_at, Accion.fecha_hora)
    q_at = fuser(q_at, Accion.creado_por_id)
    q_at = fempresa_direct(q_at, Accion.empresa_id)
    tipos_accion = {t.value: c for t, c in q_at.group_by(Accion.tipo).all()}

    # Acciones por estado
    q_ae = db.query(Accion.estado, func.count(Accion.id))
    q_ae = fdate(q_ae, Accion.fecha_hora)
    q_ae = fuser(q_ae, Accion.creado_por_id)
    q_ae = fempresa_direct(q_ae, Accion.empresa_id)
    estados_accion = {e.value: c for e, c in q_ae.group_by(Accion.estado).all()}

    # Rendimiento por comercial
    if comercial_id:
        comerciales = db.query(Usuario).filter(Usuario.id == comercial_id, Usuario.activo == True).all()
    else:
        comerciales = db.query(Usuario).filter(Usuario.activo == True).all()

    rendimiento = []
    for com in comerciales:
        n_empresas = db.query(func.count(EmpresaComercial.id)).filter(EmpresaComercial.comercial_id == com.id).scalar()

        q_a = db.query(func.count(Accion.id)).filter(Accion.creado_por_id == com.id)
        q_a = fdate(q_a, Accion.fecha_hora)
        q_a = fempresa_direct(q_a, Accion.empresa_id)
        n_acciones = q_a.scalar()

        q_af = db.query(func.count(Accion.id)).filter(Accion.creado_por_id == com.id, Accion.estado == EstadoAccionEnum.FINALIZADA)
        q_af = fdate(q_af, Accion.fecha_hora)
        q_af = fempresa_direct(q_af, Accion.empresa_id)
        n_acciones_fin = q_af.scalar()

        q_o = db.query(func.count(Oferta.id)).filter(Oferta.creado_por_id == com.id)
        q_o = fdate(q_o, Oferta.creado_en)
        q_o = fempresa_direct(q_o, Oferta.empresa_id)
        if producto_id:
            q_o = q_o.join(OfertaProducto).filter(OfertaProducto.producto_id == producto_id)
        if estado_oferta:
            q_o = q_o.filter(Oferta.estado == estado_oferta)
        n_ofertas = q_o.scalar()

        q_og = db.query(func.count(Oferta.id)).filter(Oferta.creado_por_id == com.id, Oferta.estado == EstadoOfertaEnum.ENTREGADA)
        q_og = fdate(q_og, Oferta.creado_en)
        q_og = fempresa_direct(q_og, Oferta.empresa_id)
        n_ofertas_gan = q_og.scalar()

        q_v = db.query(func.coalesce(func.sum(Oferta.precio_negociado), 0)).filter(Oferta.creado_por_id == com.id, Oferta.estado == EstadoOfertaEnum.ENTREGADA)
        q_v = fdate(q_v, Oferta.creado_en)
        q_v = fempresa_direct(q_v, Oferta.empresa_id)
        valor_ganado = q_v.scalar()

        rendimiento.append({
            "id": com.id,
            "nombre": com.nombre,
            "rol": com.rol.value,
            "empresas": n_empresas,
            "acciones": n_acciones,
            "acciones_finalizadas": n_acciones_fin,
            "ofertas": n_ofertas,
            "ofertas_ganadas": n_ofertas_gan,
            "valor_ganado": round(float(valor_ganado), 2),
        })

    return {
        "filtros_aplicados": {
            "desde": desde.isoformat() if desde else None,
            "hasta": hasta.isoformat() if hasta else None,
            "comercial_id": comercial_id,
            "empresa_id": empresa_id,
            "producto_id": producto_id,
            "estado_oferta": estado_oferta,
            "origen": origen,
        },
        "totales": {
            "empresas": total_empresas,
            "contactos": total_contactos,
            "ofertas": total_ofertas,
            "acciones": total_acciones,
        },
        "ofertas_por_estado": ofertas_estado,
        "empresas_por_origen": origenes,
        "acciones_por_tipo": tipos_accion,
        "acciones_por_estado": estados_accion,
        "rendimiento_comerciales": rendimiento,
    }
