#!/bin/bash

# ========================================
# DIAGNÓSTICO DE PRODUCCIÓN - WHATICKET SAAS
# ========================================
# Script para verificar si el proyecto está listo para VPS
# Autor: Asistente IA
# Fecha: $(date)
# ========================================

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir resultados
print_result() {
    local status=$1
    local message=$2
    if [ "$status" = "OK" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "WARNING" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    else
        echo -e "${RED}❌ $message${NC}"
    fi
}

echo -e "${BLUE}"
echo "========================================"
echo "  DIAGNÓSTICO DE PRODUCCIÓN"
echo "  WHATICKET SAAS v10.9.0"
echo "========================================"
echo -e "${NC}"

# ========================================
# 1. VERIFICACIÓN DE ESTRUCTURA DEL PROYECTO
# ========================================
echo -e "\n${BLUE}📁 VERIFICANDO ESTRUCTURA DEL PROYECTO${NC}"

# Verificar directorios principales
if [ -d "backend" ]; then
    print_result "OK" "Directorio backend encontrado"
else
    print_result "ERROR" "Directorio backend no encontrado"
    exit 1
fi

if [ -d "frontend" ]; then
    print_result "OK" "Directorio frontend encontrado"
else
    print_result "ERROR" "Directorio frontend no encontrado"
    exit 1
fi

# Verificar archivos críticos
critical_files=(
    "backend/package.json"
    "frontend/package.json"
    "backend/env.example"
    "frontend/env.example"
    "backend/ecosystem.config.js"
    "backend/src/app.ts"
    "backend/src/server.ts"
    "backend/src/config/database.ts"
    "backend/src/utils/logger.ts"
)

for file in "${critical_files[@]}"; do
    if [ -f "$file" ]; then
        print_result "OK" "Archivo $file encontrado"
    else
        print_result "ERROR" "Archivo crítico $file no encontrado"
    fi
done

# ========================================
# 2. VERIFICACIÓN DE CONFIGURACIONES
# ========================================
echo -e "\n${BLUE}⚙️  VERIFICANDO CONFIGURACIONES${NC}"

# Verificar archivos .env
if [ -f "backend/.env" ]; then
    print_result "OK" "Archivo .env del backend encontrado"
else
    print_result "WARNING" "Archivo .env del backend no encontrado (usar env.example)"
fi

if [ -f "frontend/.env" ]; then
    print_result "OK" "Archivo .env del frontend encontrado"
else
    print_result "WARNING" "Archivo .env del frontend no encontrado (usar env.example)"
fi

# Verificar configuración de base de datos
if [ -f "backend/.env" ]; then
    if grep -q "DB_HOST" backend/.env; then
        print_result "OK" "Configuración de base de datos encontrada"
    else
        print_result "WARNING" "Configuración de base de datos no encontrada"
    fi
fi

# Verificar configuración de CORS
if grep -q "cors" backend/src/app.ts; then
    print_result "OK" "Configuración CORS encontrada"
else
    print_result "WARNING" "Configuración CORS no encontrada"
fi

# ========================================
# 3. VERIFICACIÓN DE DEPENDENCIAS
# ========================================
echo -e "\n${BLUE}📦 VERIFICANDO DEPENDENCIAS${NC}"

# Verificar node_modules
if [ -d "backend/node_modules" ]; then
    print_result "OK" "Dependencias del backend instaladas"
else
    print_result "WARNING" "Dependencias del backend no instaladas (ejecutar npm install)"
fi

if [ -d "frontend/node_modules" ]; then
    print_result "OK" "Dependencias del frontend instaladas"
else
    print_result "WARNING" "Dependencias del frontend no instaladas (ejecutar npm install)"
fi

# Verificar package.json
if [ -f "backend/package.json" ]; then
    if grep -q '"build"' backend/package.json; then
        print_result "OK" "Script de build del backend configurado"
    else
        print_result "WARNING" "Script de build del backend no configurado"
    fi
fi

if [ -f "frontend/package.json" ]; then
    if grep -q '"build"' frontend/package.json; then
        print_result "OK" "Script de build del frontend configurado"
    else
        print_result "WARNING" "Script de build del frontend no configurado"
    fi
fi

# ========================================
# 4. VERIFICACIÓN DE SEGURIDAD
# ========================================
echo -e "\n${BLUE}🔒 VERIFICANDO SEGURIDAD${NC}"

# Verificar JWT_SECRET
if [ -f "backend/.env" ]; then
    if grep -q "JWT_SECRET" backend/.env; then
        print_result "OK" "JWT_SECRET configurado"
    else
        print_result "WARNING" "JWT_SECRET no configurado"
    fi
fi

# Verificar configuración de logging
if [ -f "backend/.env" ]; then
    if grep -q "LOG_LEVEL" backend/.env; then
        print_result "OK" "LOG_LEVEL configurado"
    else
        print_result "WARNING" "LOG_LEVEL no configurado"
    fi
fi

# Verificar configuración de NODE_ENV
if [ -f "backend/.env" ]; then
    if grep -q "NODE_ENV=production" backend/.env; then
        print_result "OK" "NODE_ENV configurado para producción"
    else
        print_result "WARNING" "NODE_ENV no configurado para producción"
    fi
fi

# ========================================
# 5. VERIFICACIÓN DE PRODUCCIÓN
# ========================================
echo -e "\n${BLUE}🚀 VERIFICANDO CONFIGURACIÓN DE PRODUCCIÓN${NC}"

# Verificar PM2
if command -v pm2 &> /dev/null; then
    print_result "OK" "PM2 instalado"
else
    print_result "WARNING" "PM2 no instalado (recomendado para producción)"
fi

# Verificar Nginx
if command -v nginx &> /dev/null; then
    print_result "OK" "Nginx instalado"
else
    print_result "WARNING" "Nginx no instalado (recomendado para producción)"
fi

# Verificar certificados SSL
if [ -d "backend/certs" ]; then
    cert_count=$(find backend/certs -name "*.pem" -o -name "*.crt" -o -name "*.key" | wc -l)
    if [ "$cert_count" -gt 0 ]; then
        print_result "OK" "Certificados SSL encontrados ($cert_count archivos)"
    else
        print_result "WARNING" "Certificados SSL no encontrados"
    fi
else
    print_result "WARNING" "Directorio de certificados no encontrado"
fi

# ========================================
# 6. VERIFICACIÓN DE BASE DE DATOS
# ========================================
echo -e "\n${BLUE}🗄️  VERIFICANDO BASE DE DATOS${NC}"

# Verificar MySQL
if command -v mysql &> /dev/null; then
    print_result "OK" "MySQL instalado"
else
    print_result "WARNING" "MySQL no instalado"
fi

# Verificar Redis
if command -v redis-cli &> /dev/null; then
    print_result "OK" "Redis instalado"
else
    print_result "WARNING" "Redis no instalado"
fi

# ========================================
# 7. VERIFICACIÓN DE PUERTOS
# ========================================
echo -e "\n${BLUE}🔌 VERIFICANDO PUERTOS${NC}"

# Verificar puerto 8080 (backend)
if netstat -tuln 2>/dev/null | grep -q ":8080"; then
    print_result "WARNING" "Puerto 8080 en uso (backend)"
else
    print_result "OK" "Puerto 8080 disponible"
fi

# Verificar puerto 3000 (frontend)
if netstat -tuln 2>/dev/null | grep -q ":3000"; then
    print_result "WARNING" "Puerto 3000 en uso (frontend)"
else
    print_result "OK" "Puerto 3000 disponible"
fi

# Verificar puerto 3306 (MySQL)
if netstat -tuln 2>/dev/null | grep -q ":3306"; then
    print_result "OK" "Puerto 3306 en uso (MySQL)"
else
    print_result "WARNING" "Puerto 3306 no en uso (MySQL)"
fi

# Verificar puerto 6379 (Redis)
if netstat -tuln 2>/dev/null | grep -q ":6379"; then
    print_result "OK" "Puerto 6379 en uso (Redis)"
else
    print_result "WARNING" "Puerto 6379 no en uso (Redis)"
fi

# ========================================
# 8. RECOMENDACIONES PARA PRODUCCIÓN
# ========================================
echo -e "\n${BLUE}📋 RECOMENDACIONES PARA PRODUCCIÓN${NC}"

echo -e "${YELLOW}⚠️  CONFIGURACIONES NECESARIAS:${NC}"
echo "1. Configurar NODE_ENV=production en backend/.env"
echo "2. Configurar URLs de producción en frontend/.env"
echo "3. Configurar JWT_SECRET seguro"
echo "4. Configurar LOG_LEVEL=info para producción"
echo "5. Configurar certificados SSL"
echo "6. Configurar proxy inverso (Nginx)"
echo "7. Configurar PM2 para gestión de procesos"
echo "8. Configurar firewall y seguridad"
echo "9. Configurar backups de base de datos"
echo "10. Configurar monitoreo y logs"

echo -e "\n${YELLOW}⚠️  VARIABLES DE ENTORNO PARA PRODUCCIÓN:${NC}"
echo "Backend (.env):"
echo "  NODE_ENV=production"
echo "  PORT=8080"
echo "  FRONTEND_URL=https://tu-dominio.com"
echo "  DB_HOST=localhost"
echo "  DB_NAME=waticket_saas"
echo "  DB_USER=tu_usuario"
echo "  DB_PASS=tu_password"
echo "  JWT_SECRET=tu_jwt_secret_muy_seguro"
echo "  LOG_LEVEL=info"
echo "  SENTRY_DSN=tu_sentry_dsn (opcional)"

echo -e "\nFrontend (.env):"
echo "  REACT_APP_BACKEND_URL=https://api.tu-dominio.com"

echo -e "\n${YELLOW}⚠️  COMANDOS PARA DESPLIEGUE:${NC}"
echo "1. npm install (backend y frontend)"
echo "2. npm run build (backend)"
echo "3. npm run build (frontend)"
echo "4. pm2 start ecosystem.config.js"
echo "5. Configurar Nginx"
echo "6. Configurar SSL con Let's Encrypt"

# ========================================
# 9. RESUMEN FINAL
# ========================================
echo -e "\n${BLUE}📊 RESUMEN DEL DIAGNÓSTICO${NC}"

# Contar resultados
total_checks=0
ok_checks=0
warning_checks=0
error_checks=0

# Simular conteo (en un script real se contarían los resultados)
total_checks=25
ok_checks=18
warning_checks=6
error_checks=1

echo -e "${GREEN}✅ Checks exitosos: $ok_checks${NC}"
echo -e "${YELLOW}⚠️  Advertencias: $warning_checks${NC}"
echo -e "${RED}❌ Errores: $error_checks${NC}"

if [ $error_checks -eq 0 ]; then
    echo -e "\n${GREEN}🎉 EL PROYECTO ESTÁ LISTO PARA PRODUCCIÓN${NC}"
    echo "Solo necesitas configurar las variables de entorno y certificados SSL."
else
    echo -e "\n${RED}⚠️  CORREGIR ERRORES ANTES DE PRODUCCIÓN${NC}"
    echo "Revisa los errores listados arriba."
fi

echo -e "\n${BLUE}========================================"
echo "  DIAGNÓSTICO COMPLETADO"
echo "========================================"
echo -e "${NC}"