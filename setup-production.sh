#!/bin/bash

# Script para configurar WATOOLX en producción
# Uso: ./setup-production.sh

set -e

echo "🚀 Configurando WATOOLX para producción..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para log
log_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Verificar si estamos en el directorio correcto
if [ ! -f "install.sh" ]; then
    log_error "Este script debe ejecutarse desde el directorio raíz de WATOOLX"
    exit 1
fi

# Configurar backend
log_message "Configurando backend..."
if [ -f "backend/env.production.example" ]; then
    cp backend/env.production.example backend/.env
    log_message "✅ Archivo .env del backend creado"
else
    log_error "No se encontró backend/env.production.example"
    exit 1
fi

# Configurar frontend
log_message "Configurando frontend..."
if [ -f "frontend/env.production.example" ]; then
    cp frontend/env.production.example frontend/.env
    log_message "✅ Archivo .env del frontend creado"
else
    log_error "No se encontró frontend/env.production.example"
    exit 1
fi

# Verificar que los archivos se crearon
if [ -f "backend/.env" ] && [ -f "frontend/.env" ]; then
    log_message "✅ Configuración de producción completada"
    echo ""
    echo "📋 Próximos pasos:"
    echo "1. Revisar y ajustar las configuraciones en backend/.env y frontend/.env"
    echo "2. Ejecutar: ./install.sh"
    echo "3. Verificar que Redis esté instalado y ejecutándose"
    echo ""
    log_warning "IMPORTANTE: Revisa las configuraciones antes de continuar"
else
    log_error "❌ Error al crear archivos de configuración"
    exit 1
fi 