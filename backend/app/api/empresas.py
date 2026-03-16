from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.empresa import Empresa
from app.models.empresa_comercial import EmpresaComercial
from app.models.empresa_archivo import EmpresaArchivo
from app.models.usuario import Usuario, RolEnum
from app.schemas.empresa import EmpresaCreate, EmpresaUpdate, EmpresaResponse
from app.schemas.empresa_comercial import EmpresaComercialCreate, EmpresaComercialResponse, CompartirClienteRequest
from app.utils.audit import registrar_cambio
from app.utils.geocoding import geocode_ciudad

router = APIRouter(prefix="/api/empresas", tags=["Empresas"])

ARCHIVOS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "empresa_archivos"
ARCHIVOS_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB


def _get_empresa_ids_comercial(db: Session, user_id: int) -> list[int]:
    """IDs de empresas asignadas a un comercial (limpia expirados primero)."""
    from datetime import datetime, timezone
    ahora = datetime.now(timezone.utc)

    # Limpiar compartidos expirados
    expirados = db.query(EmpresaComercial).filter(
        EmpresaComercial.tipo == "COMPARTIDO",
        EmpresaComercial.fecha_fin.isnot(None),
        EmpresaComercial.fecha_fin < ahora,
    ).all()
    for ec in expirados:
        db.delete(ec)
    if expirados:
        db.commit()

    rows = db.query(EmpresaComercial.empresa_id).filter(
        EmpresaComercial.comercial_id == user_id
    ).all()
    return [r[0] for r in rows]


def verificar_acceso_empresa(db: Session, empresa: Empresa, user: Usuario, solo_lectura: bool = False):
    """Verifica que el usuario tenga acceso a la empresa.
    Si solo_lectura=True, cualquier COMERCIAL puede leer (pero no editar).
    """
    if user.rol == RolEnum.JEFE:
        return
    if solo_lectura:
        return  # COMERCIAL puede ver cualquier empresa
    ids = _get_empresa_ids_comercial(db, user.id)
    if empresa.id not in ids:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta empresa")


@router.get("/")
def listar_empresas(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    q: str | None = Query(None, description="Buscar por nombre, ciudad, provincia o razon social"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    query = db.query(Empresa)
    # Todos los usuarios ven todas las empresas (comerciales incluidos)
    if q:
        pattern = f"%{q}%"
        query = query.filter(
            Empresa.nombre.ilike(pattern)
            | Empresa.ciudad.ilike(pattern)
            | Empresa.provincia.ilike(pattern)
            | Empresa.razon_social.ilike(pattern)
        )
    total = query.count()
    items = query.order_by(Empresa.nombre).offset(skip).limit(limit).all()

    # Obtener comerciales titulares para las empresas de esta página
    emp_ids = [e.id for e in items]
    comerciales_map = {}
    if emp_ids:
        ecs = db.query(EmpresaComercial).filter(
            EmpresaComercial.empresa_id.in_(emp_ids),
            EmpresaComercial.tipo == "TITULAR",
        ).all()
        for ec in ecs:
            nombre = ec.comercial.nombre if ec.comercial else "?"
            comerciales_map.setdefault(ec.empresa_id, []).append(nombre)

    result = []
    for emp in items:
        emp_dict = EmpresaResponse.model_validate(emp).model_dump()
        emp_dict["comerciales_nombres"] = ", ".join(comerciales_map.get(emp.id, []))
        result.append(emp_dict)

    return {"items": result, "total": total}


@router.post("/geocode-all")
def geocode_all_empresas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """Geocodifica todas las empresas que no tienen coordenadas."""
    if current_user.rol != RolEnum.JEFE:
        raise HTTPException(status_code=403, detail="Solo el jefe puede ejecutar esto")
    import time
    empresas = db.query(Empresa).filter(Empresa.latitud.is_(None)).all()
    actualizadas = 0
    for emp in empresas:
        lat, lon = geocode_ciudad(emp.ciudad, emp.provincia)
        if lat is not None:
            emp.latitud = lat
            emp.longitud = lon
            actualizadas += 1
            time.sleep(1)  # Respetar rate limit de Nominatim
    db.commit()
    return {"total": len(empresas), "actualizadas": actualizadas}


@router.get("/{empresa_id}", response_model=EmpresaResponse)
def obtener_empresa(
    empresa_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    verificar_acceso_empresa(db, empresa, current_user, solo_lectura=True)
    return empresa


@router.post("/", response_model=EmpresaResponse, status_code=status.HTTP_201_CREATED)
def crear_empresa(
    data: EmpresaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    # Verificar duplicado por nombre (case-insensitive)
    existente = db.query(Empresa).filter(
        Empresa.nombre.ilike(data.nombre.strip())
    ).first()
    if existente:
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe una empresa con el nombre '{existente.nombre}' (ID: {existente.id})",
        )
    # Verificar duplicado por razón social si se proporcionó
    if data.razon_social:
        existente_rs = db.query(Empresa).filter(
            Empresa.razon_social.ilike(data.razon_social.strip())
        ).first()
        if existente_rs:
            raise HTTPException(
                status_code=400,
                detail=f"Ya existe una empresa con la razón social '{existente_rs.razon_social}' (ID: {existente_rs.id})",
            )
    empresa = Empresa(**data.model_dump())
    # Geocodificar (no-bloqueante: si falla, la empresa se crea igual)
    try:
        lat, lon = geocode_ciudad(empresa.ciudad, empresa.provincia)
        empresa.latitud = lat
        empresa.longitud = lon
    except Exception:
        pass
    db.add(empresa)
    db.flush()
    # Asignar al creador como comercial
    ec = EmpresaComercial(empresa_id=empresa.id, comercial_id=current_user.id)
    db.add(ec)
    registrar_cambio(db, current_user.id, "CREAR", "empresa", empresa.id, f"Empresa: {empresa.nombre}")
    db.commit()
    db.refresh(empresa)
    return empresa


@router.put("/{empresa_id}", response_model=EmpresaResponse)
def actualizar_empresa(
    empresa_id: int,
    data: EmpresaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    verificar_acceso_empresa(db, empresa, current_user)
    cambios = data.model_dump(exclude_unset=True)
    # Re-geocodificar si cambia ciudad o provincia
    ciudad_cambia = "ciudad" in cambios or "provincia" in cambios
    for field, value in cambios.items():
        setattr(empresa, field, value)
    if ciudad_cambia:
        lat, lon = geocode_ciudad(empresa.ciudad, empresa.provincia)
        empresa.latitud = lat
        empresa.longitud = lon
    registrar_cambio(db, current_user.id, "EDITAR", "empresa", empresa.id, str(cambios))
    db.commit()
    db.refresh(empresa)
    return empresa


@router.delete("/{empresa_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_empresa(
    empresa_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    if current_user.rol != RolEnum.JEFE:
        raise HTTPException(status_code=403, detail="Solo el jefe puede eliminar empresas")
    nombre = empresa.nombre
    db.delete(empresa)
    registrar_cambio(db, current_user.id, "ELIMINAR", "empresa", empresa_id, f"Empresa: {nombre}")
    db.commit()


# ── Asignación de comerciales ──────────────────────────────────

def _limpiar_compartidos_expirados(db: Session):
    """Elimina asignaciones COMPARTIDO cuya fecha_fin ya pasó."""
    from datetime import datetime, timezone
    ahora = datetime.now(timezone.utc)
    expirados = db.query(EmpresaComercial).filter(
        EmpresaComercial.tipo == "COMPARTIDO",
        EmpresaComercial.fecha_fin.isnot(None),
        EmpresaComercial.fecha_fin < ahora,
    ).all()
    for ec in expirados:
        db.delete(ec)
    if expirados:
        db.commit()


@router.post("/{empresa_id}/comerciales", response_model=EmpresaComercialResponse, status_code=status.HTTP_201_CREATED)
def asignar_comercial(
    empresa_id: int,
    data: EmpresaComercialCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    if current_user.rol != RolEnum.JEFE:
        raise HTTPException(status_code=403, detail="Solo el jefe puede asignar comerciales")
    existe = db.query(EmpresaComercial).filter(
        EmpresaComercial.empresa_id == empresa_id,
        EmpresaComercial.comercial_id == data.comercial_id,
    ).first()
    if existe:
        raise HTTPException(status_code=400, detail="Este comercial ya esta asignado a la empresa")
    ec = EmpresaComercial(empresa_id=empresa_id, comercial_id=data.comercial_id, tipo="TITULAR")
    db.add(ec)
    db.commit()
    db.refresh(ec)
    return _ec_to_response(ec)


@router.post("/{empresa_id}/compartir", status_code=status.HTTP_201_CREATED)
def compartir_cliente(
    empresa_id: int,
    data: CompartirClienteRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """Comparte un cliente con otro comercial (temporal o indefinido)."""
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    # Solo JEFE o comercial titular pueden compartir
    if current_user.rol != RolEnum.JEFE:
        titular = db.query(EmpresaComercial).filter(
            EmpresaComercial.empresa_id == empresa_id,
            EmpresaComercial.comercial_id == current_user.id,
            EmpresaComercial.tipo == "TITULAR",
        ).first()
        if not titular:
            raise HTTPException(status_code=403, detail="Solo el titular o el jefe pueden compartir un cliente")

    # Verificar que no esté ya asignado
    existe = db.query(EmpresaComercial).filter(
        EmpresaComercial.empresa_id == empresa_id,
        EmpresaComercial.comercial_id == data.comercial_destino_id,
    ).first()
    if existe:
        raise HTTPException(status_code=400, detail="Este comercial ya tiene acceso a la empresa")

    # Verificar que el destino es un usuario válido
    destino = db.query(Usuario).filter(Usuario.id == data.comercial_destino_id).first()
    if not destino:
        raise HTTPException(status_code=404, detail="Comercial destino no encontrado")

    ec = EmpresaComercial(
        empresa_id=empresa_id,
        comercial_id=data.comercial_destino_id,
        tipo="COMPARTIDO",
        compartido_por_id=current_user.id,
        fecha_fin=data.fecha_fin,
        acceso_origen=data.acceso_origen,
    )
    db.add(ec)
    fecha_desc = "(indeterminado)" if not data.fecha_fin else f"hasta {data.fecha_fin.strftime('%d/%m/%Y')}"
    registrar_cambio(
        db, current_user.id, "COMPARTIR", "empresa", empresa_id,
        f"Compartido con {destino.nombre} {fecha_desc}"
    )
    db.commit()
    db.refresh(ec)
    return _ec_to_response(ec)


def _ec_to_response(ec):
    """Convierte EmpresaComercial a dict con comercial_nombre."""
    return {
        "id": ec.id,
        "empresa_id": ec.empresa_id,
        "comercial_id": ec.comercial_id,
        "asignado_en": ec.asignado_en,
        "tipo": ec.tipo,
        "compartido_por_id": ec.compartido_por_id,
        "fecha_fin": ec.fecha_fin,
        "acceso_origen": ec.acceso_origen,
        "comercial_nombre": ec.comercial.nombre if ec.comercial else None,
    }


@router.get("/{empresa_id}/comerciales")
def listar_comerciales_empresa(
    empresa_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    verificar_acceso_empresa(db, empresa, current_user, solo_lectura=True)

    # Limpiar compartidos expirados antes de listar
    _limpiar_compartidos_expirados(db)

    ecs = db.query(EmpresaComercial).filter(
        EmpresaComercial.empresa_id == empresa_id
    ).all()
    return [_ec_to_response(ec) for ec in ecs]


@router.delete("/{empresa_id}/comerciales/{comercial_id}", status_code=status.HTTP_204_NO_CONTENT)
def desasignar_comercial(
    empresa_id: int,
    comercial_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    if current_user.rol != RolEnum.JEFE:
        raise HTTPException(status_code=403, detail="Solo el jefe puede desasignar comerciales")
    ec = db.query(EmpresaComercial).filter(
        EmpresaComercial.empresa_id == empresa_id,
        EmpresaComercial.comercial_id == comercial_id,
    ).first()
    if not ec:
        raise HTTPException(status_code=404, detail="Asignacion no encontrada")
    db.delete(ec)
    db.commit()


# ── Archivos de empresa ──────────────────────────────────

@router.get("/{empresa_id}/archivos")
def listar_archivos(
    empresa_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    verificar_acceso_empresa(db, empresa, current_user, solo_lectura=True)
    archivos = db.query(EmpresaArchivo).filter(
        EmpresaArchivo.empresa_id == empresa_id
    ).order_by(EmpresaArchivo.subido_en.desc()).all()
    return [
        {
            "id": a.id,
            "nombre_original": a.nombre_original,
            "tamano": a.tamano,
            "subido_por": a.subido_por.nombre if a.subido_por else None,
            "subido_en": a.subido_en.isoformat() if a.subido_en else None,
        }
        for a in archivos
    ]


@router.post("/{empresa_id}/archivos", status_code=status.HTTP_201_CREATED)
def subir_archivo(
    empresa_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    verificar_acceso_empresa(db, empresa, current_user)

    contents = file.file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="El archivo supera el limite de 15 MB")

    safe_name = file.filename.replace(" ", "_")
    disk_name = f"{empresa_id}_{EmpresaArchivo.__tablename__}_{safe_name}"
    file_path = ARCHIVOS_DIR / disk_name
    with open(file_path, "wb") as f:
        f.write(contents)

    archivo = EmpresaArchivo(
        empresa_id=empresa_id,
        nombre_original=safe_name,
        nombre_disco=disk_name,
        tamano=len(contents),
        subido_por_id=current_user.id,
    )
    db.add(archivo)
    registrar_cambio(db, current_user.id, "CREAR", "empresa", empresa_id,
                     f"Archivo subido: {safe_name}")
    db.commit()
    db.refresh(archivo)
    return {
        "id": archivo.id,
        "nombre_original": archivo.nombre_original,
        "tamano": archivo.tamano,
        "subido_en": archivo.subido_en.isoformat() if archivo.subido_en else None,
    }


@router.get("/{empresa_id}/archivos/{archivo_id}/descargar")
def descargar_archivo(
    empresa_id: int,
    archivo_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    verificar_acceso_empresa(db, empresa, current_user, solo_lectura=True)

    archivo = db.query(EmpresaArchivo).filter(
        EmpresaArchivo.id == archivo_id,
        EmpresaArchivo.empresa_id == empresa_id,
    ).first()
    if not archivo:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    file_path = ARCHIVOS_DIR / archivo.nombre_disco
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado en el servidor")

    return FileResponse(
        path=str(file_path),
        filename=archivo.nombre_original,
    )


@router.delete("/{empresa_id}/archivos/{archivo_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_archivo(
    empresa_id: int,
    archivo_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    verificar_acceso_empresa(db, empresa, current_user)

    archivo = db.query(EmpresaArchivo).filter(
        EmpresaArchivo.id == archivo_id,
        EmpresaArchivo.empresa_id == empresa_id,
    ).first()
    if not archivo:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    file_path = ARCHIVOS_DIR / archivo.nombre_disco
    if file_path.exists():
        file_path.unlink()

    nombre = archivo.nombre_original
    db.delete(archivo)
    registrar_cambio(db, current_user.id, "ELIMINAR", "empresa", empresa_id,
                     f"Archivo eliminado: {nombre}")
    db.commit()
