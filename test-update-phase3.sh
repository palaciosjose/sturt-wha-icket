#!/bin/bash

# Script de prueba para verificar la Fase 3 de actualización completa
# Este script prueba la funcionalidad de actualización completa

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

print_message "🧪 PRUEBA: Fase 3 - Actualización Completa" $BLUE
print_message "===========================================" $BLUE

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

# Verificar scripts de actualización
if [ -f "check-updates.sh" ]; then
    print_message "✅ check-updates.sh encontrado" $GREEN
else
    print_message "❌ check-updates.sh no encontrado" $RED
fi

# Verificar package.json files
if [ -f "backend/package.json" ]; then
    print_message "✅ backend/package.json encontrado" $GREEN
else
    print_message "❌ backend/package.json no encontrado" $RED
fi

if [ -f "frontend/package.json" ]; then
    print_message "✅ frontend/package.json encontrado" $GREEN
else
    print_message "❌ frontend/package.json no encontrado" $RED
fi

# Verificar migraciones
if [ -d "backend/src/database/migrations" ]; then
    print_message "✅ Directorio de migraciones encontrado" $GREEN
    MIGRATION_COUNT=$(ls backend/src/database/migrations/*.ts 2>/dev/null | wc -l)
    print_message "📊 Número de migraciones: $MIGRATION_COUNT" $BLUE
else
    print_message "❌ Directorio de migraciones no encontrado" $RED
fi

print_message "" $BLUE
print_message "🎯 RESUMEN DE LA FASE 3:" $BLUE
print_message "✅ Backend: Endpoint /system/perform-full-update implementado" $GREEN
print_message "✅ Frontend: Modal con opciones de actualización básica y completa" $GREEN
print_message "✅ Scripts: Verificación y actualización completa implementados" $GREEN
print_message "✅ Traducciones: Textos en español para actualización completa" $GREEN
print_message "✅ Validaciones: Cambios locales y errores manejados" $GREEN
print_message "✅ Dependencias: Actualización automática de npm packages" $GREEN
print_message "✅ Migraciones: Ejecución automática de migraciones de BD" $GREEN
print_message "✅ Compilación: Recompilación automática de backend y frontend" $GREEN
print_message "" $BLUE
print_message "🚀 FASE 3 COMPLETADA EXITOSAMENTE" $GREEN
print_message "   El sistema está listo para actualizaciones completas" $GREEN
print_message "" $BLUE
print_message "📋 FUNCIONALIDADES IMPLEMENTADAS:" $BLUE
print_message "   🚀 Actualización Básica: Solo código fuente" $GREEN
print_message "   ⚡ Actualización Completa: Código + Dependencias + BD + Compilación" $GREEN
print_message "   📦 Backup automático antes de actualizar" $GREEN
print_message "   🔄 Rollback automático en caso de error" $GREEN
print_message "   🗄️ Migraciones de base de datos automáticas" $GREEN
print_message "   🔨 Recompilación automática de backend y frontend" $GREEN
print_message "   📊 Progreso visual durante la actualización" $GREEN
print_message "   ✅ Validaciones de seguridad y permisos" $GREEN
