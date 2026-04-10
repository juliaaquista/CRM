================================================================
                    ABISYSA CRM v2.0
                     Marzo 2026
================================================================

CONTENIDO DE ESTA CARPETA
--------------------------
  backend/                             -> Servidor de la aplicacion (Python/FastAPI)
  frontend/                            -> Interfaz grafica (React)
  backup/                              -> Scripts de backup
  Manual_Usuario_Abisysa_CRM.pdf       -> Manual completo del CRM
  README.txt                           -> Este archivo


ARQUITECTURA
--------------------------
  La aplicacion corre completamente en el servidor.
  Los usuarios acceden desde cualquier navegador web
  (Chrome, Firefox, Edge, movil) sin instalar nada.

  Servidor: 192.168.1.15 (local) / abisysa-server.eur3.ug.link (remoto)
  Base de datos: PostgreSQL en el mismo servidor (puerto 5433)


CONFIGURACION INICIAL (una sola vez)
--------------------------------------
  1. Instalar Python 3.12+
  2. Instalar Node.js 24+
  3. Crear entorno virtual:
       cd backend
       python3 -m venv venv
       source venv/bin/activate
       pip install -r requirements.txt

  4. Instalar frontend:
       cd frontend
       npm install

  5. Configurar backend/.env con los datos de conexion a PostgreSQL

  6. Crear tablas y usuarios iniciales:
       cd backend
       source venv/bin/activate
       python3 -m app.seed

  7. Iniciar la aplicacion:
       Backend:  cd backend && source venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8002
       Frontend: cd frontend && npm run dev -- --host 0.0.0.0


ACCESO DE USUARIOS
--------------------
  Los comerciales acceden desde el navegador a:
    http://192.168.1.15:5173  (desde la oficina)
    http://abisysa-server.eur3.ug.link:5173  (desde fuera)

  No necesitan instalar nada en sus ordenadores.


CREDENCIALES DE PRUEBA
-----------------------
  Jefe:       carlos@abisysa.com     /  admin123
  Comercial:  laura@abisysa.com      /  comercial123
  Comercial:  martin@abisysa.com     /  comercial123


REPOSITORIO
------------
  GitHub: https://github.com/juliaaquista/CRM.git


SOPORTE
--------
  Contactar con Julia o con el administrador del sistema.


================================================================
