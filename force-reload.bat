@echo off
echo ========================================
echo FORZANDO RECARGA SIN CACHE
echo ========================================

echo.
echo 1. Deteniendo servicios...
cd backend
taskkill /f /im node.exe 2>nul
cd ..

echo.
echo 2. Recompilando frontend...
cd frontend
npm run build
cd ..

echo.
echo 3. Reiniciando backend...
cd backend
npm start

echo.
echo ========================================
echo PROCESO COMPLETADO
echo ========================================
echo.
echo Ahora abre tu navegador y:
echo 1. Ve a http://localhost:3000
echo 2. Presiona Ctrl+Shift+R (o Ctrl+F5)
echo 3. Si sigues viendo errores, abre las herramientas
echo    de desarrollador (F12) y ve a la pestaña Network
echo 4. Marca "Disable cache" y recarga la página
echo.
pause 