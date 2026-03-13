from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine
from app.api.auth import router as auth_router
from app.api.empresas import router as empresas_router
from app.api.contactos import router as contactos_router
from app.api.productos import router as productos_router
from app.api.ofertas import router as ofertas_router
from app.api.acciones import router as acciones_router
from app.api.informes import router as informes_router
from app.api.buscar import router as buscar_router
from app.api.dashboard import router as dashboard_router
from app.api.audit import router as audit_router
from app.api.import_export import router as import_export_router
from app.api.alertas import router as alertas_router
from app.api.sucursales import router as sucursales_router, router_global as sucursales_global_router
import app.models

app = FastAPI(title="CRM Abisysa", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Crea las tablas en la base de datos al iniciar
Base.metadata.create_all(bind=engine)

app.include_router(auth_router)
app.include_router(import_export_router)  # Before empresas to avoid /{empresa_id} conflict
app.include_router(empresas_router)
app.include_router(contactos_router)
app.include_router(productos_router)
app.include_router(ofertas_router)
app.include_router(acciones_router)
app.include_router(informes_router)
app.include_router(buscar_router)
app.include_router(dashboard_router)
app.include_router(audit_router)
app.include_router(alertas_router)
app.include_router(sucursales_global_router)
app.include_router(sucursales_router)


@app.get("/")
def root():
    return {"mensaje": "CRM Abisysa API v2 funcionando"}
