@echo off
REM ============================================================
REM  RESTAURAR DATA.JSON - Data Pro
REM  Restaura data.json desde el respaldo rotativo mas reciente
REM  ubicado en data.json.backups/. Usar solo si data.json se
REM  corrompe o queda vacio.
REM ============================================================
cd /d "C:\Users\yonny.h\Videos\DATA\Data Pro V1.9"

echo.
echo ===================================================
echo   RESTAURAR DATA.JSON DESDE RESPALDO
echo ===================================================
echo.

if not exist "data.json.backups" (
  echo [ERROR] No existe la carpeta data.json.backups/.
  pause
  exit /b 1
)

for /f "delims=" %%f in ('dir /b /o-n data.json.backups\data-*.json 2^>nul') do (
  set "BACKUP=%%f"
  goto :found
)
:found

if not defined BACKUP (
  echo [ERROR] No hay respaldos disponibles.
  pause
  exit /b 1
)

echo Respaldo mas reciente encontrado: %BACKUP%
echo.
set /p CONFIRM="¿Restaurar data.json desde este respaldo? (S/N): "
if /i not "%CONFIRM%"=="S" (
  echo Cancelado.
  pause
  exit /b 0
)

if exist "data.json" (
  copy /y "data.json" "data.json.corrupto.bak" >nul
  echo [INFO] Se hizo copia de seguridad del data.json actual en data.json.corrupto.bak
)

copy /y "data.json.backups\%BACKUP%" "data.json" >nul
echo [OK] data.json restaurado desde %BACKUP%.
echo.
pause
