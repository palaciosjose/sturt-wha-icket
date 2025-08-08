#!/bin/bash

# Script de prueba para simular escenario sin token de autenticación
# Este script modifica temporalmente la URL del remote para probar el manejo de errores

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes con colores
print_message() {
    echo -e "${2}${1}${NC}"
}

print_message "🧪 PRUEBA: Simulando escenario sin token de autenticación" $BLUE
print_message "=========================================================" $BLUE

# Guardar la URL original
ORIGINAL_URL=$(git remote get-url origin)
print_message "📍 URL original guardada: ${ORIGINAL_URL:0:50}..." $BLUE

# Cambiar temporalmente la URL para simular sin token
git remote set-url origin "https://github.com/leopoldohuacasiv/watoolxoficial.git"
print_message "🔄 URL temporal configurada (sin token)" $YELLOW

# Ejecutar el script de verificación
echo ""
print_message "🚀 Ejecutando check-updates.sh..." $BLUE
echo ""

# Ejecutar el script
bash check-updates.sh

# Restaurar la URL original
echo ""
print_message "🔄 Restaurando URL original..." $BLUE
git remote set-url origin "$ORIGINAL_URL"
print_message "✅ URL original restaurada" $GREEN

print_message "🧪 PRUEBA COMPLETADA" $BLUE
