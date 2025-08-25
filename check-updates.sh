#!/bin/bash

# Script para verificar actualizaciones del sistema WATOOLX
# Este script verifica si hay nuevos commits disponibles en el repositorio remoto

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

# Función para verificar si estamos en un repositorio git
check_git_repo() {
    if [ ! -d ".git" ]; then
        print_message "❌ Error: No se encontró un repositorio git en el directorio actual" $RED
        exit 1
    fi
}

# Función para verificar la configuración de autenticación
check_auth_config() {
    print_message "🔐 Verificando configuración de autenticación..." $BLUE
    
    # Verificar si hay un remote configurado
    if ! git remote get-url origin > /dev/null 2>&1; then
        print_message "❌ Error: No se encontró un remote 'origin' configurado" $RED
        print_message "   Ejecuta: git remote add origin <URL_DEL_REPOSITORIO>" $RED
        exit 1
    fi
    
    REMOTE_URL=$(git remote get-url origin)
    print_message "📍 Remote URL: ${REMOTE_URL:0:50}..." $BLUE
    
    # Verificar si la URL contiene un token (para repositorios privados)
    if [[ $REMOTE_URL == *"github_pat_"* ]] || [[ $REMOTE_URL == *"ghp_"* ]]; then
        print_message "✅ Token de autenticación detectado" $GREEN
        AUTH_CONFIGURED=true
    else
        print_message "⚠️  No se detectó token de autenticación" $YELLOW
        print_message "   Para repositorios privados, necesitas configurar un token de acceso personal" $YELLOW
        print_message "" $YELLOW
        print_message "📋 INSTRUCCIONES PARA CONFIGURAR TOKEN:" $YELLOW
        print_message "   1. Ve a GitHub.com → Settings → Developer settings → Personal access tokens" $YELLOW
        print_message "   2. Genera un nuevo token con permisos 'repo'" $YELLOW
        print_message "   3. Ejecuta: git remote set-url origin https://TOKEN@github.com/USER/REPO.git" $YELLOW
        print_message "   4. O configura el token en las credenciales de Git" $YELLOW
        print_message "" $YELLOW
        AUTH_CONFIGURED=false
    fi
}

# Función para verificar el estado actual
check_current_status() {
    print_message "🔍 Verificando estado actual del repositorio..." $BLUE
    
    # Obtener rama actual
    CURRENT_BRANCH=$(git branch --show-current)
    print_message "📍 Rama actual: $CURRENT_BRANCH" $BLUE
    
    # Obtener commit actual
    CURRENT_COMMIT=$(git rev-parse HEAD)
    CURRENT_COMMIT_SHORT=$(git rev-parse --short HEAD)
    print_message "🔗 Commit actual: $CURRENT_COMMIT_SHORT" $BLUE
    
    # Obtener información del commit actual
    CURRENT_MESSAGE=$(git log -1 --pretty=format:"%s")
    CURRENT_AUTHOR=$(git log -1 --pretty=format:"%an")
    CURRENT_DATE=$(git log -1 --pretty=format:"%ad" --date=short)
    
    print_message "📝 Mensaje: $CURRENT_MESSAGE" $BLUE
    print_message "👤 Autor: $CURRENT_AUTHOR" $BLUE
    print_message "📅 Fecha: $CURRENT_DATE" $BLUE
}

# Función para verificar actualizaciones
check_updates() {
    print_message "🔄 Verificando actualizaciones disponibles..." $YELLOW
    
    # Si no hay autenticación configurada, mostrar advertencia
    if [ "$AUTH_CONFIGURED" = false ]; then
        print_message "⚠️  ADVERTENCIA: No se puede verificar actualizaciones sin autenticación" $YELLOW
        print_message "   El repositorio es privado y requiere un token de acceso personal" $YELLOW
        print_message "" $YELLOW
        print_message "🔧 SOLUCIÓN RÁPIDA:" $YELLOW
        print_message "   Ejecuta este comando reemplazando TOKEN, USER y REPO:" $YELLOW
        print_message "   git remote set-url origin https://TOKEN@github.com/USER/REPO.git" $YELLOW
        print_message "" $YELLOW
        print_message "   Ejemplo:" $YELLOW
        print_message "   git remote set-url origin https://ghp_1234567890abcdef@github.com/leopoldohuacasiv/sturt-wha-icket.git" $YELLOW
        return 1
    fi
    
    # Fetch de cambios remotos con manejo de errores
    if ! git fetch origin > /dev/null 2>&1; then
        print_message "❌ Error: No se pudo conectar al repositorio remoto" $RED
        print_message "   Posibles causas:" $RED
        print_message "   - Token de acceso expirado o inválido" $RED
        print_message "   - Sin conexión a internet" $RED
        print_message "   - Repositorio privado sin permisos" $RED
        print_message "" $RED
        print_message "🔧 SOLUCIÓN:" $RED
        print_message "   1. Verifica tu conexión a internet" $RED
        print_message "   2. Regenera el token de acceso personal en GitHub" $RED
        print_message "   3. Actualiza la URL del remote con el nuevo token" $RED
        exit 1
    fi
    
    # Contar commits por delante
    COMMITS_AHEAD=$(git rev-list HEAD..origin/$CURRENT_BRANCH --count)
    
    if [ "$COMMITS_AHEAD" -gt 0 ]; then
        print_message "✅ Se encontraron $COMMITS_AHEAD actualizaciones disponibles!" $GREEN
        
        # Obtener información del último commit remoto
        LATEST_COMMIT=$(git rev-parse origin/$CURRENT_BRANCH)
        LATEST_COMMIT_SHORT=$(git rev-parse --short origin/$CURRENT_BRANCH)
        LATEST_MESSAGE=$(git log origin/$CURRENT_BRANCH -1 --pretty=format:"%s")
        LATEST_AUTHOR=$(git log origin/$CURRENT_BRANCH -1 --pretty=format:"%an")
        LATEST_DATE=$(git log origin/$CURRENT_BRANCH -1 --pretty=format:"%ad" --date=short)
        
        print_message "🆕 Última versión disponible:" $GREEN
        print_message "   🔗 Commit: $LATEST_COMMIT_SHORT" $GREEN
        print_message "   📝 Mensaje: $LATEST_MESSAGE" $GREEN
        print_message "   👤 Autor: $LATEST_AUTHOR" $GREEN
        print_message "   📅 Fecha: $LATEST_DATE" $GREEN
        
        # Verificar si hay cambios locales
        LOCAL_CHANGES=$(git status --porcelain)
        if [ -n "$LOCAL_CHANGES" ]; then
            print_message "⚠️  ADVERTENCIA: Hay cambios locales sin commitear" $YELLOW
            print_message "   Se recomienda hacer commit o stash de los cambios antes de actualizar" $YELLOW
        fi
        
        return 0
    else
        print_message "✅ El sistema está actualizado. No hay nuevas versiones disponibles." $GREEN
        return 1
    fi
}

# Función principal
main() {
    print_message "🚀 WATOOLX - Verificador de Actualizaciones" $BLUE
    print_message "=============================================" $BLUE
    
    # Verificar si estamos en un repositorio git
    check_git_repo
    
    # Verificar configuración de autenticación
    check_auth_config
    
    echo ""
    
    # Verificar estado actual
    check_current_status
    
    echo ""
    
    # Verificar actualizaciones
    if check_updates; then
        print_message "🎯 Resumen: Hay actualizaciones disponibles" $GREEN
        exit 0
    else
        print_message "🎯 Resumen: Sistema actualizado" $BLUE
        exit 1
    fi
}

# Ejecutar función principal
main "$@"
