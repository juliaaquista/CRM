from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import Base, engine
import app.models

app = FastAPI(title="CRM Abisysa", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Crea las tablas en la base de datos al iniciar
Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"mensaje": "CRM Abisysa API funcionando"}