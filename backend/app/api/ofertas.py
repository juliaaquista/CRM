from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.empresa import Empresa
from app.models.oferta import Oferta
from app.models.oferta_producto import OfertaProducto
from app.models.producto import Producto
from app.models.empresa_comercial import EmpresaComercial
from app.models.usuario import Usuario, RolEnum
from app.schemas.oferta import OfertaCreate, OfertaUpdate, OfertaResponse
from app.api.empresas import verificar_acceso_empresa
from app.utils.audit import registrar_cambio

router = APIRouter(prefix="/api/ofertas", tags=["Ofertas"])


def generar_numero_oferta(db: Session, fecha: datetime | None = None) -> str:
    """Genera número de oferta con formato YYMMXXX.
    XXX es correlativo creciente a lo largo del año (se reinicia cada año).
    Si se pasa fecha, usa esa fecha para el prefijo (para ofertas del pasado).
    """
    ref = fecha or datetime.now()
    year_prefix = ref.strftime("%y")    # ej: "26"
    month_prefix = ref.strftime("%y%m")  # ej: "2603"

    # Buscar el último número del año (buscar por YY%)
    ultimo = db.query(Oferta.numero).filter(
        Oferta.numero.like(f"{year_prefix}%")
    ).order_by(Oferta.numero.desc()).first()

    if ultimo and ultimo[0]:
        try:
            last_seq = int(ultimo[0][4:])  # después de los 4 dígitos YYMM
            new_seq = last_seq + 1
        except (ValueError, IndexError):
            new_seq = 1
    else:
        new_seq = 1

    return f"{month_prefix}{new_seq:03d}"


@router.get("/")
def listar_ofertas(
    empresa_id: int | None = None,
    q: str | None = Query(None, description="Buscar por empresa o notas"),
    estado: str | None = Query(None, description="Filtrar por estado"),
    sort_by: str | None = Query(None, description="Campo a ordenar: numero, creado_en, producto"),
    sort_order: str | None = Query("desc", description="Orden: asc | desc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    query = db.query(Oferta).join(Empresa, Oferta.empresa_id == Empresa.id)
    if empresa_id:
        empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        verificar_acceso_empresa(db, empresa, current_user, solo_lectura=True)
        query = query.filter(Oferta.empresa_id == empresa_id)
    elif current_user.rol == RolEnum.COMERCIAL:
        emp_ids = [r[0] for r in db.query(EmpresaComercial.empresa_id).filter(
            EmpresaComercial.comercial_id == current_user.id).all()]
        query = query.filter(Oferta.empresa_id.in_(emp_ids))
    if q:
        pattern = f"%{q}%"
        query = query.filter(
            Empresa.nombre.ilike(pattern)
            | Oferta.notas.ilike(pattern)
        )
    if estado:
        query = query.filter(Oferta.estado == estado)
    total = query.count()

    # Ordenamiento
    desc_order = (sort_order or "desc").lower() != "asc"
    if sort_by == "numero":
        order_col = Oferta.numero.desc() if desc_order else Oferta.numero.asc()
        query = query.order_by(order_col)
    elif sort_by == "producto":
        # Subquery: primer producto (alfabéticamente) de cada oferta
        primer_prod_subq = (
            db.query(
                OfertaProducto.oferta_id.label("oferta_id"),
                sa_func.min(Producto.nombre).label("primer_producto"),
            )
            .join(Producto, OfertaProducto.producto_id == Producto.id)
            .group_by(OfertaProducto.oferta_id)
            .subquery()
        )
        query = query.outerjoin(primer_prod_subq, Oferta.id == primer_prod_subq.c.oferta_id)
        order_col = (
            primer_prod_subq.c.primer_producto.desc()
            if desc_order
            else primer_prod_subq.c.primer_producto.asc()
        )
        query = query.order_by(order_col, Oferta.creado_en.desc())
    else:
        # Por defecto: creado_en
        order_col = Oferta.creado_en.desc() if desc_order else Oferta.creado_en.asc()
        query = query.order_by(order_col)

    items = query.offset(skip).limit(limit).all()
    return {"items": items, "total": total}


@router.get("/kanban")
def listar_ofertas_kanban(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """Returns all ofertas enriched with empresa_nombre and productos for Kanban view."""
    query = db.query(Oferta).join(Empresa, Oferta.empresa_id == Empresa.id)

    if current_user.rol == RolEnum.COMERCIAL:
        emp_ids = [r[0] for r in db.query(EmpresaComercial.empresa_id).filter(
            EmpresaComercial.comercial_id == current_user.id).all()]
        query = query.filter(Oferta.empresa_id.in_(emp_ids))

    ofertas = query.all()

    items = []
    for oferta in ofertas:
        prods = db.query(OfertaProducto, Producto.nombre).join(
            Producto, OfertaProducto.producto_id == Producto.id
        ).filter(OfertaProducto.oferta_id == oferta.id).all()

        productos_list = [
            {"nombre": nombre, "cantidad": op.cantidad, "precio_unitario": op.precio_unitario}
            for op, nombre in prods
        ]

        items.append({
            "id": oferta.id,
            "numero": oferta.numero,
            "empresa_id": oferta.empresa_id,
            "empresa_nombre": oferta.empresa.nombre,
            "empresa_razon_social": oferta.empresa.razon_social,
            "estado": oferta.estado.value if oferta.estado else None,
            "precio_negociado": oferta.precio_negociado,
            "notas": oferta.notas,
            "creado_en": oferta.creado_en.isoformat() if oferta.creado_en else None,
            "productos": productos_list,
        })

    return {"items": items}


@router.get("/{oferta_id}", response_model=OfertaResponse)
def obtener_oferta(
    oferta_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    oferta = db.query(Oferta).filter(Oferta.id == oferta_id).first()
    if not oferta:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    empresa = db.query(Empresa).filter(Empresa.id == oferta.empresa_id).first()
    verificar_acceso_empresa(db, empresa, current_user, solo_lectura=True)
    return oferta


@router.post("/", response_model=OfertaResponse, status_code=status.HTTP_201_CREATED)
def crear_oferta(
    data: OfertaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    empresa = db.query(Empresa).filter(Empresa.id == data.empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    verificar_acceso_empresa(db, empresa, current_user)

    numero = generar_numero_oferta(db, data.fecha_oferta)
    oferta = Oferta(
        numero=numero,
        empresa_id=data.empresa_id,
        precio_negociado=data.precio_negociado,
        notas=data.notas,
        modo_pago=data.modo_pago,
        hitos_pago=data.hitos_pago,
        especificaciones_pago=data.especificaciones_pago,
        creado_por_id=current_user.id,
    )
    if data.estado:
        oferta.estado = data.estado
    # Si se especifica fecha de oferta, usarla como fecha de creación
    if data.fecha_oferta:
        oferta.creado_en = data.fecha_oferta
    db.add(oferta)
    db.flush()

    for p in data.productos:
        producto = db.query(Producto).filter(Producto.id == p.producto_id).first()
        if not producto:
            raise HTTPException(status_code=404, detail=f"Producto {p.producto_id} no encontrado")
        op = OfertaProducto(
            oferta_id=oferta.id,
            producto_id=p.producto_id,
            cantidad=p.cantidad,
            precio_unitario=p.precio_unitario,
        )
        db.add(op)

    registrar_cambio(db, current_user.id, "CREAR", "oferta", oferta.id, f"Oferta para empresa {data.empresa_id}")
    db.commit()
    db.refresh(oferta)
    return oferta


@router.put("/{oferta_id}", response_model=OfertaResponse)
def actualizar_oferta(
    oferta_id: int,
    data: OfertaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    oferta = db.query(Oferta).filter(Oferta.id == oferta_id).first()
    if not oferta:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    empresa = db.query(Empresa).filter(Empresa.id == oferta.empresa_id).first()
    verificar_acceso_empresa(db, empresa, current_user)

    cambios = data.model_dump(exclude_unset=True)
    productos_data = cambios.pop("productos", None)
    for field, value in cambios.items():
        setattr(oferta, field, value)

    if productos_data is not None:
        db.query(OfertaProducto).filter(OfertaProducto.oferta_id == oferta_id).delete()
        for p in productos_data:
            op = OfertaProducto(
                oferta_id=oferta_id,
                producto_id=p["producto_id"],
                cantidad=p.get("cantidad", 1),
                precio_unitario=p.get("precio_unitario"),
            )
            db.add(op)

    registrar_cambio(db, current_user.id, "EDITAR", "oferta", oferta.id, str(cambios))
    db.commit()
    db.refresh(oferta)
    return oferta


@router.delete("/{oferta_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_oferta(
    oferta_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    oferta = db.query(Oferta).filter(Oferta.id == oferta_id).first()
    if not oferta:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    empresa = db.query(Empresa).filter(Empresa.id == oferta.empresa_id).first()
    verificar_acceso_empresa(db, empresa, current_user)
    db.delete(oferta)
    registrar_cambio(db, current_user.id, "ELIMINAR", "oferta", oferta_id, f"Oferta #{oferta_id}")
    db.commit()
