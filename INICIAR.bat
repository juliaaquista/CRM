@echo off
chcp 65001 >nul 2>&1
title Abisysa CRM
color 1F

echo.
echo  ============================================
echo       ABISYSA CRM - INICIANDO
echo  ============================================
echo.

:: Iniciar backend
echo  Iniciando servidor backend...
cd /d "%~dp0backend"
start "Abisysa CRM - Backend" /min cmd /c "venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload"

:: Esperar a que el backend arranque
echo  Esperando al backend...
timeout /t 4 /nobreak >nul

:: Iniciar frontend
echo  Iniciando interfaz web...
cd /d "%~dp0frontend"
start "Abisysa CRM - Frontend" /min cmd /c "npm run dev"

:: Esperar a que el frontend arranque
echo  Esperando a la interfaz...
timeout /t 5 /nobreak >nul

echo.
echo  ============================================
echo       CRM INICIADO CORRECTAMENTE
echo  ============================================
echo.
echo  Abre tu navegador y ve a:
echo.
echo       http://localhost:5173
echo.
echo  ============================================
echo.
echo  NO CIERRES esta ventana mientras uses el CRM.
echo  Para detener el CRM, cierra esta ventana.
echo.

:: Abrir navegador automaticamente
start http://localhost:5173

echo  Presiona cualquier tecla para DETENER el CRM...
pause >nul

:: Cerrar procesos
echo.
echo  Deteniendo el CRM...
taskkill /fi "WINDOWTITLE eq Abisysa CRM - Backend" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq Abisysa CRM - Frontend" /f >nul 2>&1
echo  CRM detenido. Puedes cerrar esta ventana.
timeout /t 3 >nul
