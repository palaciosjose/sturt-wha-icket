@echo off
echo ========================================
echo LIMPIANDO CACHE Y REINICIANDO SERVICIOS
echo ========================================

echo.
echo 1. Deteniendo servicios...
cd backend
taskkill /f /im node.exe 2>nul
cd ..

echo.
echo 2. Limpiando cache del navegador...
echo Por favor, abre tu navegador y presiona Ctrl+Shift+Delete
echo Luego selecciona "Todo el tiempo" y marca todas las opciones
echo Haz clic en "Limpiar datos"

echo.
echo 3. Limpiando cache de npm...
cd frontend
npm cache clean --force
cd ..

echo.
echo 4. Reinstalando dependencias del frontend...
cd frontend
rmdir /s /q node_modules 2>nul
del package-lock.json 2>nul
npm install

echo.
echo 5. Recompilando frontend...
npm run build

echo.
echo 6. Reiniciando backend...
cd ../backend
npm install
npm start

echo.
echo ========================================
echo PROCESO COMPLETADO
echo ========================================
echo.
echo Ahora abre tu navegador y ve a:
echo http://localhost:3000
echo.
echo Si sigues viendo errores, presiona Ctrl+F5
echo para forzar una recarga completa sin cache.
echo.
pause 