@echo off
REM ============================================================
REM  RESPALDO DE DATOS - Data Pro
REM  Sube data.json al repositorio para que sobreviva a las
REM  actualizaciones/despliegues de la herramienta.
REM  Usar despues de ingresar datos en cualquier equipo.
REM ============================================================
cd /d "C:\Users\yonny.h\Videos\DATA\Data Pro V1.9"

echo.
echo ===================================================
echo   RESPALDO DE DATA.JSON
echo ===================================================
echo.

REM Verificar que data.json existe
if not exist "data.json" (
  echo [ERROR] No se encontro data.json en esta carpeta.
  pause
  exit /b 1
)

REM Mostrar resumen de datos antes de subir
echo Resumen de datos actuales:
node -e "const d=require('./data.json'); const e=d.collections['seguimiento-enfardadora']; console.log('  - Paradas enfardadora:', e&&e.stops?e.stops.length:0); const o=d.collections['seguimiento-ordenes']; console.log('  - Lineas seguimiento ordenes:', o?Object.keys(o).length:0); console.log('  - Tareas planner:', d.planner&&d.planner.tasks?d.planner.tasks.length:0);"
echo.

REM Status rapido
git status --short data.json
echo.

echo Subiendo data.json al repositorio (commit + push)...
git add data.json
git commit -m "respaldo: actualizar data.json con datos ingresados"
if errorlevel 1 (
  echo [INFO] Nada nuevo que commitear (los datos ya estan sincronizados).
) else (
  git push origin main
  if errorlevel 1 (
    echo [ERROR] No se pudo hacer push. Revisa tu conexion o credenciales de git.
    pause
    exit /b 1
  )
  echo.
  echo [OK] Respaldo subido correctamente. La herramienta conservara los datos al actualizar.
)

echo.
echo Presiona una tecla para salir...
pause >nul
