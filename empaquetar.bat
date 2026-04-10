@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title Abisysa CRM - Empaquetar version para cliente
color 1F

echo.
echo  ============================================================
echo       ABISYSA CRM - EMPAQUETADOR DE VERSIONES
echo  ============================================================
echo.

set "BASEDIR=%~dp0"
set "PROJECT_DIR=%BASEDIR%"
set "RELEASES_DIR=%BASEDIR%releases"

:: Crear carpeta releases si no existe
if not exist "%RELEASES_DIR%" (
    mkdir "%RELEASES_DIR%"
    echo  [OK] Carpeta releases\ creada
)

:: Leer version actual del VERSION.txt (si existe)
set "CURRENT_VERSION="
if exist "%PROJECT_DIR%VERSION.txt" set /p CURRENT_VERSION=<"%PROJECT_DIR%VERSION.txt"

:: Preguntar version
echo.
if defined CURRENT_VERSION echo  Version actual en VERSION.txt: %CURRENT_VERSION%
echo.
echo  Que version vas a empaquetar?
echo  Ejemplos: 1.0.0, 1.1.0, 1.2.3
echo  (Enter para usar la version actual)
echo.
set /p VERSION=  Numero de version:

:: Si no se ingreso nada, intentar usar la version actual
if "%VERSION%"=="" set "VERSION=%CURRENT_VERSION%"

:: Si sigue vacia, cancelar
if "%VERSION%"=="" (
    echo.
    echo  [ERROR] No ingresaste una version y no hay VERSION.txt. Cancelando.
    pause
    exit /b 1
)

echo  [OK] Version a empaquetar: %VERSION%

:: Actualizar VERSION.txt si cambio
if not "%VERSION%"=="%CURRENT_VERSION%" (
    echo %VERSION%>"%PROJECT_DIR%VERSION.txt"
    echo  [OK] VERSION.txt actualizado a %VERSION%
)

set "ZIP_NAME=crm-abisysa-v%VERSION%.zip"
set "ZIP_PATH=%RELEASES_DIR%\%ZIP_NAME%"
set "TEMP_DIR=%TEMP%\crm-abisysa-release-%RANDOM%"

:: Avisar si el ZIP ya existe
if exist "%ZIP_PATH%" (
    echo.
    echo  [AVISO] Ya existe un archivo con ese nombre:
    echo          %ZIP_PATH%
    echo.
    set /p OVERWRITE=  Sobrescribirlo? [S/N]:
    if /i not "!OVERWRITE!"=="S" (
        echo  Cancelado.
        pause
        exit /b 0
    )
    del "%ZIP_PATH%"
)

echo.
echo  Preparando archivos...
echo  Carpeta temporal: %TEMP_DIR%

:: Crear carpeta temporal y copiar solo lo necesario
mkdir "%TEMP_DIR%\crm" 2>nul

:: Copiar archivos de la raiz
copy "%PROJECT_DIR%docker-compose.yml" "%TEMP_DIR%\crm\" >nul
copy "%PROJECT_DIR%INSTALAR.bat" "%TEMP_DIR%\crm\" >nul
copy "%PROJECT_DIR%INICIAR.bat" "%TEMP_DIR%\crm\" >nul
copy "%PROJECT_DIR%README.txt" "%TEMP_DIR%\crm\" >nul 2>&1
copy "%PROJECT_DIR%MIGRATIONS.md" "%TEMP_DIR%\crm\" >nul 2>&1
copy "%PROJECT_DIR%VERSION.txt" "%TEMP_DIR%\crm\" >nul 2>&1
copy "%PROJECT_DIR%Manual_Instalacion_Abisysa_CRM.pdf" "%TEMP_DIR%\crm\" >nul 2>&1
copy "%PROJECT_DIR%Manual_Usuario_CRM_Abisysa.pdf" "%TEMP_DIR%\crm\" >nul 2>&1

echo  [OK] Archivos raiz copiados

:: Copiar backend (excluyendo venv, __pycache__, uploads)
echo  Copiando backend (puede tardar)...
robocopy "%PROJECT_DIR%backend" "%TEMP_DIR%\crm\backend" /E ^
    /XD venv __pycache__ .pytest_cache uploads .venv node_modules ^
    /XF *.pyc *.pyo .env ^
    /NFL /NDL /NJH /NJS /NC /NS /NP >nul
echo  [OK] Backend copiado

:: Copiar frontend (excluyendo node_modules, dist, .vite)
echo  Copiando frontend (puede tardar)...
robocopy "%PROJECT_DIR%frontend" "%TEMP_DIR%\crm\frontend" /E ^
    /XD node_modules dist .vite build ^
    /XF .env .env.local ^
    /NFL /NDL /NJH /NJS /NC /NS /NP >nul
echo  [OK] Frontend copiado

:: Copiar backup (servicio Docker, no los backups generados)
echo  Copiando servicio backup...
robocopy "%PROJECT_DIR%backup" "%TEMP_DIR%\crm\backup" /E ^
    /NFL /NDL /NJH /NJS /NC /NS /NP >nul
echo  [OK] Servicio backup copiado

:: IMPORTANTE: data\ NO se copia (datos locales + backups del dev)
echo  [SKIP] data\ omitido (datos locales, no enviar al cliente)

:: Crear el ZIP con PowerShell
echo.
echo  Creando ZIP... (esto puede tardar 1-2 minutos)
powershell -NoProfile -Command "Compress-Archive -Path '%TEMP_DIR%\crm' -DestinationPath '%ZIP_PATH%' -CompressionLevel Optimal -Force"

if errorlevel 1 (
    echo.
    echo  [ERROR] Fallo al crear el ZIP
    rmdir /s /q "%TEMP_DIR%" 2>nul
    pause
    exit /b 1
)

:: Limpiar carpeta temporal
rmdir /s /q "%TEMP_DIR%" 2>nul

:: Calcular tamanio del ZIP
for %%A in ("%ZIP_PATH%") do set "ZIP_SIZE=%%~zA"
set /a ZIP_MB=%ZIP_SIZE%/1024/1024

echo.
echo  ============================================================
echo       EMPAQUETADO COMPLETADO
echo  ============================================================
echo.
echo   Archivo:  %ZIP_NAME%
echo   Ubicacion: %ZIP_PATH%
echo   Tamanio:   ~%ZIP_MB% MB
echo.
echo  Checklist antes de enviar:
echo   [ ] Revisar MIGRATIONS.md - hay SQL que correr?
echo   [ ] Probar el CRM localmente una ultima vez
echo   [ ] Incluir mensaje al cliente con:
echo       - Resumen de cambios
echo       - Nota al ingeniero: LEER MIGRATIONS.md
echo       - Ventana de mantenimiento sugerida
echo.

:: Abrir la carpeta releases en el explorador
start "" "%RELEASES_DIR%"

pause
