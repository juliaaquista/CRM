@echo off
chcp 65001 >nul 2>&1
title Abisysa CRM - Instalacion
color 1F

echo.
echo  ============================================
echo       ABISYSA CRM - INSTALACION
echo  ============================================
echo.
echo  Este proceso instalara las dependencias
echo  necesarias para ejecutar el CRM.
echo.
echo  Requisitos previos:
echo    - Python 3.12 instalado
echo    - Node.js 24 instalado
echo.
echo  Presiona cualquier tecla para continuar...
echo  (o cierra esta ventana para cancelar)
pause >nul

echo.
echo  [1/6] Verificando Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  ERROR: Python no esta instalado.
    echo  Descargalo de: https://www.python.org/downloads/
    echo  IMPORTANTE: Marca "Add Python to PATH" al instalar.
    echo.
    pause
    exit /b 1
)
for /f "tokens=2" %%i in ('python --version 2^>^&1') do echo  OK: Python %%i

echo.
echo  [2/6] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  ERROR: Node.js no esta instalado.
    echo  Descargalo de: https://nodejs.org/es
    echo  Descarga la version LTS.
    echo.
    pause
    exit /b 1
)
for /f %%i in ('node --version 2^>^&1') do echo  OK: Node.js %%i

echo.
echo  [3/6] Creando entorno virtual de Python...
cd /d "%~dp0backend"
if not exist "venv" (
    python -m venv venv
    echo  OK: Entorno virtual creado
) else (
    echo  OK: Entorno virtual ya existe
)

echo.
echo  [4/6] Instalando dependencias de Python...
echo  (esto puede tardar unos minutos)
venv\Scripts\pip.exe install -r requirements.txt --quiet 2>nul
if errorlevel 1 (
    echo  Reintentando instalacion...
    venv\Scripts\pip.exe install -r requirements.txt
)
echo  OK: Dependencias de Python instaladas

echo.
echo  [5/6] Instalando dependencias del frontend...
echo  (esto puede tardar unos minutos)
cd /d "%~dp0frontend"
call npm install --silent 2>nul
echo  OK: Dependencias del frontend instaladas

echo.
echo  [6/6] Verificando conexion a la base de datos...
cd /d "%~dp0backend"
venv\Scripts\python.exe -c "import psycopg2; conn = psycopg2.connect(host='192.168.1.15', port=5433, database='miapp_db', user='miapp', password='contrasena-segura'); print('  OK: Conexion a la base de datos exitosa'); conn.close()" 2>nul
if errorlevel 1 (
    echo.
    echo  AVISO: No se pudo conectar a la base de datos.
    echo  Esto puede ser normal si no estas en la red
    echo  de la oficina. Verifica con el administrador.
)

echo.
echo  ============================================
echo       INSTALACION COMPLETADA
echo  ============================================
echo.
echo  Para iniciar el CRM, ejecuta: INICIAR.bat
echo.
echo  Presiona cualquier tecla para cerrar...
pause >nul
