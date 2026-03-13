from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.empresa import Empresa
from app.models.contacto import Contacto
from app.models.oferta import Oferta
from app.models.empresa_comercial import EmpresaComercial
from app.models.usuario import Usuario, RolEnum

router = APIRouter(prefix="/api/buscar", tags=["Buscar"])


@router.get("/")
def buscar_global(
    q: str = Query(..., min_length=2),
    limit: int = Query(10, ge=1, le=30),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """Busqueda global en empresas, contactos y ofertas."""
    resultados = []
    pattern = f"%{q}%"

    # IDs de empresas accesibles para COMERCIAL
    empresa_ids_filter = None
    if current_user.rol == RolEnum.COMERCIAL:
        rows = db.query(EmpresaComercial.empresa_id).filter(
            EmpresaComercial.comercial_id == current_user.id
        ).all()
        empresa_ids_filter = [r[0] for r in rows]

    # --- Buscar en Empresas ---
    emp_query = db.query(Empresa).filter(
        or_(
            Empresa.nombre.ilike(pattern),
            Empresa.ciudad.ilike(pattern),
        )
    )
    if empresa_ids_filter is not None:
        emp_query = emp_query.filter(Empresa.id.in_(empresa_ids_filter))

    for e in emp_query.limit(limit).all():
        resultados.append({
            "tipo": "empresa",
            "id": e.id,
            "texto": e.nombre,
            "subtexto": f"{e.ciudad or ''}, {e.provincia or ''}".strip(", "),
            "empresa_id": e.id,
            "empresa_nombre": e.nombre,
        })

    # --- Buscar en Contactos ---
    cont_query = db.query(Contacto).filter(
        or_(
            Contacto.nombre.ilike(pattern),
            Contacto.email.ilike(pattern),
        )
    )
    if empresa_ids_filter is not None:
        cont_query = cont_query.filter(Contacto.empresa_id.in_(empresa_ids_filter))

    for c in cont_query.limit(limit).all():
        emp = db.query(Empresa).filter(Empresa.id == c.empresa_id).first()
        resultados.append({
            "tipo": "contacto",
            "id": c.id,
            "texto": c.nombre,
            "subtexto": f"{c.cargo or ''} - {emp.nombre if emp else ''}".strip(" - "),
            "empresa_id": c.empresa_id,
            "empresa_nombre": emp.nombre if emp else None,
        })

    # --- Buscar en Ofertas ---
    of_query = db.query(Oferta).filter(
        Oferta.notas.ilike(pattern)
    )
    if empresa_ids_filter is not None:
        of_query = of_query.filter(Oferta.empresa_id.in_(empresa_ids_filter))

    for o in of_query.limit(limit).all():
        emp = db.query(Empresa).filter(Empresa.id == o.empresa_id).first()
        resultados.append({
            "tipo": "oferta",
            "id": o.id,
            "texto": (o.notas or "")[:80],
            "subtexto": emp.nombre if emp else "",
            "empresa_id": o.empresa_id,
            "empresa_nombre": emp.nombre if emp else None,
        })

    # Limitar resultado total
    return resultados[:limit]
