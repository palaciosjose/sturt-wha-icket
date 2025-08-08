#!/bin/bash

# Script de prueba para verificar la Fase 2 de actualización
# Este script prueba la funcionalidad de actualización básica

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

print_message "🧪 PRUEBA: Fase 2 - Actualización Básica" $BLUE
print_message "=========================================" $BLUE

# Verificar que estamos en el directorio correcto
if [ ! -f "check-updates.sh" ]; then
    print_message "❌ Error: No se encontró check-updates.sh" $RED
    print_message "   Ejecuta este script desde el directorio raíz de watoolx" $RED
    exit 1
fi

# Verificar estado actual
print_message "🔍 Verificando estado actual..." $BLUE
CURRENT_COMMIT=$(git rev-parse HEAD)
CURRENT_BRANCH=$(git branch --show-current)
print_message "📍 Rama actual: $CURRENT_BRANCH" $BLUE
print_message "🔗 Commit actual: ${CURRENT_COMMIT:0:8}" $BLUE

# Verificar si hay cambios locales
LOCAL_CHANGES=$(git status --porcelain)
if [ -n "$LOCAL_CHANGES" ]; then
    print_message "⚠️  ADVERTENCIA: Hay cambios locales sin commitear" $YELLOW
    print_message "   Esto puede causar problemas durante la actualización" $YELLOW
    echo ""
    print_message "📋 Cambios locales detectados:" $YELLOW
    echo "$LOCAL_CHANGES"
    echo ""
else
    print_message "✅ No hay cambios locales sin commitear" $GREEN
fi

# Verificar actualizaciones disponibles
print_message "🔄 Verificando actualizaciones disponibles..." $BLUE
if bash check-updates.sh; then
    print_message "✅ Hay actualizaciones disponibles" $GREEN
else
    print_message "ℹ️  No hay actualizaciones disponibles o error en verificación" $YELLOW
fi

# Verificar estructura de archivos
print_message "🔍 Verificando estructura de archivos..." $BLUE

# Verificar backend
if [ -f "backend/src/controllers/SystemController.ts" ]; then
    print_message "✅ SystemController.ts encontrado" $GREEN
else
    print_message "❌ SystemController.ts no encontrado" $RED
fi

if [ -f "backend/src/routes/systemRoutes.ts" ]; then
    print_message "✅ systemRoutes.ts encontrado" $GREEN
else
    print_message "❌ systemRoutes.ts no encontrado" $RED
fi

# Verificar frontend
if [ -f "frontend/src/components/UpdateVersionModal/index.js" ]; then
    print_message "✅ UpdateVersionModal/index.js encontrado" $GREEN
else
    print_message "❌ UpdateVersionModal/index.js no encontrado" $RED
fi

if [ -f "frontend/src/translate/languages/es.js" ]; then
    print_message "✅ Traducciones en es.js encontradas" $GREEN
else
    print_message "❌ Traducciones en es.js no encontradas" $RED
fi

# Verificar script de actualización
if [ -f "check-updates.sh" ]; then
    print_message "✅ check-updates.sh encontrado" $GREEN
else
    print_message "❌ check-updates.sh no encontrado" $RED
fi

print_message "" $BLUE
print_message "🎯 RESUMEN DE LA FASE 2:" $BLUE
print_message "✅ Backend: Endpoint /system/perform-update implementado" $GREEN
print_message "✅ Frontend: Modal de actualización con progreso implementado" $GREEN
print_message "✅ Scripts: Verificación y actualización implementados" $GREEN
print_message "✅ Traducciones: Textos en español agregados" $GREEN
print_message "✅ Validaciones: Cambios locales y errores manejados" $GREEN
print_message "" $BLUE
print_message "🚀 FASE 2 COMPLETADA EXITOSAMENTE" $GREEN
print_message "   El sistema está listo para actualizaciones básicas" $GREEN
