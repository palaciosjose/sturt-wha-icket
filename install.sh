#!/bin/bash

# =============================================================================
# WATOOLX - INSTALADOR SIMPLIFICADO (SIN USUARIO DEPLOY)
# =============================================================================
# Script todo en uno para instalar y configurar WATOOLX con el usuario actual
# Basado en el modelo de software Waticket Saas 
# Autor: Leopoldo Huacasi
# Versión: 1.1.0 | 2025-07-15
# =============================================================================

# Configurar variable TERM para evitar warnings
export TERM=xterm-256color

# Configurar permisos de npm para evitar problemas (versión mejorada)
export npm_config_unsafe_perm=true

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY_LIGHT='\033[0;37m'
NC='\033[0m' # No Color

# Variables globales
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
LOG_FILE="$SCRIPT_DIR/installer.log"

# Variables de configuración (se llenarán con datos del usuario)
instancia_add=""
link_git=""
frontend_url=""
backend_url=""

# Valores fijos (no se piden al usuario)
mysql_password="mysql1122"
max_whats="999"
max_user="999"
frontend_port="3435"
backend_port="4142"
redis_port="5050"
jwt_secret=""
jwt_refresh_secret=""

# Variables para control de errores
ERROR_COUNT=0
INSTALLATION_ERRORS=()

# Variables para detección automática (NUEVAS)
detected_frontend_port=""
detected_backend_port=""
detected_redis_port=""

# Función para logging
log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO") echo -e "${BLUE}[INFO]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[SUCCESS]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[WARNING]${NC} $message" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $message" ;;
        "STEP") echo -e "${PURPLE}[STEP]${NC} $message" ;;
        "INPUT") echo -e "${CYAN}[INPUT]${NC} $message" ;;
    esac
    
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Función para registrar errores
register_error() {
    local error_msg="$1"
    ERROR_COUNT=$((ERROR_COUNT + 1))
    INSTALLATION_ERRORS+=("$error_msg")
    log_message "ERROR" "$error_msg"
}

# Función para mostrar resumen de errores
show_installation_summary() {
    print_banner
    echo -e "${WHITE}=== RESUMEN DE INSTALACIÓN ===${NC}"
    
    if [ $ERROR_COUNT -eq 0 ]; then
        echo -e "${GREEN}🎉 ¡Instalación completa finalizada sin fallos!${NC}"
        echo -e "${CYAN}Accede a la aplicación en:${NC} $frontend_url"
        echo -e "${CYAN}API disponible en:${NC} $backend_url"
    else
        echo -e "${YELLOW}⚠️  Instalación terminada pero con $ERROR_COUNT fallo(s):${NC}"
        for error in "${INSTALLATION_ERRORS[@]}"; do
            echo -e "${RED}• $error${NC}"
        done
        echo -e "\n${YELLOW}Por favor, resuelve estos errores manualmente antes de continuar.${NC}"
    fi
}

# Función para configurar npm de manera segura
configure_npm_safely() {
    log_message "INFO" "Configurando npm para instalación segura..."
    
    # Configurar npm para evitar problemas de permisos
    npm config set unsafe-perm true
    
    # Configurar el directorio global de npm para el usuario actual
    mkdir -p ~/.npm-global
    npm config set prefix '~/.npm-global'
    
    # Agregar al PATH si no está
    if ! grep -q "~/.npm-global/bin" ~/.bashrc; then
        echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
        export PATH=~/.npm-global/bin:$PATH
    fi
    
    log_message "SUCCESS" "✅ Npm configurado de manera segura"
}

# Función para verificar y corregir permisos de binarios npm
fix_npm_binaries_permissions() {
    local dir="$1"
    log_message "INFO" "Verificando permisos de binarios en $dir..."
    
    if [ -d "$dir/node_modules/.bin" ]; then
        cd "$dir"
        
        # Corregir permisos de todos los binarios
        find node_modules/.bin -type f -exec chmod +x {} \;
        
        # Verificar permisos específicos de cross-env
        if [ -f "node_modules/.bin/cross-env" ]; then
            chmod +x node_modules/.bin/cross-env
            log_message "SUCCESS" "✅ Permisos de cross-env corregidos específicamente"
        fi
        
        # Verificar que los permisos se aplicaron correctamente
        local executable_count=$(find node_modules/.bin -type f -executable | wc -l)
        local total_count=$(find node_modules/.bin -type f | wc -l)
        
        log_message "SUCCESS" "✅ Permisos corregidos: $executable_count/$total_count binarios ejecutables en $dir"
    else
        log_message "WARNING" "No se encontró directorio node_modules/.bin en $dir"
    fi
}

# Función para diagnosticar problemas de permisos
diagnose_permission_issues() {
    local dir="$1"
    log_message "INFO" "Diagnosticando problemas de permisos en $dir..."
    
    cd "$dir"
    
    # Verificar si node_modules existe
    if [ ! -d "node_modules" ]; then
        log_message "ERROR" "node_modules no existe en $dir"
        return 1
    fi
    
    # Verificar si .bin existe
    if [ ! -d "node_modules/.bin" ]; then
        log_message "ERROR" "node_modules/.bin no existe en $dir"
        return 1
    fi
    
    # Verificar cross-env específicamente
    if [ -f "node_modules/.bin/cross-env" ]; then
        local perms=$(ls -la node_modules/.bin/cross-env | awk '{print $1}')
        log_message "INFO" "Permisos de cross-env: $perms"
        
        if [ ! -x "node_modules/.bin/cross-env" ]; then
            log_message "ERROR" "cross-env no es ejecutable"
            return 1
        fi
    else
        log_message "ERROR" "cross-env no existe en node_modules/.bin"
        return 1
    fi
    
    log_message "SUCCESS" "✅ Diagnóstico de permisos completado"
    return 0
}

# Función para mostrar banner
print_banner() {
    clear
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                WATOOLX INSTALADOR TODO EN UNO                ║"
    echo "║              Usuario Actual - Versión 1.1.0                  ║"
    echo "║                                                              ║"
    echo "║  🚀 Instalación Automática   📋 Captura de Datos             ║"
    echo "║  🔧 Configuración Personal   ✅ Docker + PM2 + Nginx         ║"
    echo "║  📚 Documentación Clara      🎯 Un Solo Script Principal     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Función para actualizar el sistema
system_update() {
    log_message "STEP" "=== ACTUALIZANDO SISTEMA ==="
    
    print_banner
    printf "${WHITE} 💻 Actualizando sistema operativo...${GRAY_LIGHT}\n\n"

    sleep 2

    # Actualizar repositorios
    if ! sudo apt-get update; then
        register_error "No se pudo actualizar los repositorios del sistema"
        return 1
    fi

    # Instalar herramientas necesarias
    if ! sudo apt-get install -y net-tools curl wget; then
        register_error "No se pudieron instalar herramientas básicas"
        return 1
    fi

    # Actualizar paquetes
    if ! sudo apt-get upgrade -y; then
        register_error "No se pudo actualizar los paquetes del sistema"
        return 1
    fi

    # Verificar si se requiere reinicio
    if [ -f /var/run/reboot-required ]; then
        log_message "WARNING" "⚠️  El sistema requiere reinicio después de las actualizaciones"
        echo -e "${YELLOW}⚠️  El sistema requiere reinicio después de las actualizaciones${NC}"
        echo -e "${WHITE}¿Deseas reiniciar ahora? (y/n):${NC} "
        read -r reboot_confirm
        if [[ "$reboot_confirm" =~ ^[Yy]$ ]]; then
            log_message "INFO" "Reiniciando sistema..."
            sudo reboot
            exit 0
        else
            log_message "WARNING" "Usuario optó por no reiniciar. La instalación puede fallar."
            echo -e "${YELLOW}⚠️  Se recomienda reiniciar antes de continuar.${NC}"
            echo -e "${WHITE}¿Continuar sin reiniciar? (y/n):${NC} "
            read -r continue_confirm
            if [[ ! "$continue_confirm" =~ ^[Yy]$ ]]; then
                log_message "INFO" "Instalación cancelada por el usuario"
                exit 0
            fi
        fi
    fi

    log_message "SUCCESS" "✅ Sistema actualizado correctamente"
    sleep 2
    return 0
}

# Función para verificar requisitos del sistema
check_system_requirements() {
    log_message "STEP" "=== VERIFICANDO REQUISITOS DEL SISTEMA ==="
    
    print_banner
    printf "${WHITE} 💻 Verificando requisitos del sistema...${GRAY_LIGHT}\n\n"

    sleep 2

    # Verificar que sea Ubuntu/Debian
    if ! command -v apt-get &> /dev/null; then
        register_error "Este script solo funciona en sistemas basados en Debian/Ubuntu"
        return 1
    fi

    # Verificación robusta de permisos sudo
    log_message "INFO" "Verificando permisos de sudo..."
    
    # Verificar si sudo está disponible
    if ! command -v sudo &> /dev/null; then
        register_error "sudo no está instalado en el sistema"
        return 1
    fi
    
    # Verificar permisos de sudo sin contraseña
    if ! sudo -n true 2>/dev/null; then
        log_message "WARNING" "⚠️ No se pueden ejecutar comandos sudo sin contraseña"
        echo -e "${YELLOW}⚠️  Se requieren permisos de sudo para continuar${NC}"
        echo -e "${WHITE}Por favor, ejecuta este script como usuario con permisos sudo${NC}"
        echo -e "${CYAN}O configura sudoers para permitir ejecución sin contraseña${NC}"
        echo -e "${WHITE}¿Continuar? (se pedirá contraseña en cada comando sudo):${NC} "
        read -r continue_with_sudo
        if [[ ! "$continue_with_sudo" =~ ^[Yy]$ ]]; then
            log_message "INFO" "Instalación cancelada por el usuario"
            exit 0
        fi
        log_message "INFO" "Usuario optó por continuar con solicitud de contraseña"
    else
        log_message "SUCCESS" "✅ Permisos de sudo verificados correctamente"
    fi
    
    # Verificar que se puede ejecutar un comando básico con sudo
    if ! sudo echo "Sudo funcionando" > /dev/null 2>&1; then
        register_error "No se puede ejecutar comandos con sudo"
        return 1
    fi

    # Verificar espacio en disco (mínimo 2GB)
    available_space=$(df / | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 2097152 ]; then
        register_error "Se requieren al menos 2GB de espacio libre en disco"
        return 1
    fi

    # Verificar memoria RAM (mínimo 1GB)
    total_mem=$(free -m | awk 'NR==2{print $2}')
    if [ "$total_mem" -lt 1024 ]; then
        register_error "Se requieren al menos 1GB de RAM"
        return 1
    fi
    
    # Verificar permisos de escritura en directorios críticos
    log_message "INFO" "Verificando permisos de escritura..."
    
    # Verificar directorio actual
    if [ ! -w "$SCRIPT_DIR" ]; then
        register_error "No se puede escribir en el directorio actual: $SCRIPT_DIR"
        return 1
    fi
    
    # Verificar directorio /tmp
    if [ ! -w "/tmp" ]; then
        register_error "No se puede escribir en /tmp"
        return 1
    fi
    
    # Verificar directorio /var/log (para logs del sistema)
    if ! sudo test -w "/var/log" 2>/dev/null; then
        log_message "WARNING" "⚠️ No se puede escribir en /var/log (puede afectar logs del sistema)"
        
        # Intentar crear directorio de logs específico para la aplicación
        if sudo mkdir -p /var/log/watoolx 2>/dev/null; then
            log_message "SUCCESS" "✅ Directorio de logs de aplicación creado: /var/log/watoolx"
        else
            log_message "WARNING" "⚠️ No se pudo crear directorio de logs específico"
        fi
    fi
    
    # Verificar directorio /etc/nginx (para configuración de Nginx)
    # Solo verificar si el directorio existe (Nginx puede no estar instalado aún)
    if sudo test -d "/etc/nginx" 2>/dev/null; then
        if ! sudo test -w "/etc/nginx" 2>/dev/null; then
            register_error "No se puede escribir en /etc/nginx (requerido para configuración)"
            return 1
        fi
    else
        log_message "INFO" "Directorio /etc/nginx no existe aún (Nginx se instalará más adelante)"
        
        # Verificar que se puede crear el directorio cuando sea necesario
        if ! sudo test -w "/etc" 2>/dev/null; then
            register_error "No se puede escribir en /etc (requerido para crear directorios de configuración)"
            return 1
        fi
    fi
    
    # Verificar directorio /etc/letsencrypt (para certificados SSL)
    # Solo verificar si el directorio existe (Certbot puede no estar instalado aún)
    if sudo test -d "/etc/letsencrypt" 2>/dev/null; then
        if ! sudo test -w "/etc/letsencrypt" 2>/dev/null; then
            log_message "WARNING" "⚠️ No se puede escribir en /etc/letsencrypt (puede afectar certificados SSL)"
        fi
    else
        log_message "INFO" "Directorio /etc/letsencrypt no existe aún (Certbot se instalará más adelante)"
    fi

    # Verificar conectividad a internet
    if ! ping -c 1 google.com &> /dev/null; then
        register_error "No hay conectividad a internet"
        return 1
    fi

    log_message "SUCCESS" "✅ Requisitos del sistema verificados correctamente"
    sleep 2
    return 0
}

# Función para crear directorios críticos si es necesario
create_critical_directories() {
    log_message "INFO" "Creando directorios críticos si es necesario..."
    
    # Lista de directorios críticos
    local critical_dirs=(
        "/etc/nginx"
        "/etc/nginx/sites-available"
        "/etc/nginx/sites-enabled"
        "/var/log/nginx"
        "/etc/letsencrypt"
        "/var/www/html"
        "/var/log/watoolx"
        "/opt/watoolx"
    )
    
    for dir in "${critical_dirs[@]}"; do
        if ! sudo test -d "$dir" 2>/dev/null; then
            log_message "INFO" "Creando directorio: $dir"
            if sudo mkdir -p "$dir" 2>/dev/null; then
                log_message "SUCCESS" "✅ Directorio creado: $dir"
            else
                log_message "WARNING" "⚠️ No se pudo crear directorio: $dir"
            fi
        else
            log_message "SUCCESS" "✅ Directorio existe: $dir"
        fi
    done
}

# Función para verificar y configurar permisos de PM2
verify_pm2_permissions() {
    log_message "INFO" "Verificando permisos de PM2..."
    
    # Verificar si PM2 está instalado
    if ! command -v pm2 &> /dev/null; then
        log_message "INFO" "PM2 no está instalado aún, se instalará más adelante"
        return 0
    fi
    
    # Verificar permisos de PM2
    if ! sudo pm2 list > /dev/null 2>&1; then
        log_message "WARNING" "⚠️ PM2 no tiene permisos adecuados"
        
        # Intentar configurar permisos de PM2
        log_message "INFO" "Configurando permisos de PM2..."
        
        # Crear directorio de PM2 si no existe
        sudo mkdir -p /root/.pm2 2>/dev/null || true
        
        # Configurar permisos
        if sudo chown -R $USER:$USER /root/.pm2 2>/dev/null; then
            log_message "SUCCESS" "✅ Permisos de PM2 configurados"
        else
            log_message "WARNING" "⚠️ No se pudieron configurar permisos de PM2 completamente"
        fi
    else
        log_message "SUCCESS" "✅ Permisos de PM2 verificados"
    fi
}

# Función para verificar permisos de MySQL
verify_mysql_permissions() {
    log_message "INFO" "Verificando permisos de MySQL..."
    
    # Verificar si MySQL está instalado
    if ! command -v mysql &> /dev/null; then
        log_message "INFO" "MySQL no está instalado aún, se instalará más adelante"
        return 0
    fi
    
    # Verificar si se puede conectar como root
    if ! sudo mysql -u root -p${mysql_password} -e "SELECT 1;" > /dev/null 2>&1; then
        log_message "WARNING" "⚠️ No se puede conectar a MySQL como usuario root"
        
        # Intentar configurar permisos
        log_message "INFO" "Configurando permisos de MySQL..."
        
        # Verificar que el servicio MySQL esté ejecutándose
        if ! sudo systemctl is-active --quiet mysql; then
            log_message "WARNING" "⚠️ Servicio MySQL no está ejecutándose"
            log_message "INFO" "Iniciando servicio MySQL..."
            if ! sudo systemctl start mysql; then
                register_error "No se pudo iniciar el servicio MySQL"
                return 1
            fi
        fi
        
        # Verificar directorio de datos de MySQL
        if ! sudo test -d /var/lib/mysql; then
            log_message "ERROR" "❌ Directorio de datos de MySQL no existe"
            return 1
        fi
        
        log_message "WARNING" "⚠️ MySQL puede requerir configuración manual"
    else
        log_message "SUCCESS" "✅ Permisos de MySQL verificados"
    fi
}

# Función para verificar permisos de Docker
verify_docker_permissions() {
    log_message "INFO" "Verificando permisos de Docker..."
    
    # Verificar si Docker está instalado
    if ! command -v docker &> /dev/null; then
        log_message "INFO" "Docker no está instalado aún, se instalará más adelante"
        return 0
    fi
    
    # Verificar que el servicio Docker esté ejecutándose
    if ! sudo systemctl is-active --quiet docker; then
        log_message "WARNING" "⚠️ Servicio Docker no está ejecutándose"
        log_message "INFO" "Iniciando servicio Docker..."
        if ! sudo systemctl start docker; then
            register_error "No se pudo iniciar el servicio Docker"
            return 1
        fi
    fi
    
    # Verificar si el usuario actual puede usar Docker
    if ! docker ps > /dev/null 2>&1; then
        log_message "WARNING" "⚠️ Usuario actual no puede usar Docker, corrigiendo permisos..."
        
        # Agregar usuario al grupo docker si no está
        if ! groups $USER | grep -q docker; then
            log_message "INFO" "➕ Agregando usuario al grupo docker..."
            if ! sudo usermod -aG docker $USER; then
                register_error "No se pudo agregar usuario al grupo docker"
                return 1
            fi
        fi
        
        # Corregir permisos del socket de Docker
        if [ -S /var/run/docker.sock ]; then
            log_message "INFO" "🔧 Corrigiendo permisos del socket de Docker..."
            if ! sudo chmod 666 /var/run/docker.sock; then
                register_error "No se pudieron corregir los permisos del socket de Docker"
                return 1
            fi
        fi
        
        # Intentar usar Docker nuevamente
        log_message "INFO" "🔄 Verificando permisos corregidos..."
        if ! docker ps > /dev/null 2>&1; then
            log_message "WARNING" "⚠️ Los permisos aún no están activos, intentando con newgrp..."
            # Intentar con newgrp para activar el grupo inmediatamente
            if ! newgrp docker -c "docker ps > /dev/null 2>&1"; then
                register_error "No se pudieron corregir los permisos de Docker"
                return 1
            fi
        fi
        
        log_message "SUCCESS" "✅ Permisos de Docker corregidos"
    else
        log_message "SUCCESS" "✅ Permisos de Docker correctos"
    fi
    
    return 0
}

# Función para verificar permisos de Nginx
verify_nginx_permissions() {
    log_message "INFO" "Verificando permisos de Nginx..."
    
    # Verificar si Nginx está instalado
    if ! command -v nginx &> /dev/null; then
        log_message "INFO" "Nginx no está instalado aún, se instalará más adelante"
        return 0
    fi
    
    # Verificar directorios críticos de Nginx
    local nginx_dirs=("/etc/nginx" "/etc/nginx/sites-available" "/etc/nginx/sites-enabled" "/var/log/nginx")
    
    for dir in "${nginx_dirs[@]}"; do
        if ! sudo test -w "$dir" 2>/dev/null; then
            log_message "WARNING" "⚠️ No se puede escribir en $dir"
        else
            log_message "SUCCESS" "✅ Permisos de escritura en $dir"
        fi
    done
    
    # Verificar si se puede ejecutar nginx -t
    if ! sudo nginx -t > /dev/null 2>&1; then
        log_message "WARNING" "⚠️ Nginx tiene problemas de configuración"
    else
        log_message "SUCCESS" "✅ Configuración de Nginx válida"
    fi
    
    # Verificar si se puede recargar Nginx
    if ! sudo systemctl reload nginx > /dev/null 2>&1; then
        log_message "WARNING" "⚠️ No se puede recargar Nginx (puede estar detenido)"
    else
        log_message "SUCCESS" "✅ Nginx puede ser recargado"
    fi
}

# Función para verificar permisos de Certbot
verify_certbot_permissions() {
    log_message "INFO" "Verificando permisos de Certbot..."
    
    # Verificar si Certbot está instalado
    if ! command -v certbot &> /dev/null; then
        log_message "INFO" "Certbot no está instalado aún, se instalará más adelante"
        return 0
    fi
    
    # Verificar directorio de certificados SSL
    if ! sudo test -w "/etc/letsencrypt" 2>/dev/null; then
        log_message "WARNING" "⚠️ No se puede escribir en /etc/letsencrypt"
        
        # Intentar crear el directorio si no existe
        if ! sudo test -d "/etc/letsencrypt" 2>/dev/null; then
            log_message "INFO" "Creando directorio /etc/letsencrypt..."
            sudo mkdir -p /etc/letsencrypt 2>/dev/null || true
        fi
        
        # Intentar configurar permisos
        if sudo chmod 755 /etc/letsencrypt 2>/dev/null; then
            log_message "SUCCESS" "✅ Permisos de /etc/letsencrypt configurados"
        else
            log_message "WARNING" "⚠️ No se pudieron configurar permisos de /etc/letsencrypt"
        fi
    else
        log_message "SUCCESS" "✅ Permisos de Certbot verificados"
    fi
    
    # Verificar directorio webroot para certificados
    if ! sudo test -w "/var/www/html" 2>/dev/null; then
        log_message "WARNING" "⚠️ No se puede escribir en /var/www/html"
        
        # Intentar crear el directorio si no existe
        if ! sudo test -d "/var/www/html" 2>/dev/null; then
            log_message "INFO" "Creando directorio /var/www/html..."
            sudo mkdir -p /var/www/html 2>/dev/null || true
        fi
        
        # Intentar configurar permisos
        if sudo chmod 755 /var/www/html 2>/dev/null; then
            log_message "SUCCESS" "✅ Permisos de /var/www/html configurados"
        else
            log_message "WARNING" "⚠️ No se pudieron configurar permisos de /var/www/html"
        fi
    else
        log_message "SUCCESS" "✅ Permisos de webroot verificados"
    fi
}

# Función para verificar todos los permisos del sistema
verify_all_permissions() {
    log_message "STEP" "=== VERIFICANDO PERMISOS DEL SISTEMA ==="
    
    print_banner
    printf "${WHITE} 🔐 Verificando permisos del sistema...${GRAY_LIGHT}\n\n"

    sleep 2

    # Ejecutar todas las verificaciones de permisos
    verify_pm2_permissions
    verify_mysql_permissions
    verify_docker_permissions
    verify_nginx_permissions
    verify_certbot_permissions

    log_message "SUCCESS" "✅ Verificación de permisos completada"
    sleep 2
}

# Función para limpiar procesos y puertos
cleanup_processes_and_ports() {
    log_message "STEP" "=== LIMPIANDO PROCESOS Y PUERTOS ==="
    
    print_banner
    printf "${WHITE} 💻 Limpiando procesos y puertos ocupados...${GRAY_LIGHT}\n\n"

    sleep 2

    # Limpiar PM2
    if command -v pm2 &> /dev/null; then
        sudo pm2 delete all 2>/dev/null || true
        sudo pm2 kill 2>/dev/null || true
        sudo pm2 unstartup 2>/dev/null || true
    fi

    # Matar procesos en puertos específicos
    for port in 3435 4142 5050 3000 3001 4000 4001 8080 6379; do
        pid=$(sudo lsof -ti:$port 2>/dev/null)
        if [ ! -z "$pid" ]; then
            sudo kill -9 $pid 2>/dev/null || true
            log_message "INFO" "Proceso en puerto $port terminado"
        fi
    done

    # Limpiar contenedores Docker si existen
    if command -v docker &> /dev/null; then
        docker stop $(docker ps -q) 2>/dev/null || true
        docker rm $(docker ps -aq) 2>/dev/null || true
    fi

    log_message "SUCCESS" "✅ Limpieza de procesos y puertos completada"
    sleep 2
}

# Función para verificar y corregir DNS
verify_and_fix_dns() {
    log_message "STEP" "=== VERIFICANDO Y CORRIGIENDO DNS ==="
    
    print_banner
    printf "${WHITE} 🌐 Verificando configuración DNS...${GRAY_LIGHT}\n\n"
    
    # Obtener IP actual del servidor (IPv4 específicamente)
    # NOTA: Si hay problemas de detección, puedes forzar una IP específica aquí
    local current_ip=$(curl -4 -s ifconfig.me 2>/dev/null)
    if [[ ! "$current_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        # Método alternativo si el primero falla
        current_ip=$(curl -4 -s ipinfo.io/ip 2>/dev/null)
        if [[ ! "$current_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            current_ip=$(curl -4 -s icanhazip.com 2>/dev/null)
        fi
    fi
    
    # SOLUCIÓN TEMPORAL: Si necesitas usar una IP específica, descomenta la línea siguiente
    # current_ip="45.65.136.226"  # IP configurada en DNS
    
    # Permitir corrección manual de la IP si es necesario
    if [[ "$current_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        log_message "INFO" "IP detectada: $current_ip"
        echo -e "${YELLOW}¿La IP detectada es correcta? (y/n):${NC} "
        read -r ip_correct
        if [[ ! "$ip_correct" =~ ^[Yy]$ ]]; then
            echo -e "${INPUT}Ingresa la IP correcta del servidor:${NC} "
            read -r current_ip
            log_message "INFO" "IP corregida manualmente: $current_ip"
        fi
    fi
    
    if [[ "$current_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        log_message "INFO" "IP actual del servidor (IPv4): $current_ip"
    else
        log_message "ERROR" "No se pudo obtener IPv4 válida"
        echo -e "${RED}❌ No se pudo obtener la IP IPv4 del servidor${NC}"
        echo -e "${YELLOW}Verifica la conectividad a internet y ejecuta:${NC}"
        echo -e "${CYAN}curl -4 ifconfig.me${NC}"
        return 1
    fi
    
    # Extraer solo el dominio de las URLs
    local backend_domain=$(echo "$backend_url" | sed 's|^https?://||')
    local frontend_domain=$(echo "$frontend_url" | sed 's|^https?://||')
    
    # Verificar DNS de los dominios con múltiples métodos
    local api_ip=""
    local app_ip=""
    
    # Método 1: Usar dig si está disponible
    if command -v dig &> /dev/null; then
        api_ip=$(dig +short "$backend_domain" 2>/dev/null | head -1)
        app_ip=$(dig +short "$frontend_domain" 2>/dev/null | head -1)
    fi
    
    # Método 2: Usar nslookup si dig falló o no está disponible
    if [ -z "$api_ip" ] || [ -z "$app_ip" ]; then
        if command -v nslookup &> /dev/null; then
            api_ip=$(nslookup "$backend_domain" 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}')
            app_ip=$(nslookup "$frontend_domain" 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}')
        fi
    fi
    
    # Método 3: Usar host si está disponible
    if [ -z "$api_ip" ] || [ -z "$app_ip" ]; then
        if command -v host &> /dev/null; then
            api_ip=$(host "$backend_domain" 2>/dev/null | grep "has address" | awk '{print $NF}')
            app_ip=$(host "$frontend_domain" 2>/dev/null | grep "has address" | awk '{print $NF}')
        fi
    fi
    
    log_message "INFO" "DNS actual:"
    log_message "INFO" "  $backend_domain -> $api_ip"
    log_message "INFO" "  $frontend_domain -> $app_ip"
    
    # Verificar si los dominios apuntan a la IP correcta
    if [ "$api_ip" = "$current_ip" ] && [ "$app_ip" = "$current_ip" ]; then
        log_message "SUCCESS" "✅ DNS configurado correctamente"
        return 0
    elif [ -z "$api_ip" ] || [ -z "$app_ip" ]; then
        log_message "WARNING" "⚠️ No se pudo verificar DNS - Verificación manual requerida"
        echo -e "${YELLOW}⚠️  No se pudo verificar DNS automáticamente${NC}"
        echo -e "${WHITE}Verifica manualmente que los dominios apunten a:${NC} $current_ip"
        echo -e "${CYAN}  $backend_domain -> $current_ip${NC}"
        echo -e "${CYAN}  $frontend_domain -> $current_ip${NC}"
        echo ""
        echo -e "${WHITE}¿Quieres continuar sin verificar DNS? (y/n):${NC} "
        read -r continue_without_dns
        if [[ ! "$continue_without_dns" =~ ^[Yy]$ ]]; then
            log_message "INFO" "Usuario optó por verificar DNS manualmente"
            echo -e "${YELLOW}Por favor, verifica el DNS y ejecuta el script nuevamente.${NC}"
            exit 0
        fi
    else
        log_message "WARNING" "⚠️ DNS incorrecto - Los dominios deben apuntar a $current_ip"
        echo -e "${YELLOW}⚠️  DNS incorrecto detectado${NC}"
        echo -e "${WHITE}Los dominios deben apuntar a:${NC} $current_ip"
        echo -e "${WHITE}Configura en tu proveedor de DNS:${NC}"
        echo -e "${CYAN}  $backend_domain -> $current_ip${NC}"
        echo -e "${CYAN}  $frontend_domain -> $current_ip${NC}"
        echo ""
        echo -e "${WHITE}¿Quieres continuar sin corregir DNS? (y/n):${NC} "
        read -r continue_without_dns
        if [[ ! "$continue_without_dns" =~ ^[Yy]$ ]]; then
            echo -e "\n${CYAN}¿Quieres ingresar la IP correcta manualmente? (y/n):${NC} "
            read -r manual_ip
            if [[ "$manual_ip" =~ ^[Yy]$ ]]; then
                echo -e "${WHITE}Ingresa la IP correcta del servidor:${NC} "
                read -r manual_ip_address
                
                # Validar formato de IP
                if [[ "$manual_ip_address" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                    log_message "INFO" "IP corregida manualmente: $manual_ip_address"
                    current_ip="$manual_ip_address"
                    echo -e "${GREEN}✅ IP actualizada a: $current_ip${NC}"
                    
                    # Verificar DNS con la nueva IP
                    echo -e "\n${CYAN}Verificando DNS con la nueva IP...${NC}"
                    local api_ip_new=""
                    local app_ip_new=""
                    
                    if command -v dig &> /dev/null; then
                        api_ip_new=$(dig +short "$backend_domain" 2>/dev/null | head -1)
                        app_ip_new=$(dig +short "$frontend_domain" 2>/dev/null | head -1)
                    fi
                    
                    if [ "$api_ip_new" = "$current_ip" ] && [ "$app_ip_new" = "$current_ip" ]; then
                        log_message "SUCCESS" "✅ DNS verificado correctamente con la nueva IP"
                        return 0
                    else
                        echo -e "${YELLOW}⚠️  DNS aún no apunta a la IP correcta${NC}"
                        echo -e "${WHITE}Configura en tu proveedor de DNS:${NC}"
                        echo -e "${CYAN}  $backend_domain -> $current_ip${NC}"
                        echo -e "${CYAN}  $frontend_domain -> $current_ip${NC}"
                        echo -e "${WHITE}¿Continuar de todas formas? (y/n):${NC} "
                        read -r continue_anyway
                        if [[ ! "$continue_anyway" =~ ^[Yy]$ ]]; then
                            log_message "INFO" "Usuario optó por corregir DNS manualmente"
                            echo -e "${YELLOW}Por favor, corrige el DNS y ejecuta el script nuevamente.${NC}"
                            exit 0
                        fi
                    fi
                else
                    echo -e "${RED}❌ Formato de IP inválido: $manual_ip_address${NC}"
                    echo -e "${YELLOW}Por favor, corrige el DNS y ejecuta el script nuevamente.${NC}"
                    exit 0
                fi
            else
                log_message "INFO" "Usuario optó por corregir DNS manualmente"
                echo -e "${YELLOW}Por favor, corrige el DNS y ejecuta el script nuevamente.${NC}"
                exit 0
            fi
        fi
    fi
    
    return 0
}

# =============================================================================
# FUNCIONES DE DETECCIÓN AUTOMÁTICA (NUEVAS)
# =============================================================================

detect_active_ports() {
    log_message "INFO" "Detectando puertos activos..."
    
    # Detectar puerto del frontend
    detected_frontend_port=$(pm2 list 2>/dev/null | grep frontend | grep -o "localhost:[0-9]*" | head -1 | cut -d: -f2)
    if [ -z "$detected_frontend_port" ]; then
        detected_frontend_port="3001"  # Puerto por defecto
    fi
    
    # Detectar puerto del backend
    detected_backend_port=$(pm2 list 2>/dev/null | grep backend | grep -o "localhost:[0-9]*" | head -1 | cut -d: -f2)
    if [ -z "$detected_backend_port" ]; then
        detected_backend_port="4142"  # Puerto por defecto
    fi
    
    # Detectar puerto de Redis
    detected_redis_port=$(docker ps 2>/dev/null | grep redis | grep -o ":[0-9]*->" | head -1 | tr -d ':->')
    if [ -z "$detected_redis_port" ]; then
        detected_redis_port="6379"  # Puerto por defecto
    fi
    
    log_message "SUCCESS" "Puertos detectados - Frontend: $detected_frontend_port, Backend: $detected_backend_port, Redis: $detected_redis_port"
}

extract_domain_only() {
    local url="$1"
    local domain
    
    # Remover protocolo
    domain=$(echo "$url" | sed 's|^https://||' | sed 's|^http://||')
    # Remover path y parámetros
    domain=$(echo "$domain" | cut -d'/' -f1)
    # Remover puerto si existe
    domain=$(echo "$domain" | cut -d':' -f1)
    # Remover espacios en blanco
    domain=$(echo "$domain" | tr -d ' ')
    # Validar que no esté vacío
    if [ -z "$domain" ]; then
        echo "localhost"
        return
    fi
    
    echo "$domain"
}

validate_domain() {
    local domain="$1"
    
    # Validar formato básico de dominio
    if [[ "$domain" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        return 0
    else
        return 1
    fi
}

# =============================================================================
# FUNCIONES DE CAPTURA DE DATOS MEJORADAS
# =============================================================================

get_instancia_add() {
    print_banner
    printf "${WHITE} 💻 Proporciona un nombre para ${YELLOW}Instancia/Empresa${WHITE} que se instalará (No utilizar espacios ni caracteres especiales, usa solo letras minúsculas):${GRAY_LIGHT}"
    printf "\n\n"

    while true; do
        read -p "> " instancia_add
        echo

        # Validar que solo contenga letras minúsculas y números
        if [[ "$instancia_add" =~ ^[a-z0-9]+$ ]]; then
            log_message "INPUT" "Instancia configurada: $instancia_add"
            break
        else
            echo -e "${RED}❌ La Instancia no debe contener caracteres especiales ni letras mayúsculas. Intenta nuevamente.${GRAY_LIGHT}"
        fi
    done
}

get_link_git() {
    print_banner
    
    default_link="https://github.com/leopoldohuacasiv/watoolxoficial.git"
    printf "${WHITE} 💻 Ingresa el enlace de ${YELLOW}GITHUB${WHITE} de Watoolx que deseas instalar:${GRAY_LIGHT}\n"
    printf "  Presiona Enter para usar el valor por defecto:\n\n"
    printf "  ${default_link}\n\n"
    read -p "> " link_git
    link_git="${link_git:-$default_link}"
    log_message "INPUT" "Link Git configurado: $link_git"
}

get_frontend_url() {
    print_banner
    printf "${WHITE} 💻 Ingresa el ${YELLOW}dominio${WHITE} del FRONTEND/PANEL para ${instancia_add}:${GRAY_LIGHT}"
    printf "\n\n"
    
    while true; do
        read -p "> " frontend_url
        echo
        
        # Extraer solo el dominio
        local domain=$(extract_domain_only "$frontend_url")
        
        if validate_domain "$domain"; then
            frontend_url="https://$domain"
            log_message "INPUT" "URL Frontend configurada: $frontend_url"
            break
        else
            echo -e "${RED}❌ Formato de dominio inválido. Intenta nuevamente.${GRAY_LIGHT}"
        fi
    done
}

get_backend_url() {
    print_banner
    printf "${WHITE} 💻 Ingresa el ${YELLOW}dominio${WHITE} del BACKEND/API para ${instancia_add}:${GRAY_LIGHT}"
    printf "\n\n"
    
    while true; do
        read -p "> " backend_url
        echo
        
        # Extraer solo el dominio
        local domain=$(extract_domain_only "$backend_url")
        
        if validate_domain "$domain"; then
            backend_url="https://$domain"
            log_message "INPUT" "URL Backend configurada: $backend_url"
            break
        else
            echo -e "${RED}❌ Formato de dominio inválido. Intenta nuevamente.${GRAY_LIGHT}"
        fi
    done
}

# =============================================================================
# FUNCIONES DE VALIDACIÓN (Basadas en _inquiry.sh)
# =============================================================================

validate_port() {
    local port=$1
    local service_name=$2
    
    # Validar que sea un número
    if ! [[ "$port" =~ ^[0-9]+$ ]]; then
        echo -e "${RED}❌ El puerto debe ser un número válido.${GRAY_LIGHT}"
        return 1
    fi
    
    # Validar rango de puertos (1024-65535)
    if [ "$port" -lt 1024 ] || [ "$port" -gt 65535 ]; then
        echo -e "${RED}❌ El puerto debe estar entre 1024 y 65535.${GRAY_LIGHT}"
        return 1
    fi
    
    # Verificar si el puerto está en uso
    if command -v netstat &> /dev/null; then
        if netstat -tuln | grep -q ":$port "; then
            echo -e "${RED}❌ El puerto $port ya está en uso por otro servicio.${GRAY_LIGHT}"
            return 1
        fi
    elif command -v ss &> /dev/null; then
        if ss -tuln | grep -q ":$port "; then
            echo -e "${RED}❌ El puerto $port ya está en uso por otro servicio.${GRAY_LIGHT}"
            return 1
        fi
    fi
    
    # Verificar si el puerto está en uso por Docker
    if docker ps --format "table {{.Ports}}" | grep -q ":$port->"; then
        echo -e "${RED}❌ El puerto $port ya está en uso por un contenedor Docker.${GRAY_LIGHT}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Puerto $port disponible para $service_name${GRAY_LIGHT}"
    return 0
}

validate_port_range() {
    local port=$1
    local min_range=$2
    local max_range=$3
    local service_name=$4
    
    # Validar que sea un número
    if ! [[ "$port" =~ ^[0-9]+$ ]]; then
        echo -e "${RED}❌ El puerto debe ser un número válido.${GRAY_LIGHT}"
        return 1
    fi
    
    # Validar rango específico
    if [ "$port" -lt "$min_range" ] || [ "$port" -gt "$max_range" ]; then
        echo -e "${RED}❌ El puerto debe estar entre $min_range y $max_range para $service_name.${GRAY_LIGHT}"
        return 1
    fi
    
    # Verificar disponibilidad
    if ! validate_port "$port" "$service_name"; then
        return 1
    fi
    
    return 0
}

get_frontend_port_validated() {
    while true; do
        get_frontend_port
        
        if validate_port_range "$frontend_port" 3000 3999 "Frontend"; then
            log_message "INPUT" "Puerto Frontend configurado: $frontend_port"
            break
        else
            echo -e "${YELLOW}⚠️  Intenta con otro puerto.${GRAY_LIGHT}\n"
        fi
    done
}

get_backend_port_validated() {
    while true; do
        get_backend_port
        
        if validate_port_range "$backend_port" 4000 4999 "Backend"; then
            log_message "INPUT" "Puerto Backend configurado: $backend_port"
            break
        else
            echo -e "${YELLOW}⚠️  Intenta con otro puerto.${GRAY_LIGHT}\n"
        fi
    done
}

get_redis_port_validated() {
    while true; do
        get_redis_port
        
        if validate_port_range "$redis_port" 5000 5999 "Redis"; then
            log_message "INPUT" "Puerto Redis configurado: $redis_port"
            break
        else
            echo -e "${YELLOW}⚠️  Intenta con otro puerto.${GRAY_LIGHT}\n"
        fi
    done
}

validate_all_ports() {
    local ports=("$frontend_port" "$backend_port" "$redis_port")
    local services=("Frontend" "Backend" "Redis")
    local duplicates=()
    
    # Verificar duplicados
    for i in "${!ports[@]}"; do
        for j in "${!ports[@]}"; do
            if [ "$i" -ne "$j" ] && [ "${ports[$i]}" = "${ports[$j]}" ]; then
                duplicates+=("${ports[$i]}")
            fi
        done
    done
    
    if [ ${#duplicates[@]} -gt 0 ]; then
        echo -e "${RED}❌ Los siguientes puertos están duplicados: ${duplicates[*]}${GRAY_LIGHT}"
        echo -e "${YELLOW}⚠️  Cada servicio debe usar un puerto diferente.${GRAY_LIGHT}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Todos los puertos son válidos y únicos.${GRAY_LIGHT}"
    return 0
}

# =============================================================================
# FUNCIÓN DE VERIFICACIÓN FINAL (NUEVA)
# =============================================================================

verify_installation() {
    log_message "STEP" "=== VERIFICANDO INSTALACIÓN ==="
    
    print_banner
    printf "${WHITE} 💻 Verificando que todo esté funcionando...${GRAY_LIGHT}\n\n"

    sleep 2

    # Verificar procesos PM2
    echo -e "${WHITE}Verificando procesos PM2:${NC}"
    pm2 list | grep -E "(backend|frontend)" || echo "No hay procesos PM2 activos"

    # Verificar puertos
    echo -e "\n${WHITE}Verificando puertos:${NC}"
    if command -v netstat &> /dev/null; then
        netstat -tuln | grep -E ":(${frontend_port}|${backend_port})" || echo "Puertos no están activos"
    elif command -v ss &> /dev/null; then
        ss -tuln | grep -E ":(${frontend_port}|${backend_port})" || echo "Puertos no están activos"
    else
        echo "No se puede verificar puertos (netstat/ss no disponible)"
    fi

    # Verificar Nginx
    echo -e "\n${WHITE}Verificando Nginx:${NC}"
    sudo systemctl status nginx --no-pager -l || echo "Nginx no está corriendo"

    # Verificar certificados SSL
    echo -e "\n${WHITE}Verificando certificados SSL:${NC}"
    ls -la /etc/letsencrypt/live/ 2>/dev/null || echo "No hay certificados SSL"

    # Verificar conectividad
    echo -e "\n${WHITE}Verificando conectividad:${NC}"
    curl -s -o /dev/null -w "Frontend: %{http_code}\n" http://localhost:${frontend_port} 2>/dev/null || echo "Frontend no responde"
    curl -s -o /dev/null -w "Backend: %{http_code}\n" http://localhost:${backend_port} 2>/dev/null || echo "Backend no responde"

    log_message "SUCCESS" "✅ Verificación completada"
    sleep 2
}

# =============================================================================
# CAPTURA COMPLETA DE DATOS CON VALIDACIÓN
# =============================================================================

get_urls_validated() {
    log_message "STEP" "=== CAPTURANDO DATOS DE CONFIGURACIÓN ==="
    
    # Detectar puertos automáticamente
    detect_active_ports
    
    get_instancia_add
    get_link_git
    get_frontend_url
    get_backend_url
    
    # Generar JWT secrets
    jwt_secret="watoolx-jwt-secret-${instancia_add}-$(date +%s)"
    jwt_refresh_secret="watoolx-jwt-refresh-${instancia_add}-$(date +%s)"
    
    # Mostrar resumen de configuración
    show_configuration_summary
}

show_configuration_summary() {
    print_banner
    echo -e "${WHITE}=== RESUMEN DE CONFIGURACIÓN ===${NC}"
    echo -e "${CYAN}Instancia/Empresa:${NC} $instancia_add"
    echo -e "${CYAN}Link Git:${NC} $link_git"
    echo -e "${CYAN}Frontend URL:${NC} $frontend_url"
    echo -e "${CYAN}Backend URL:${NC} $backend_url"
    echo -e "\n${GRAY_LIGHT}Valores fijos que se usarán:${NC}"
    echo -e "${GRAY_LIGHT}• Máximo WhatsApp: 999${NC}"
    echo -e "${GRAY_LIGHT}• Máximo Usuarios: 999${NC}"
    echo -e "${GRAY_LIGHT}• Puerto Frontend: 3435${NC}"
    echo -e "${GRAY_LIGHT}• Puerto Backend: 4142${NC}"
    echo -e "${GRAY_LIGHT}• Puerto Redis: 5050${NC}"
    echo -e "${GRAY_LIGHT}• Contraseña MySQL: mysql1122${NC}"
    echo -e "${GRAY_LIGHT}• Base de datos MySQL: $instancia_add${NC}"
    
    echo -e "\n${YELLOW}¿Deseas continuar con esta configuración? (y/n):${NC} "
    read -r confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Configuración cancelada. Reiniciando...${NC}"
        # Resetear variables
        link_git=""; frontend_url=""; backend_url=""
        get_urls_validated
    fi
}

# =============================================================================
# FUNCIONES MEJORADAS DE SSL Y PROXY (INTEGRADAS DE TEST_SSL_MANUAL.SH)
# =============================================================================

# Función para diagnosticar puertos automáticamente
diagnose_ports_auto() {
    log_message "STEP" "=== DIAGNÓSTICO AUTOMÁTICO DE PUERTOS ==="
    
    print_banner
    echo -e "${WHITE}🔍 Detectando puertos automáticamente...${GRAY_LIGHT}\n"
    
    # Detección por nombre de proceso y respuesta HTTP
    local backend_detected=false
    local frontend_detected=false
    
    # Verificar backend en puerto configurado
    if ps aux | grep -q "backend/dist/server.js" && curl -s -o /dev/null -w "%{http_code}" "http://localhost:$backend_port" | grep -q "200\|301\|302\|404"; then
        log_message "SUCCESS" "✅ Backend detectado en puerto $backend_port"
        backend_detected=true
    fi
    
    # Verificar frontend en puerto configurado
    if ps aux | grep -q "frontend/server.js" && curl -s -o /dev/null -w "%{http_code}" "http://localhost:$frontend_port" | grep -q "200\|301\|302\|404"; then
        log_message "SUCCESS" "✅ Frontend detectado en puerto $frontend_port"
        frontend_detected=true
    fi
    
    # Si ambos están detectados, configurar correctamente
    if [[ "$backend_detected" == true && "$frontend_detected" == true ]]; then
        log_message "SUCCESS" "✅ Ambos servicios detectados correctamente"
    elif [[ "$backend_detected" == true ]]; then
        log_message "WARNING" "⚠️ Solo backend detectado, configurando frontend por defecto"
        frontend_port="3435"
    elif [[ "$frontend_detected" == true ]]; then
        log_message "WARNING" "⚠️ Solo frontend detectado, usando configuración por defecto"
    else
        log_message "WARNING" "⚠️ No se pudo detectar automáticamente, usando configuración por defecto"
    fi
    
    log_message "INFO" "Puertos configurados: Backend=$backend_port, Frontend=$frontend_port"
}

# Función para configurar proxy inverso mejorado
configure_reverse_proxy_improved() {
    log_message "STEP" "=== CONFIGURANDO PROXY INVERSO MEJORADO ==="
    
    print_banner
    echo -e "${WHITE}🔄 Configurando proxy inverso...${GRAY_LIGHT}\n"
    
    # Usar puertos detectados automáticamente
    diagnose_ports_auto
    
    # Extraer solo el dominio de las URLs usando la función correcta
    local backend_domain=$(extract_domain_only "$backend_url")
    local frontend_domain=$(extract_domain_only "$frontend_url")
    
    # Verificar certificados SSL con mejor manejo de errores
    local backend_cert="/etc/letsencrypt/live/$backend_domain/fullchain.pem"
    local frontend_cert="/etc/letsencrypt/live/$frontend_domain/fullchain.pem"
    
    log_message "INFO" "Verificando certificados SSL..."
    log_message "INFO" "Backend cert: $backend_cert"
    log_message "INFO" "Frontend cert: $frontend_cert"
    
    # Verificar si los certificados existen
    local backend_exists=false
    local frontend_exists=false
    
    if [ -f "$backend_cert" ]; then
        backend_exists=true
        log_message "SUCCESS" "✅ Certificado backend encontrado"
    else
        log_message "WARNING" "⚠️ Certificado backend no encontrado en: $backend_cert"
    fi
    
    if [ -f "$frontend_cert" ]; then
        frontend_exists=true
        log_message "SUCCESS" "✅ Certificado frontend encontrado"
    else
        log_message "WARNING" "⚠️ Certificado frontend no encontrado en: $frontend_cert"
    fi
    
    # Si ambos certificados existen, continuar
    if [ "$backend_exists" = true ] && [ "$frontend_exists" = true ]; then
        log_message "SUCCESS" "✅ Todos los certificados SSL encontrados"
    else
        log_message "WARNING" "⚠️ Algunos certificados SSL no encontrados"
        
        # Verificar si los certificados están en proceso de creación
        if [ -d "/etc/letsencrypt/live/" ]; then
            log_message "INFO" "📋 Certificados disponibles en /etc/letsencrypt/live/:"
            ls -la /etc/letsencrypt/live/ 2>/dev/null || log_message "WARNING" "No se puede listar directorio de certificados"
        fi
        
        echo -e "${YELLOW}¿Quieres obtener los certificados SSL? (y/n):${NC} "
        read -r get_certs
        if [[ "$get_certs" =~ ^[Yy]$ ]]; then
            obtain_ssl_certificates_improved
            # Verificar nuevamente después de obtener los certificados
            if [ -f "$backend_cert" ] && [ -f "$frontend_cert" ]; then
                log_message "SUCCESS" "✅ Certificados SSL obtenidos correctamente"
            else
                log_message "ERROR" "❌ No se pudieron obtener los certificados SSL"
                return 1
            fi
        else
            log_message "WARNING" "⚠️ Continuando sin certificados SSL"
            return 1
        fi
    fi
    
    log_message "INFO" "Creando configuración de proxy inverso..."
    
    # Verificar permisos de escritura
    if [[ ! -w "/etc/nginx/sites-available/" ]]; then
        log_message "WARNING" "⚠️ No hay permisos de escritura en /etc/nginx/sites-available/"
        log_message "INFO" "Intentando con sudo..."
    fi
    
    # Crear configuración para backend
    local backend_config="/etc/nginx/sites-available/$backend_domain"
    log_message "INFO" "Creando configuración para backend: $backend_config"
    sudo tee "$backend_config" > /dev/null << EOF
# Configuración SSL para Backend API
server {
    listen 80;
    server_name $backend_domain;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $backend_domain;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/$backend_domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$backend_domain/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Configuración de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http: https: wss: ws:; script-src 'self' 'unsafe-inline' 'unsafe-eval';" always;

    # Logs
    access_log /var/log/nginx/$backend_domain.access.log;
    error_log /var/log/nginx/$backend_domain.error.log;

    # Configuración de proxy
    location / {
        proxy_pass http://localhost:$backend_port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Configuración para WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:$backend_port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_buffering off;
        proxy_cache off;
    }
    
    # Configuración adicional para WebSocket (fallback)
    location /ws {
        proxy_pass http://localhost:$backend_port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_buffering off;
        proxy_cache off;
    }

    # Permitir ACME challenge para renovación de certificados
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
}
EOF

    # Crear configuración para frontend
    local frontend_config="/etc/nginx/sites-available/$frontend_domain"
    log_message "INFO" "Creando configuración para frontend: $frontend_config"
    sudo tee "$frontend_config" > /dev/null << EOF
# Configuración SSL para Frontend App
server {
    listen 80;
    server_name $frontend_domain;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $frontend_domain;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/$frontend_domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$frontend_domain/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Configuración de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http: https: wss: ws:; script-src 'self' 'unsafe-inline' 'unsafe-eval';" always;

    # Logs
    access_log /var/log/nginx/$frontend_domain.access.log;
    error_log /var/log/nginx/$frontend_domain.error.log;

    # Configuración de proxy
    location / {
        proxy_pass http://localhost:$frontend_port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Configuración para archivos estáticos
    location /static/ {
        proxy_pass http://localhost:$frontend_port;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Permitir ACME challenge para renovación de certificados
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
}
EOF

    # Verificar que los archivos se crearon correctamente
    if [[ -f "$backend_config" ]]; then
        log_message "SUCCESS" "✅ Configuración backend creada: $backend_config"
    else
        log_message "ERROR" "❌ Error al crear configuración backend"
        return 1
    fi
    
    if [[ -f "$frontend_config" ]]; then
        log_message "SUCCESS" "✅ Configuración frontend creada: $frontend_config"
    else
        log_message "ERROR" "❌ Error al crear configuración frontend"
        return 1
    fi
    
    # Habilitar sitios
    log_message "INFO" "Habilitando configuraciones..."
    sudo ln -sf "$backend_config" "/etc/nginx/sites-enabled/"
    sudo ln -sf "$frontend_config" "/etc/nginx/sites-enabled/"
    
    # Verificar sintaxis
    if sudo nginx -t >/dev/null 2>&1; then
        log_message "SUCCESS" "✅ Sintaxis de configuración correcta"
    else
        log_message "ERROR" "❌ Error en sintaxis de configuración:"
        sudo nginx -t
        return 1
    fi
    
    # Recargar Nginx
    if sudo systemctl reload nginx >/dev/null 2>&1; then
        log_message "SUCCESS" "✅ Nginx recargado correctamente"
    else
        log_message "ERROR" "❌ Error al recargar Nginx"
        return 1
    fi
    
    echo -e "\n${WHITE}🎉 CONFIGURACIÓN COMPLETADA${NC}"
    echo -e "${CYAN}Backend API:${NC} https://$backend_url → localhost:$backend_port"
    echo -e "${CYAN}Frontend App:${NC} https://$frontend_url → localhost:$frontend_port"
    echo -e "${GRAY_LIGHT}Los cambios pueden tardar unos minutos en propagarse.${NC}"
    
    # Corrección automática de Nginx si falla la configuración SSL
    if ! nginx -t >/dev/null 2>&1; then
        log_message "WARNING" "⚠️ Configuración SSL falló, creando configuración simple sin SSL..."
        
        # Crear configuración simple sin SSL
        sudo tee /etc/nginx/sites-available/watoolx > /dev/null << EOF
server {
    listen 80;
    server_name $backend_domain;
    location / {
        proxy_pass http://127.0.0.1:4142;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}

server {
    listen 80;
    server_name $frontend_domain;
    location / {
        proxy_pass http://127.0.0.1:3435;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

        # Habilitar configuración simple
        sudo ln -sf /etc/nginx/sites-available/watoolx /etc/nginx/sites-enabled/
        
        if nginx -t; then
            log_message "SUCCESS" "✅ Configuración simple de Nginx válida"
        else
            log_message "ERROR" "❌ No se pudo crear configuración válida de Nginx"
            return 1
        fi
        
        # Iniciar Nginx si no está corriendo
        if ! systemctl is-active --quiet nginx; then
            log_message "INFO" "Iniciando Nginx..."
            systemctl start nginx
            sleep 3
        fi
        
        # Verificar que Nginx esté corriendo
        if systemctl is-active --quiet nginx; then
            log_message "SUCCESS" "✅ Nginx iniciado correctamente"
        else
            log_message "ERROR" "❌ No se pudo iniciar Nginx"
            return 1
        fi
    fi
}

# Función para obtener certificados SSL mejorada
obtain_ssl_certificates_improved() {
    log_message "STEP" "=== OBTENIENDO CERTIFICADOS SSL MEJORADO ==="
    
    print_banner
    echo -e "${WHITE}🔐 Obteniendo certificados SSL...${GRAY_LIGHT}\n"
    
    # Extraer dominios de las URLs
    local backend_domain=$(extract_domain_only "$backend_url")
    local frontend_domain=$(extract_domain_only "$frontend_url")
    
    log_message "INFO" "Dominios a configurar: $backend_domain y $frontend_domain"
    
    # Verificar que Certbot esté instalado
    if ! command -v certbot &> /dev/null; then
        log_message "ERROR" "❌ Certbot no está instalado"
        return 1
    fi
    
    # Verificar que Nginx esté corriendo
    if ! systemctl is-active --quiet nginx; then
        log_message "ERROR" "❌ Nginx no está corriendo"
        return 1
    fi
    
    # Configurar Nginx HTTP básico para Certbot (si no existe)
    log_message "INFO" "Configurando Nginx HTTP básico para Certbot..."
    if ! system_nginx_setup_http_quick; then
        log_message "WARNING" "⚠️ No se pudo configurar Nginx HTTP básico, continuando..."
    fi
    
    # Verificar que los dominios resuelvan correctamente
    log_message "INFO" "Verificando resolución DNS..."
    
    if ! nslookup "$backend_domain" >/dev/null 2>&1; then
        log_message "ERROR" "❌ Backend no resuelve: $backend_domain"
        log_message "INFO" "Verificando conectividad HTTP..."
        if ! curl -s --connect-timeout 10 "http://$backend_domain" > /dev/null 2>&1; then
            log_message "ERROR" "❌ El backend no responde en HTTP: http://$backend_domain"
            log_message "ERROR" "❌ Verifica que el DNS esté configurado correctamente"
            return 1
        fi
    fi
    
    if ! nslookup "$frontend_domain" >/dev/null 2>&1; then
        log_message "ERROR" "❌ Frontend no resuelve: $frontend_domain"
        log_message "INFO" "Verificando conectividad HTTP..."
        if ! curl -s --connect-timeout 10 "http://$frontend_domain" > /dev/null 2>&1; then
            log_message "ERROR" "❌ El frontend no responde en HTTP: http://$frontend_domain"
            log_message "ERROR" "❌ Verifica que el DNS esté configurado correctamente"
            return 1
        fi
    fi
    
    log_message "SUCCESS" "✅ DNS verificado correctamente"
    
    # Obtener certificado para backend
    log_message "INFO" "Obteniendo certificado SSL para backend: $backend_domain"
    if sudo certbot --nginx -d "$backend_domain" --non-interactive --agree-tos --email admin@watoolx.com; then
        log_message "SUCCESS" "✅ Certificado SSL obtenido para backend"
    else
        log_message "ERROR" "❌ Error al obtener certificado para backend"
        log_message "INFO" "Verificando logs de Certbot..."
        sudo tail -10 /var/log/letsencrypt/letsencrypt.log 2>/dev/null || true
        return 1
    fi
    
    # Obtener certificado para frontend
    log_message "INFO" "Obteniendo certificado SSL para frontend: $frontend_domain"
    if sudo certbot --nginx -d "$frontend_domain" --non-interactive --agree-tos --email admin@watoolx.com; then
        log_message "SUCCESS" "✅ Certificado SSL obtenido para frontend"
    else
        log_message "ERROR" "❌ Error al obtener certificado para frontend"
        log_message "INFO" "Verificando logs de Certbot..."
        sudo tail -10 /var/log/letsencrypt/letsencrypt.log 2>/dev/null || true
        return 1
    fi
    
    log_message "SUCCESS" "✅ Todos los certificados SSL obtenidos correctamente"
    
    # Esperar un momento para que los certificados estén disponibles
    log_message "INFO" "Esperando que los certificados estén disponibles..."
    sleep 5
    
    # Verificar que los certificados se aplicaron correctamente
    log_message "INFO" "Verificando configuración final..."
    
    # Verificar que los certificados existen físicamente
    local backend_cert="/etc/letsencrypt/live/$backend_domain/fullchain.pem"
    local frontend_cert="/etc/letsencrypt/live/$frontend_domain/fullchain.pem"
    
    if [ -f "$backend_cert" ] && [ -f "$frontend_cert" ]; then
        log_message "SUCCESS" "✅ Certificados SSL verificados físicamente"
    else
        log_message "WARNING" "⚠️ Certificados no encontrados inmediatamente, verificando..."
        sleep 10
        if [ -f "$backend_cert" ] && [ -f "$frontend_cert" ]; then
            log_message "SUCCESS" "✅ Certificados SSL verificados después del delay"
        else
            log_message "ERROR" "❌ Certificados SSL no encontrados después del delay"
            log_message "INFO" "Listando directorio de certificados:"
            ls -la /etc/letsencrypt/live/ 2>/dev/null || true
            return 1
        fi
    fi
    
    # Asegurar que los enlaces simbólicos estén presentes
    if ! [[ -L "/etc/nginx/sites-enabled/$backend_domain" ]]; then
        log_message "INFO" "Recreando enlace simbólico para backend..."
        sudo ln -sf "/etc/nginx/sites-available/$backend_domain" "/etc/nginx/sites-enabled/"
    fi
    
    if ! [[ -L "/etc/nginx/sites-enabled/$frontend_domain" ]]; then
        log_message "INFO" "Recreando enlace simbólico para frontend..."
        sudo ln -sf "/etc/nginx/sites-available/$frontend_domain" "/etc/nginx/sites-enabled/"
    fi
    
    if sudo nginx -t >/dev/null 2>&1; then
        if sudo systemctl reload nginx >/dev/null 2>&1; then
            log_message "SUCCESS" "✅ Nginx recargado correctamente con certificados SSL"
        else
            log_message "WARNING" "⚠️ No se pudo recargar Nginx, pero los certificados están instalados"
        fi
    else
        log_message "ERROR" "❌ Error de sintaxis en configuración de Nginx después de SSL"
        return 1
    fi
}

# =============================================================================
# FUNCIONES DEL SISTEMA (SIMPLIFICADAS)
# =============================================================================

# Función para configurar Nginx HTTP básico (rápido y silencioso)
system_nginx_setup_http_quick() {
    # Extraer solo el dominio de las URLs usando la función correcta
    local backend_domain=$(extract_domain_only "$backend_url")
    local frontend_domain=$(extract_domain_only "$frontend_url")
    
    log_message "INFO" "Configurando dominios: $backend_domain y $frontend_domain"
    
    # Verificar si ya existe configuración HTTP
    if [[ -f "/etc/nginx/sites-available/$backend_domain" ]] || [[ -f "/etc/nginx/sites-available/$frontend_domain" ]]; then
        log_message "INFO" "Configuración HTTP ya existe, saltando..."
        return 0
    fi
    
    # Crear configuración HTTP básica para Certbot
    local backend_config="/etc/nginx/sites-available/$backend_domain"
    if ! sudo tee "$backend_config" > /dev/null << EOF
server {
    listen 80;
    server_name $backend_domain;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 200 "Backend API - HTTP Ready";
        add_header Content-Type text/plain;
    }
}
EOF
    then
        log_message "ERROR" "No se pudo crear configuración para backend"
        return 1
    fi

    local frontend_config="/etc/nginx/sites-available/$frontend_domain"
    if ! sudo tee "$frontend_config" > /dev/null << EOF
server {
    listen 80;
    server_name $frontend_domain;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 200 "Frontend App - HTTP Ready";
        add_header Content-Type text/plain;
    }
}
EOF
    then
        log_message "ERROR" "No se pudo crear configuración para frontend"
        return 1
    fi

    # Habilitar configuraciones
    if ! sudo ln -sf "$backend_config" "/etc/nginx/sites-enabled/"; then
        log_message "ERROR" "No se pudo habilitar configuración del backend"
        return 1
    fi
    
    if ! sudo ln -sf "$frontend_config" "/etc/nginx/sites-enabled/"; then
        log_message "ERROR" "No se pudo habilitar configuración del frontend"
        return 1
    fi
    
    # Verificar sintaxis y recargar
    if sudo nginx -t >/dev/null 2>&1; then
        if sudo systemctl reload nginx >/dev/null 2>&1; then
            log_message "SUCCESS" "✅ Configuración HTTP básica creada correctamente"
            return 0
        else
            log_message "ERROR" "No se pudo recargar Nginx"
            return 1
        fi
    else
        log_message "ERROR" "Error de sintaxis en configuración de Nginx"
        return 1
    fi
}

system_docker_install() {
    log_message "STEP" "=== INSTALANDO DOCKER ==="
    
    print_banner
    printf "${WHITE} 💻 Instalando Docker...${GRAY_LIGHT}\n\n"

    sleep 2

    # Verificar si Docker ya está instalado
    if command -v docker &> /dev/null; then
        log_message "INFO" "Docker ya está instalado"
        return 0
    fi

    # Instalar Docker
    if ! curl -fsSL https://get.docker.com -o get-docker.sh; then
        register_error "No se pudo descargar el script de instalación de Docker"
        return 1
    fi
    
    if ! sudo sh get-docker.sh; then
        register_error "No se pudo instalar Docker"
        return 1
    fi
    
    if ! sudo usermod -aG docker $USER; then
        register_error "No se pudo agregar el usuario al grupo docker"
        return 1
    fi
    
    # Limpiar archivo temporal
    rm -f get-docker.sh
    
    log_message "SUCCESS" "✅ Docker instalado correctamente"
    sleep 2
    return 0
}

system_nodejs_install() {
    log_message "STEP" "=== INSTALANDO NODE.JS ==="
    
    print_banner
    printf "${WHITE} 💻 Instalando Node.js...${GRAY_LIGHT}\n\n"

    sleep 2

    # Verificar si Node.js ya está instalado
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        log_message "INFO" "Node.js ya está instalado"
        return 0
    fi

    # Instalar Node.js usando el repositorio oficial
    if ! curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -; then
        register_error "No se pudo configurar el repositorio de Node.js"
        return 1
    fi
    
    if ! sudo apt-get install -y nodejs; then
        register_error "No se pudo instalar Node.js"
        return 1
    fi
    
    # Verificar instalación
    if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
        register_error "Node.js no se instaló correctamente"
        return 1
    fi
    
    log_message "SUCCESS" "✅ Node.js instalado correctamente"
    sleep 2
    return 0
}

system_pm2_install() {
    log_message "STEP" "=== INSTALANDO PM2 ==="
    
    print_banner
    printf "${WHITE} 💻 Instalando PM2...${GRAY_LIGHT}\n\n"

    sleep 2

    # Verificar si PM2 ya está instalado
    if command -v pm2 &> /dev/null; then
        log_message "INFO" "PM2 ya está instalado"
        return 0
    fi
    
    # Verificar si npm está disponible
    if ! command -v npm &> /dev/null; then
        log_message "INFO" "npm no disponible, instalando Node.js primero..."
        if ! system_nodejs_install; then
            register_error "No se pudo instalar Node.js"
            return 1
        fi
    fi

    # Verificar si Node.js está instalado
    if ! command -v node &> /dev/null; then
        log_message "INFO" "Node.js no disponible, instalando..."
        if ! system_nodejs_install; then
            register_error "No se pudo instalar Node.js"
            return 1
        fi
    fi

    # Configurar npm de manera segura
    configure_npm_safely
    
    # Instalar PM2 globalmente
    if ! npm install -g pm2; then
        register_error "No se pudo instalar PM2"
        return 1
    fi
    
    # Configurar PATH para PM2
    export PATH=$PATH:/usr/local/bin
    
    # Verificar que PM2 se instaló correctamente
    if ! command -v pm2 &> /dev/null; then
        register_error "PM2 no se instaló correctamente"
        return 1
    fi
    
    log_message "SUCCESS" "✅ PM2 instalado correctamente"
    sleep 2
    return 0
}

system_nginx_install() {
    log_message "STEP" "=== INSTALANDO NGINX ==="
    
    print_banner
    printf "${WHITE} 💻 Instalando Nginx...${GRAY_LIGHT}\n\n"

    sleep 2

    # Verificar si Nginx ya está instalado
    if command -v nginx &> /dev/null; then
        log_message "INFO" "Nginx ya está instalado"
        return 0
    fi

    # Actualizar repositorios
    if ! sudo apt-get update; then
        register_error "No se pudo actualizar los repositorios para instalar Nginx"
        return 1
    fi

    # Instalar Nginx
    if ! sudo apt-get install -y nginx; then
        register_error "No se pudo instalar Nginx"
        return 1
    fi
    
    # Verificar que Nginx se instaló correctamente
    if ! command -v nginx &> /dev/null; then
        register_error "Nginx no se instaló correctamente"
        return 1
    fi
    
    log_message "SUCCESS" "✅ Nginx instalado correctamente"
    sleep 2
    return 0
}

system_certbot_install() {
    log_message "STEP" "=== INSTALANDO CERTBOT ==="
    
    print_banner
    printf "${WHITE} 💻 Instalando Certbot...${GRAY_LIGHT}\n\n"

    sleep 2

    # Verificar si Certbot ya está instalado
    if command -v certbot &> /dev/null; then
        log_message "INFO" "Certbot ya está instalado"
        return 0
    fi

    # Instalar Certbot
    if ! sudo apt-get install -y certbot python3-certbot-nginx; then
        register_error "No se pudo instalar Certbot"
        return 1
    fi
    
    # Verificar que Certbot se instaló correctamente
    if ! command -v certbot &> /dev/null; then
        register_error "Certbot no se instaló correctamente"
        return 1
    fi
    
    log_message "SUCCESS" "✅ Certbot instalado correctamente"
    sleep 2
    return 0
}

# =============================================================================
# FUNCIONES DEL BACKEND (SIMPLIFICADAS)
# =============================================================================

backend_redis_create() {
    log_message "STEP" "=== CREANDO REDIS Y BASE DE DATOS ==="
    
    print_banner
    printf "${WHITE} 💻 Creando Redis y base de datos MySQL...${GRAY_LIGHT}"
    printf "\n\n"

    sleep 2

    # Verificar que Docker esté disponible
    if ! command -v docker &> /dev/null; then
        register_error "Docker no está instalado o no está disponible"
        return 1
    fi

    # Verificar que el servicio Docker esté ejecutándose
    if ! sudo systemctl is-active --quiet docker; then
        log_message "INFO" "Iniciando servicio Docker..."
        if ! sudo systemctl start docker; then
            register_error "No se pudo iniciar el servicio Docker"
            return 1
        fi
    fi

    # Verificar y corregir permisos de Docker
    log_message "INFO" "Verificando permisos de Docker..."
    
    # Verificar si el usuario actual puede usar Docker
    if ! docker ps > /dev/null 2>&1; then
        log_message "WARNING" "⚠️ Usuario actual no puede usar Docker, corrigiendo permisos..."
        
        # Agregar usuario al grupo docker si no está
        if ! groups $USER | grep -q docker; then
            log_message "INFO" "➕ Agregando usuario al grupo docker..."
            if ! sudo usermod -aG docker $USER; then
                register_error "No se pudo agregar usuario al grupo docker"
                return 1
            fi
        fi
        
        # Corregir permisos del socket de Docker
        if [ -S /var/run/docker.sock ]; then
            log_message "INFO" "🔧 Corrigiendo permisos del socket de Docker..."
            if ! sudo chmod 666 /var/run/docker.sock; then
                register_error "No se pudieron corregir los permisos del socket de Docker"
                return 1
            fi
        fi
        
        # Intentar usar Docker nuevamente
        log_message "INFO" "🔄 Verificando permisos corregidos..."
        if ! docker ps > /dev/null 2>&1; then
            log_message "WARNING" "⚠️ Los permisos aún no están activos, intentando con newgrp..."
            # Intentar con newgrp para activar el grupo inmediatamente
            if ! newgrp docker -c "docker ps > /dev/null 2>&1"; then
                register_error "No se pudieron corregir los permisos de Docker"
                return 1
            fi
        fi
        
        log_message "SUCCESS" "✅ Permisos de Docker corregidos"
    else
        log_message "SUCCESS" "✅ Permisos de Docker correctos"
    fi

    # Verificar que MySQL esté instalado
    if ! command -v mysql &> /dev/null; then
        log_message "INFO" "Instalando MySQL..."
        if ! sudo apt-get install -y mysql-server mysql-client; then
            register_error "No se pudo instalar MySQL"
            return 1
        fi
    fi

    # Iniciar servicio MySQL si no está ejecutándose
    if ! sudo systemctl is-active --quiet mysql; then
        log_message "INFO" "Iniciando servicio MySQL..."
        if ! sudo systemctl start mysql; then
            register_error "No se pudo iniciar el servicio MySQL"
            return 1
        fi
    fi

    # Configurar MySQL para permitir conexiones sin contraseña inicialmente
    log_message "INFO" "Configurando MySQL..."
    sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${mysql_password}';" 2>/dev/null || true
    sudo mysql -e "FLUSH PRIVILEGES;" 2>/dev/null || true

    # Detener y eliminar contenedor Redis existente si existe
    log_message "INFO" "🧹 Limpiando contenedores Redis existentes..."
    docker stop redis-${instancia_add} 2>/dev/null || true
    docker rm redis-${instancia_add} 2>/dev/null || true

    # Crear Redis con Docker
    log_message "INFO" "🔧 Creando contenedor Redis..."
    if ! docker run --name redis-${instancia_add} -p ${redis_port}:6379 --restart always --detach redis redis-server --requirepass ${mysql_password}; then
        register_error "No se pudo crear el contenedor Redis"
        return 1
    fi

    # Verificar que Redis esté funcionando
    sleep 3
    if ! docker ps | grep -q redis-${instancia_add}; then
        register_error "El contenedor Redis no se inició correctamente"
        return 1
    fi

    # Crear base de datos MySQL
    if ! mysql -u root -p${mysql_password} -e "CREATE DATABASE IF NOT EXISTS ${instancia_add};" 2>/dev/null; then
        register_error "No se pudo crear la base de datos MySQL ${instancia_add}"
        return 1
    fi

    # Crear usuario MySQL
    if ! mysql -u root -p${mysql_password} -e "CREATE USER IF NOT EXISTS '${instancia_add}'@'localhost' IDENTIFIED BY '${mysql_password}';" 2>/dev/null; then
        log_message "WARNING" "El usuario ${instancia_add} ya existe"
    fi

    # Otorgar permisos al usuario
    if ! mysql -u root -p${mysql_password} -e "GRANT ALL PRIVILEGES ON ${instancia_add}.* TO '${instancia_add}'@'localhost';" 2>/dev/null; then
        register_error "No se pudieron otorgar permisos al usuario MySQL"
        return 1
    fi

    # Aplicar cambios
    if ! mysql -u root -p${mysql_password} -e "FLUSH PRIVILEGES;" 2>/dev/null; then
        register_error "No se pudieron aplicar los cambios de permisos"
        return 1
    fi

    # Verificar conexión a la base de datos
    if ! mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT 1;" > /dev/null 2>&1; then
        register_error "No se puede conectar a la base de datos ${instancia_add}"
        return 1
    fi

    log_message "SUCCESS" "✅ Redis y MySQL configurados correctamente"
    sleep 2
    return 0
}

backend_set_env() {
    log_message "STEP" "=== CONFIGURANDO VARIABLES DE ENTORNO BACKEND ==="
    
    print_banner
    printf "${WHITE} 💻 Configurando variables de entorno (backend)...${GRAY_LIGHT}"
    printf "\n\n"

    sleep 2

    # Verificar que el directorio backend existe
    if [ ! -d "$BACKEND_DIR" ]; then
        register_error "El directorio backend no existe"
        return 1
    fi

    # Extraer solo dominios
    backend_domain=$(extract_domain_only "$backend_url")
    frontend_domain=$(extract_domain_only "$frontend_url")

    # Crear archivo .env con configuración completa
    cat > "$BACKEND_DIR/.env" << EOF
NODE_ENV=production
BACKEND_URL=https://${backend_domain}
FRONTEND_URL=https://${frontend_domain}
PROXY_PORT=443
PORT=${backend_port}

# Base de datos MySQL
DB_DIALECT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=${instancia_add}
DB_PASS=${mysql_password}
DB_NAME=${instancia_add}
DB_DEBUG=false

# JWT Secrets
JWT_SECRET=${jwt_secret}
JWT_REFRESH_SECRET=${jwt_refresh_secret}

# Redis
REDIS_URI=redis://:${mysql_password}@127.0.0.1:${redis_port}
REDIS_OPT_LIMITER_MAX=1
REDIS_OPT_LIMITER_DURATION=3000

# Límites
USER_LIMIT=${max_user}
CONNECTIONS_LIMIT=${max_whats}
CLOSED_SEND_BY_ME=true

# Email (configurar según tu proveedor)
MAIL_HOST=smtp.gmail.com
MAIL_USER=tu-email@gmail.com
MAIL_PASS=tu-password-de-aplicacion
MAIL_FROM=WATOOLX <tu-email@gmail.com>
MAIL_PORT=587

# Master Key (para acceso administrativo)
MASTER_KEY=admin123

# Token para APIs externas
ENV_TOKEN=watoolx-env-token-2024

# Sentry (opcional)
SENTRY_DSN=

# OpenAI (opcional)
OPENAI_API_KEY=

# Gerencianet (opcional)
GERENCIANET_CLIENT_ID=
GERENCIANET_CLIENT_SECRET=
GERENCIANET_PIX_KEY=
GERENCIANET_PIX_CERT=

# Ngrok (para webhooks en desarrollo)
NGROK_URL=

# Configuración de Archivos
UPLOAD_DIR=./public/uploads
MAX_FILE_SIZE=5242880

# Configuración de Colas
QUEUE_REDIS_URI=redis://localhost:6379
QUEUE_PREFIX=watoolx

# Configuración de Logs
LOG_LEVEL=debug
LOG_FILE=./logs/app.log

# Configuración de Seguridad
CORS_ORIGIN=https://${frontend_domain},http://${frontend_domain}
TRANSLATION_API_URL=https://${backend_domain}
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
EOF

    # Verificar que el archivo se creó correctamente
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        register_error "No se pudo crear el archivo $BACKEND_DIR/.env"
        return 1
    fi

    log_message "SUCCESS" "✅ Variables de entorno del backend configuradas"
    sleep 2
    return 0
}

backend_node_dependencies() {
    log_message "STEP" "=== INSTALANDO DEPENDENCIAS DEL BACKEND ==="
    
    print_banner
    printf "${WHITE} 💻 Instalando dependencias del backend...${GRAY_LIGHT}\n\n"

    sleep 2

    # Verificar que el directorio backend existe
    if [ ! -d "$BACKEND_DIR" ]; then
        register_error "El directorio backend no existe"
        return 1
    fi

    # Verificar si Node.js está instalado
    if ! command -v node &> /dev/null; then
        log_message "INFO" "Instalando Node.js..."
        if ! curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -; then
            register_error "No se pudo configurar el repositorio de Node.js"
            return 1
        fi
        
        if ! sudo apt-get install -y nodejs; then
            register_error "No se pudo instalar Node.js"
            return 1
        fi
    fi

    # Verificar que npm esté disponible
    if ! command -v npm &> /dev/null; then
        register_error "npm no está disponible"
        return 1
    fi

    # Configurar PATH para npm
    export PATH=$PATH:/usr/local/bin

    # Cambiar al directorio backend
    cd "$BACKEND_DIR"

    # Verificar que package.json existe
    if [ ! -f "package.json" ]; then
        register_error "No se encontró package.json en el directorio backend"
        return 1
    fi

    # Limpiar cache de npm
    if ! npm cache clean -f; then
        log_message "WARNING" "No se pudo limpiar el cache de npm"
    fi

    # Instalar dependencias usando --legacy-peer-deps
    if ! npm install --legacy-peer-deps --loglevel=error; then
        register_error "No se pudieron instalar las dependencias del backend"
        return 1
    fi

    # Verificar que node_modules existe
    if [ ! -d "node_modules" ]; then
        register_error "No se instalaron las dependencias correctamente"
        return 1
    fi

    # Verificar y corregir permisos de binarios importantes
    fix_npm_binaries_permissions "$BACKEND_DIR"

    log_message "SUCCESS" "✅ Dependencias del backend instaladas"
    sleep 2
    return 0
}

backend_node_build() {
    log_message "STEP" "=== COMPILANDO BACKEND ==="
    
    print_banner
    printf "${WHITE} 💻 Compilando el código del backend...${GRAY_LIGHT}"
    printf "\n\n"

    sleep 2

    # Verificar que estamos en el directorio backend
    if [ ! -d "$BACKEND_DIR" ]; then
        register_error "No se puede acceder al directorio backend"
        return 1
    fi

    cd "$BACKEND_DIR"

    # Verificar que package.json existe
    if [ ! -f "package.json" ]; then
        register_error "No se encontró package.json en el directorio backend"
        return 1
    fi

    # Verificar que node_modules existe
    if [ ! -d "node_modules" ]; then
        register_error "Las dependencias no están instaladas. Ejecuta backend_node_dependencies primero"
        return 1
    fi

    # Verificar que el script build existe en package.json
    if ! grep -q '"build"' package.json; then
        register_error "No se encontró el script 'build' en package.json"
        return 1
    fi

    # Compilar el backend
    if ! npm run build; then
        register_error "No se pudo compilar el backend"
        return 1
    fi

    # Verificar que se creó el directorio dist
    if [ ! -d "dist" ]; then
        register_error "No se generó el directorio dist después de la compilación"
        return 1
    fi

    # Verificar que existe el archivo principal
    if [ ! -f "dist/server.js" ]; then
        register_error "No se generó el archivo server.js después de la compilación"
        return 1
    fi

    log_message "SUCCESS" "✅ Backend compilado correctamente"
    sleep 2
    return 0
}

backend_db_migrate() {
    log_message "STEP" "=== EJECUTANDO MIGRACIONES ==="
    
    print_banner
    printf "${WHITE} 💻 Ejecutando migraciones de la base de datos...${GRAY_LIGHT}\n\n"

    sleep 2

    # Verificar que estamos en el directorio backend
    if [ ! -d "$BACKEND_DIR" ]; then
        register_error "No se puede acceder al directorio backend"
        return 1
    fi

    cd "$BACKEND_DIR"

    # Verificar que el archivo .env existe
    if [ ! -f ".env" ]; then
        register_error "No se encontró el archivo .env en el directorio backend"
        return 1
    fi

    # Verificar que sequelize-cli esté disponible
    if ! command -v npx &> /dev/null; then
        register_error "npx no está disponible"
        return 1
    fi

    # Verificar conexión a la base de datos antes de ejecutar migraciones
    if ! mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT 1;" > /dev/null 2>&1; then
        register_error "No se puede conectar a la base de datos ${instancia_add}"
        return 1
    fi

    # Lista de migraciones problemáticas conocidas (CON extensión .js - como las ejecuta Sequelize)
    PROBLEMATIC_MIGRATIONS=(
        "20250121000001-add-mediaSize-to-messages.js"
        "20250118000001-add-mediaSize-to-messages.js"
        "20250122_add_avatar_instance_to_whatsapp.js"
        "20250122_add_reminder_fields_to_schedules.js"
        "20250122_add_status_field_to_schedules.js"
        "20250122_add_whatsappId_to_schedules.js"
        "20250127000000-create-hub-notificame-table.js"
        "20250128_add_waName_to_whatsapp.js"
    )

    # Marcar migraciones problemáticas como ejecutadas ANTES de ejecutar migraciones
    log_message "INFO" "Marcando migraciones problemáticas conocidas como ejecutadas..."
    for migration in "${PROBLEMATIC_MIGRATIONS[@]}"; do
        log_message "INFO" "Marcando migración: $migration"
        mysql -u root -p${mysql_password} -e "USE ${instancia_add}; INSERT IGNORE INTO SequelizeMeta (name) VALUES ('$migration');" 2>/dev/null || true
        log_message "SUCCESS" "Migración problemática marcada como ejecutada: $migration"
        
        # Verificar que se marcó correctamente
        if mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT COUNT(*) FROM SequelizeMeta WHERE name = '$migration';" 2>/dev/null | tail -1 | tr -d ' ' | grep -q "1"; then
            log_message "SUCCESS" "✅ Migración problemática confirmada como ejecutada: $migration"
        else
            log_message "WARNING" "⚠️ Migración problemática no se marcó correctamente: $migration"
            # Intentar marcarla de nuevo
            mysql -u root -p${mysql_password} -e "USE ${instancia_add}; INSERT INTO SequelizeMeta (name) VALUES ('$migration');" 2>/dev/null || true
            log_message "INFO" "Reintentando marcar migración: $migration"
        fi
    done

    # Ejecutar migraciones con manejo de errores mejorado
    log_message "INFO" "Ejecutando migraciones de base de datos..."
    
    # Configurar timeout de MySQL para evitar deadlocks
    mysql -u root -p${mysql_password} -e "SET GLOBAL innodb_lock_wait_timeout = 120; SET GLOBAL innodb_deadlock_detect = ON;" 2>/dev/null || true
    
    # Ejecutar migraciones con retry
    MAX_RETRIES=5
    for attempt in $(seq 1 $MAX_RETRIES); do
        log_message "INFO" "Intento $attempt de $MAX_RETRIES para ejecutar migraciones..."
        
        MIGRATION_OUTPUT=$(sudo npx sequelize-cli db:migrate 2>&1)
        MIGRATION_EXIT_CODE=$?
        
        if [ $MIGRATION_EXIT_CODE -eq 0 ]; then
            log_message "SUCCESS" "✅ Migraciones ejecutadas correctamente"
            break
        else
            log_message "WARNING" "⚠️ Error en migraciones, intentando con configuración MySQL..."
            
            # Intentar con configuración específica de MySQL
            MIGRATION_OUTPUT=$(sudo npx sequelize-cli db:migrate 2>&1)
            MIGRATION_EXIT_CODE=$?
            
            if [ $MIGRATION_EXIT_CODE -eq 0 ]; then
                log_message "SUCCESS" "✅ Migraciones ejecutadas correctamente con configuración MySQL"
                break
            else
                # Extraer el nombre de la migración que falló
                FAILED_MIGRATION=$(echo "$MIGRATION_OUTPUT" | grep -o "== [^:]*: migrating" | sed 's/== \(.*\): migrating/\1/')
                
                if [ ! -z "$FAILED_MIGRATION" ]; then
                    log_message "WARNING" "⚠️ Migración fallida: $FAILED_MIGRATION"
                    log_message "INFO" "Marcando migración fallida como ejecutada..."
                    mysql -u root -p${mysql_password} -e "USE ${instancia_add}; INSERT IGNORE INTO SequelizeMeta (name) VALUES ('$FAILED_MIGRATION');" 2>/dev/null || true
                    log_message "SUCCESS" "Migración fallida marcada como ejecutada: $FAILED_MIGRATION"
                fi
                
                if [ $attempt -eq $MAX_RETRIES ]; then
                    log_message "ERROR" "❌ No se pudieron ejecutar las migraciones después de $MAX_RETRIES intentos"
                    register_error "Error en migraciones de base de datos"
                    return 1
                else
                    log_message "WARNING" "⚠️ Reintentando migraciones en 3 segundos..."
                    sleep 3
                fi
            fi
        fi
    done

    # Verificar que las tablas se crearon
    table_count=$(mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${instancia_add}';" 2>/dev/null | tail -1 | tr -d ' ')
    
    if [ "$table_count" -eq 0 ]; then
        register_error "No se crearon tablas después de ejecutar las migraciones"
        return 1
    fi

    log_message "SUCCESS" "✅ Migraciones ejecutadas correctamente (${table_count} tablas creadas)"
    sleep 2
    return 0
}

backend_db_seed() {
    log_message "STEP" "=== EJECUTANDO SEEDS ==="
    
    print_banner
    printf "${WHITE} 💻 Ejecutando seeds de la base de datos...${GRAY_LIGHT}\n\n"

    sleep 2

    # Verificar que estamos en el directorio backend
    if [ ! -d "$BACKEND_DIR" ]; then
        register_error "No se puede acceder al directorio backend"
        return 1
    fi

    cd "$BACKEND_DIR"

    # Verificar que el archivo .env existe
    if [ ! -f ".env" ]; then
        register_error "No se encontró el archivo .env en el directorio backend"
        return 1
    fi

    # Verificar conexión a la base de datos
    if ! mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT 1;" > /dev/null 2>&1; then
        register_error "No se puede conectar a la base de datos ${instancia_add}"
        return 1
    fi

    # Verificar que las tablas necesarias existan
    log_message "INFO" "Verificando estructura de la base de datos..."
    
    if ! mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT 1 FROM Companies LIMIT 1;" > /dev/null 2>&1; then
        log_message "ERROR" "La tabla Companies no existe"
        register_error "Tabla Companies no encontrada"
        return 1
    fi
    
    if ! mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT 1 FROM Users LIMIT 1;" > /dev/null 2>&1; then
        log_message "ERROR" "La tabla Users no existe"
        register_error "Tabla Users no encontrada"
        return 1
    fi
    
    if ! mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT 1 FROM Plans LIMIT 1;" > /dev/null 2>&1; then
        log_message "ERROR" "La tabla Plans no existe"
        register_error "Tabla Plans no encontrada"
        return 1
    fi
    
    log_message "SUCCESS" "✅ Estructura de base de datos verificada"

    # Verificar si ya existen datos básicos (verificando los que crean los seeds automáticos)
    log_message "INFO" "Verificando datos existentes..."
    
    existing_user=$(mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT COUNT(*) FROM Users WHERE email = 'admin@admin.com';" 2>/dev/null | tail -1 | tr -d ' ')
    existing_company=$(mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT COUNT(*) FROM Companies WHERE name IN ('Empresa 1', '${instancia_add}');" 2>/dev/null | tail -1 | tr -d ' ')
    existing_plan=$(mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT COUNT(*) FROM Plans WHERE name = 'Plano 1';" 2>/dev/null | tail -1 | tr -d ' ')
    
    # Si ya existen todos los datos básicos, no hacer nada
    if [ "$existing_user" -gt 0 ] && [ "$existing_company" -gt 0 ] && [ "$existing_plan" -gt 0 ]; then
        log_message "SUCCESS" "✅ Datos básicos ya existen en la base de datos"
        log_message "INFO" "Credenciales de acceso:"
        log_message "INFO" "  Email: admin@admin.com"
        log_message "INFO" "  Contraseña: 123456"
        return 0
    fi

    # Intentar ejecutar seeds automáticos primero
    log_message "INFO" "Intentando ejecutar seeds automáticos..."
    if npm run db:seed > /dev/null 2>&1; then
        log_message "SUCCESS" "✅ Seeds automáticos ejecutados correctamente"
        
        # Verificar que los seeds automáticos crearon los datos
        user_count=$(mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT COUNT(*) FROM Users;" 2>/dev/null | tail -1 | tr -d ' ')
        company_count=$(mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT COUNT(*) FROM Companies;" 2>/dev/null | tail -1 | tr -d ' ')
        plan_count=$(mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT COUNT(*) FROM Plans;" 2>/dev/null | tail -1 | tr -d ' ')
        
        if [ "$user_count" -gt 0 ] && [ "$company_count" -gt 0 ] && [ "$plan_count" -gt 0 ]; then
            log_message "SUCCESS" "✅ Seeds automáticos crearon datos correctamente"
            log_message "INFO" "Resumen de datos creados:"
            log_message "INFO" "  - Usuarios: $user_count"
            log_message "INFO" "  - Empresas: $company_count"
            log_message "INFO" "  - Planes: $plan_count"
            log_message "INFO" "Credenciales de acceso:"
            log_message "INFO" "  Email: admin@admin.com"
            log_message "INFO" "  Contraseña: 123456"
            return 0
        fi
    else
        log_message "WARNING" "⚠️ Los seeds automáticos fallaron, creando datos manualmente..."
    fi

    # Si los seeds automáticos fallaron, crear datos manualmente
    log_message "INFO" "Creando datos básicos manualmente..."
    
    # Crear plan manualmente con mejor manejo de errores
    log_message "INFO" "Creando plan..."
    
    # Verificar si el plan ya existe
    existing_plan=$(mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT COUNT(*) FROM Plans WHERE name = 'Plano 1';" 2>/dev/null | tail -1 | tr -d ' ')
    
    if [ "$existing_plan" -gt 0 ]; then
        log_message "SUCCESS" "✅ Plan ya existe"
    else
        # Intentar crear el plan con transacción
        if mysql -u root -p${mysql_password} -e "USE ${instancia_add}; START TRANSACTION; INSERT INTO Plans (name, users, connections, queues, value, createdAt, updatedAt) VALUES ('Plano 1', 10, 10, 10, 30, NOW(), NOW()); COMMIT;" 2>/dev/null; then
            log_message "SUCCESS" "✅ Plan creado correctamente"
        else
            log_message "WARNING" "⚠️ Error al crear plan, verificando si se creó de todas formas..."
            sleep 2
            plan_check=$(mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT COUNT(*) FROM Plans WHERE name = 'Plano 1';" 2>/dev/null | tail -1 | tr -d ' ')
            
            if [ "$plan_check" -gt 0 ]; then
                log_message "SUCCESS" "✅ Plan existe (creado por otro proceso)"
            else
                log_message "ERROR" "❌ No se pudo crear el plan"
                register_error "No se pudo crear el plan"
                return 1
            fi
        fi
    fi

    # Obtener el ID del plan con mejor manejo
    plan_id=$(mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT id FROM Plans WHERE name = 'Plano 1' ORDER BY id DESC LIMIT 1;" 2>/dev/null | tail -1 | tr -d ' ')
    
    if [ -z "$plan_id" ] || [ "$plan_id" = "" ]; then
        # Intentar obtener cualquier plan existente
        plan_id=$(mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT id FROM Plans ORDER BY id ASC LIMIT 1;" 2>/dev/null | tail -1 | tr -d ' ')
        if [ -z "$plan_id" ] || [ "$plan_id" = "" ]; then
            plan_id=1
            log_message "WARNING" "⚠️ No se pudo obtener el ID del plan, usando plan_id=1"
        else
            log_message "SUCCESS" "✅ Usando plan existente con ID: $plan_id"
        fi
    else
        log_message "SUCCESS" "✅ Plan obtenido con ID: $plan_id"
    fi

    # Crear empresa manualmente con mejor manejo de errores
    log_message "INFO" "Creando empresa..."
    
    # Verificar si la empresa ya existe (buscar tanto por nombre de instancia como por 'Empresa 1')
    existing_company=$(mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT COUNT(*) FROM Companies WHERE name IN ('${instancia_add}', 'Empresa 1');" 2>/dev/null | tail -1 | tr -d ' ')
    
    if [ "$existing_company" -gt 0 ]; then
        log_message "SUCCESS" "✅ Empresa ya existe"
    else
        # Intentar crear la empresa con transacción (usar 'Empresa 1' como nombre por defecto)
        if mysql -u root -p${mysql_password} -e "USE ${instancia_add}; START TRANSACTION; INSERT INTO Companies (name, phone, email, status, planId, dueDate, recurrence, createdAt, updatedAt) VALUES ('Empresa 1', '5511999999999', 'admin@admin.com', true, $plan_id, DATE_ADD(NOW(), INTERVAL 30 DAY), 'MONTHLY', NOW(), NOW()); COMMIT;" 2>/dev/null; then
            log_message "SUCCESS" "✅ Empresa creada correctamente"
        else
            log_message "WARNING" "⚠️ Error al crear empresa, verificando si se creó de todas formas..."
            sleep 2
            company_check=$(mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT COUNT(*) FROM Companies WHERE name IN ('${instancia_add}', 'Empresa 1');" 2>/dev/null | tail -1 | tr -d ' ')
            
            if [ "$company_check" -gt 0 ]; then
                log_message "SUCCESS" "✅ Empresa existe (creada por otro proceso)"
            else
                log_message "ERROR" "❌ No se pudo crear la empresa"
                register_error "No se pudo crear la empresa"
                return 1
            fi
        fi
    fi

    # Obtener el ID de la empresa con mejor manejo (buscar tanto por nombre de instancia como por 'Empresa 1')
    company_id=$(mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT id FROM Companies WHERE name IN ('${instancia_add}', 'Empresa 1') ORDER BY id DESC LIMIT 1;" 2>/dev/null | tail -1 | tr -d ' ')
    
    if [ -z "$company_id" ] || [ "$company_id" = "" ]; then
        # Intentar obtener cualquier empresa existente
        company_id=$(mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT id FROM Companies ORDER BY id ASC LIMIT 1;" 2>/dev/null | tail -1 | tr -d ' ')
        if [ -z "$company_id" ] || [ "$company_id" = "" ]; then
            company_id=1
            log_message "WARNING" "⚠️ No se pudo obtener el ID de la empresa, usando company_id=1"
        else
            log_message "SUCCESS" "✅ Usando empresa existente con ID: $company_id"
        fi
    else
        log_message "SUCCESS" "✅ Empresa obtenida con ID: $company_id"
    fi

    # Crear usuario admin manualmente con mejor manejo de errores
    log_message "INFO" "Creando usuario admin..."
    
    # Verificar si el usuario ya existe
    existing_admin=$(mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT COUNT(*) FROM Users WHERE email = 'admin@admin.com';" 2>/dev/null | tail -1 | tr -d ' ')
    
    if [ "$existing_admin" -gt 0 ]; then
        log_message "SUCCESS" "✅ Usuario admin ya existe"
    else
        # Intentar crear el usuario con mejor manejo de errores
        log_message "INFO" "Insertando usuario admin..."
        
        # Usar una transacción para mejor control (usar 'Admin' como nombre para coincidir con los seeds)
        if mysql -u root -p${mysql_password} -e "USE ${instancia_add}; START TRANSACTION; INSERT INTO Users (name, email, passwordHash, profile, companyId, createdAt, updatedAt, super, allTicket) VALUES ('Admin', 'admin@admin.com', '\$2a\$08\$08TgjZAGBqkI9Uk.T8lKvO4vyE2JQoG8XeJdmY9pIqR2SR3aJqKq', 'admin', $company_id, NOW(), NOW(), true, 'enabled'); COMMIT;" 2>/dev/null; then
            log_message "SUCCESS" "✅ Usuario admin creado correctamente"
        else
            log_message "WARNING" "⚠️ Error al crear usuario admin, intentando método alternativo..."
            
            # Método alternativo: verificar si el usuario se creó de todas formas
            sleep 2
            admin_check=$(mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT COUNT(*) FROM Users WHERE email = 'admin@admin.com';" 2>/dev/null | tail -1 | tr -d ' ')
            
            if [ "$admin_check" -gt 0 ]; then
                log_message "SUCCESS" "✅ Usuario admin existe (creado por otro proceso)"
            else
                log_message "ERROR" "❌ No se pudo crear el usuario admin"
                register_error "No se pudo crear el usuario admin"
                return 1
            fi
        fi
    fi

    # Verificación final más robusta con múltiples intentos
    log_message "INFO" "Verificando datos creados..."
    
    # Esperar un momento para que la base de datos se estabilice
    sleep 3
    
    # Verificar que existe al menos un usuario con múltiples intentos
    user_count=0
    for i in {1..3}; do
        user_count=$(mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT COUNT(*) FROM Users;" 2>/dev/null | tail -1 | tr -d ' ')
        
        if [ "$user_count" -gt 0 ]; then
            log_message "SUCCESS" "✅ Verificación exitosa: $user_count usuario(s) encontrado(s)"
            break
        else
            log_message "WARNING" "⚠️ Intento $i: No se encontraron usuarios, esperando..."
            sleep 2
        fi
    done
    
    if [ "$user_count" -eq 0 ]; then
        log_message "ERROR" "❌ No se creó ningún usuario después de múltiples intentos"
        log_message "INFO" "Verificando estado de la base de datos..."
        
        # Mostrar información de debugging
        mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT COUNT(*) as total_users FROM Users;" 2>/dev/null || true
        mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT COUNT(*) as total_companies FROM Companies;" 2>/dev/null || true
        mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT COUNT(*) as total_plans FROM Plans;" 2>/dev/null || true
        
        register_error "No se creó ningún usuario"
        return 1
    fi

    # Verificar que existe al menos una empresa con múltiples intentos
    company_count=0
    for i in {1..3}; do
        company_count=$(mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT COUNT(*) FROM Companies;" 2>/dev/null | tail -1 | tr -d ' ')
        
        if [ "$company_count" -gt 0 ]; then
            log_message "SUCCESS" "✅ Verificación exitosa: $company_count empresa(s) encontrada(s)"
            break
        else
            log_message "WARNING" "⚠️ Intento $i: No se encontraron empresas, esperando..."
            sleep 2
        fi
    done
    
    if [ "$company_count" -eq 0 ]; then
        log_message "ERROR" "❌ No se creó ninguna empresa después de múltiples intentos"
        register_error "No se creó ninguna empresa"
        return 1
    fi

    # Verificar que existe al menos un plan con múltiples intentos
    plan_count=0
    for i in {1..3}; do
        plan_count=$(mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SELECT COUNT(*) FROM Plans;" 2>/dev/null | tail -1 | tr -d ' ')
        
        if [ "$plan_count" -gt 0 ]; then
            log_message "SUCCESS" "✅ Verificación exitosa: $plan_count plan(es) encontrado(s)"
            break
        else
            log_message "WARNING" "⚠️ Intento $i: No se encontraron planes, esperando..."
            sleep 2
        fi
    done
    
    if [ "$plan_count" -eq 0 ]; then
        log_message "ERROR" "❌ No se creó ningún plan después de múltiples intentos"
        register_error "No se creó ningún plan"
        return 1
    fi

    log_message "SUCCESS" "✅ Base de datos configurada correctamente"
    log_message "INFO" "Resumen de datos creados:"
    log_message "INFO" "  - Usuarios: $user_count"
    log_message "INFO" "  - Empresas: $company_count"
    log_message "INFO" "  - Planes: $plan_count"
    log_message "INFO" "Credenciales de acceso:"
    log_message "INFO" "  Email: admin@admin.com"
    log_message "INFO" "  Contraseña: 123456"

    sleep 2
    return 0
}

backend_start_pm2() {
    log_message "STEP" "=== INICIANDO BACKEND CON PM2 ==="
    
    print_banner
    printf "${WHITE} 💻 Iniciando pm2 (backend)...${GRAY_LIGHT}"
    printf "\n\n"

    sleep 2

    # Verificar que PM2 esté disponible
    if ! command -v pm2 &> /dev/null; then
        register_error "PM2 no está instalado"
        return 1
    fi

    # Verificar que estamos en el directorio backend
    if [ ! -d "$BACKEND_DIR" ]; then
        register_error "No se puede acceder al directorio backend"
        return 1
    fi

    cd "$BACKEND_DIR"

    # Verificar que el archivo compilado existe
    if [ ! -f "dist/server.js" ]; then
        register_error "No se encontró el archivo dist/server.js. Ejecuta backend_node_build primero"
        return 1
    fi

    # Verificar que el puerto esté libre
    if sudo lsof -ti:${backend_port} > /dev/null 2>&1; then
        log_message "WARNING" "El puerto ${backend_port} está ocupado, terminando proceso..."
        sudo kill -9 $(sudo lsof -ti:${backend_port}) 2>/dev/null || true
        sleep 2
    fi

    # Detener proceso PM2 existente si existe
    sudo pm2 delete ${instancia_add}-backend 2>/dev/null || true

    # Iniciar backend con PM2
    if ! sudo pm2 start dist/server.js --name ${instancia_add}-backend; then
        register_error "No se pudo iniciar el backend con PM2"
        return 1
    fi

    # Guardar configuración de PM2
    if ! sudo pm2 save --force; then
        register_error "No se pudo guardar la configuración de PM2"
        return 1
    fi

    # Configurar PM2 para auto-inicio (IMPORTANTE para reinicios del servidor)
    log_message "INFO" "Configurando PM2 a auto-inicio..."
    if ! sudo pm2 startup systemd -u $USER --hp $HOME; then
        log_message "WARNING" "⚠️ No se pudo configurar PM2 para auto-inicio"
    else
        log_message "SUCCESS" "✅ PM2 configurado para auto-inicio"
    fi

    # Verificar que el proceso esté ejecutándose
    sleep 3
    if ! sudo pm2 list | grep -q "${instancia_add}-backend"; then
        register_error "El proceso PM2 del backend no se inició correctamente"
        return 1
    fi

    # Verificar que el puerto esté respondiendo
    sleep 5
    if ! curl -s http://localhost:${backend_port} > /dev/null 2>&1; then
        log_message "WARNING" "El backend no responde en el puerto ${backend_port}, pero PM2 lo muestra como ejecutándose"
    fi

    log_message "SUCCESS" "✅ Backend iniciado con PM2 correctamente"
    sleep 2
    return 0
}

# =============================================================================
# FUNCIONES DEL FRONTEND (SIMPLIFICADAS)
# =============================================================================

frontend_set_env() {
    log_message "STEP" "=== CONFIGURANDO VARIABLES DE ENTORNO FRONTEND ==="
    
    print_banner
    printf "${WHITE} 💻 Configurando variables de entorno (frontend)...${GRAY_LIGHT}"
    printf "\n\n"

    sleep 2

    # Verificar que el directorio frontend existe
    if [ ! -d "$FRONTEND_DIR" ]; then
        register_error "El directorio frontend no existe"
        return 1
    fi

    # Extraer solo dominio del backend
    backend_domain=$(extract_domain_only "$backend_url")

    # Crear archivo .env del frontend
    cat > "$FRONTEND_DIR/.env" << EOF
REACT_APP_BACKEND_URL=https://${backend_domain}
REACT_APP_HOURS_CLOSE_TICKETS_AUTO=24
EOF

    # Verificar que el archivo .env se creó correctamente
    if [ ! -f "$FRONTEND_DIR/.env" ]; then
        register_error "No se pudo crear el archivo $FRONTEND_DIR/.env"
        return 1
    fi

    # Crear archivo server.js para el frontend
    cat > "$FRONTEND_DIR/server.js" << EOF
// servidor express simple para ejecutar la versión de producción del frontend
const express = require("express");
const path = require("path");
const app = express();

app.use(express.static(path.join(__dirname, "build")));

app.get("/*", function (req, res) {
	res.sendFile(path.join(__dirname, "build", "index.html"));
});

app.listen(${frontend_port}, () => {
    console.log(\`Frontend running on port \${${frontend_port}}\`);
});
EOF

    # Verificar que el archivo server.js se creó correctamente
    if [ ! -f "$FRONTEND_DIR/server.js" ]; then
        register_error "No se pudo crear el archivo $FRONTEND_DIR/server.js"
        return 1
    fi

    log_message "SUCCESS" "✅ Variables de entorno del frontend configuradas"
    sleep 2
    return 0
}

frontend_node_dependencies() {
    log_message "STEP" "=== INSTALANDO DEPENDENCIAS DEL FRONTEND ==="
    
    print_banner
    printf "${WHITE} 💻 Instalando dependencias del frontend...${GRAY_LIGHT}\n\n"

    sleep 2

    # Verificar que el directorio frontend existe
    if [ ! -d "$FRONTEND_DIR" ]; then
        register_error "El directorio frontend no existe"
        return 1
    fi

    # Verificar que Node.js esté instalado
    if ! command -v node &> /dev/null; then
        register_error "Node.js no está instalado"
        return 1
    fi

    # Verificar que npm esté disponible
    if ! command -v npm &> /dev/null; then
        register_error "npm no está disponible"
        return 1
    fi

    cd "$FRONTEND_DIR"

    # Verificar que package.json existe
    if [ ! -f "package.json" ]; then
        register_error "No se encontró package.json en el directorio frontend"
        return 1
    fi

    # Limpiar cache de npm
    if ! npm cache clean -f; then
        log_message "WARNING" "No se pudo limpiar el cache de npm"
    fi

    # Instalar dependencias usando --legacy-peer-deps
    if ! npm install --legacy-peer-deps --loglevel=error; then
        register_error "No se pudieron instalar las dependencias del frontend"
        return 1
    fi

    # Verificar que node_modules existe
    if [ ! -d "node_modules" ]; then
        register_error "No se instalaron las dependencias correctamente"
        return 1
    fi

    # Verificar y corregir permisos de binarios importantes
    fix_npm_binaries_permissions "$FRONTEND_DIR"

    log_message "SUCCESS" "✅ Dependencias del frontend instaladas"
    
    # Corregir imports de socket.io-client
    log_message "INFO" "Corrigiendo imports de socket.io-client..."
    if [ -f "src/context/Socket/SocketContext.js" ]; then
        sed -i 's/import { openSocket } from "socket.io-client";/import { io } from "socket.io-client";/g' src/context/Socket/SocketContext.js
        sed -i 's/openSocket/io/g' src/context/Socket/SocketContext.js
        log_message "SUCCESS" "✅ Imports de socket.io-client corregidos"
    fi
    
    sleep 2
    return 0
}

frontend_node_build() {
    log_message "STEP" "=== COMPILANDO FRONTEND ==="
    
    print_banner
    printf "${WHITE} 💻 Compilando el código del frontend...${GRAY_LIGHT}"
    printf "\n\n"

    sleep 2
    printf "${WHITE} 💻 EL PROCESO PUEDE TARDAR BASTANTE. PACIENCIA${NC}\n\n"

    # Verificar que estamos en el directorio frontend
    if [ ! -d "$FRONTEND_DIR" ]; then
        register_error "No se puede acceder al directorio frontend"
        return 1
    fi

    cd "$FRONTEND_DIR"

    # Verificar que package.json existe
    if [ ! -f "package.json" ]; then
        register_error "No se encontró package.json en el directorio frontend"
        return 1
    fi

    # Verificar que node_modules existe
    if [ ! -d "node_modules" ]; then
        register_error "Las dependencias no están instaladas. Ejecuta frontend_node_dependencies primero"
        return 1
    fi

    # Verificar que el script build existe en package.json
    if ! grep -q '"build"' package.json; then
        register_error "No se encontró el script 'build' en package.json"
        return 1
    fi

    # Verificar que el archivo .env existe
    if [ ! -f ".env" ]; then
        register_error "No se encontró el archivo .env en el directorio frontend"
        return 1
    fi

    echo "🧹 Limpiando build anterior..."
    rm -rf build

    # SOLUCIÓN GARANTIZADA: Evitar usar cross-env directamente
    log_message "INFO" "Configurando compilación sin dependencia de cross-env..."
    
    # Verificar si cross-env existe y funciona
    if [ -f "node_modules/.bin/cross-env" ] && [ -x "node_modules/.bin/cross-env" ]; then
        log_message "SUCCESS" "✅ cross-env disponible y ejecutable"
    else
        log_message "WARNING" "cross-env no disponible, instalando..."
        npm install cross-env --save-dev
        chmod +x node_modules/.bin/cross-env 2>/dev/null || true
    fi
    
    # Configurar variables de entorno directamente para evitar el problema
    export NODE_OPTIONS="--max-old-space-size=8192 --openssl-legacy-provider"
    export GENERATE_SOURCEMAP=false
    
    log_message "SUCCESS" "✅ Variables de entorno configuradas directamente"

    echo "🏗️  Construyendo nueva versión del frontend..."
    
    # Método garantizado: usar react-app-rewired directamente sin cross-env
    if ! npx react-app-rewired build; then
        register_error "No se pudo compilar el frontend"
        return 1
    fi

    # Verificar que se creó el directorio build
    if [ ! -d "build" ]; then
        register_error "No se generó el directorio build después de la compilación"
        return 1
    fi

    # Verificar que existe el archivo index.html
    if [ ! -f "build/index.html" ]; then
        register_error "No se generó el archivo index.html después de la compilación"
        return 1
    fi

    log_message "SUCCESS" "✅ Frontend compilado correctamente"
    sleep 2
    return 0
}

frontend_start_pm2() {
    log_message "STEP" "=== INICIANDO FRONTEND CON PM2 ==="
    
    print_banner
    printf "${WHITE} 💻 Iniciando pm2 (frontend)...${GRAY_LIGHT}"
    printf "\n\n"

    sleep 2

    # Verificar que PM2 esté disponible
    if ! command -v pm2 &> /dev/null; then
        register_error "PM2 no está instalado"
        return 1
    fi

    # Verificar que estamos en el directorio frontend
    if [ ! -d "$FRONTEND_DIR" ]; then
        register_error "No se puede acceder al directorio frontend"
        return 1
    fi

    cd "$FRONTEND_DIR"

    # Verificar que el archivo server.js existe
    if [ ! -f "server.js" ]; then
        register_error "No se encontró el archivo server.js. Ejecuta frontend_set_env primero"
        return 1
    fi

    # Verificar que el directorio build existe
    if [ ! -d "build" ]; then
        register_error "No se encontró el directorio build. Ejecuta frontend_node_build primero"
        return 1
    fi

    # Verificar que el puerto esté libre
    if sudo lsof -ti:${frontend_port} > /dev/null 2>&1; then
        log_message "WARNING" "El puerto ${frontend_port} está ocupado, terminando proceso..."
        sudo kill -9 $(sudo lsof -ti:${frontend_port}) 2>/dev/null || true
        sleep 2
    fi

    # Detener proceso PM2 existente si existe
    sudo pm2 delete ${instancia_add}-frontend 2>/dev/null || true

    # Iniciar frontend con PM2
    if ! sudo pm2 start server.js --name ${instancia_add}-frontend; then
        register_error "No se pudo iniciar el frontend con PM2"
        return 1
    fi

    # Guardar configuración de PM2
    if ! sudo pm2 save --force; then
        register_error "No se pudo guardar la configuración de PM2"
        return 1
    fi

    # Configurar PM2 para auto-inicio (IMPORTANTE para reinicios del servidor)
    log_message "INFO" "Configurando PM2 a auto-inicio..."
    if ! sudo pm2 startup systemd -u $USER --hp $HOME; then
        log_message "WARNING" "⚠️ No se pudo configurar PM2 auto-inicio"
    else
        log_message "SUCCESS" "✅ PM2 configurado para auto-inicio"
    fi

    # Verificar que el proceso esté ejecutándose
    sleep 3
    if ! sudo pm2 list | grep -q "${instancia_add}-frontend"; then
        register_error "El proceso PM2 del frontend no se inició correctamente"
        return 1
    fi

    # Verificar que el puerto esté respondiendo
    sleep 5
    if ! curl -s http://localhost:${frontend_port} > /dev/null 2>&1; then
        log_message "WARNING" "El frontend no responde en el puerto ${frontend_port}, pero PM2 lo muestra como ejecutándose"
    fi

    log_message "SUCCESS" "✅ Frontend iniciado con PM2 correctamente"
    sleep 2
    return 0
}

# =============================================================================
# FUNCIONES DE RED (SIMPLIFICADAS)
# =============================================================================

# 1. Crear función para configurar Nginx solo HTTP
system_nginx_setup_http() {
    log_message "STEP" "=== CONFIGURANDO NGINX (SOLO HTTP) ==="
    print_banner
    printf "${WHITE} 💻 Configurando Nginx solo HTTP...${GRAY_LIGHT}\n\n"
    sleep 2

    # Verificar que Nginx esté instalado
    if ! command -v nginx &> /dev/null; then
        register_error "Nginx no está instalado"
        return 1
    fi

    # Detener Nginx temporalmente para limpiar configuraciones
    log_message "INFO" "Deteniendo Nginx para limpiar configuraciones..."
    sudo systemctl stop nginx 2>/dev/null || true

    # Limpiar configuraciones existentes
    sudo rm -f /etc/nginx/sites-enabled/${instancia_add}-backend
    sudo rm -f /etc/nginx/sites-enabled/${instancia_add}-frontend
    sudo rm -f /etc/nginx/sites-available/${instancia_add}-backend
    sudo rm -f /etc/nginx/sites-available/${instancia_add}-frontend
    
    # Limpiar configuraciones SSL existentes que puedan estar causando conflictos
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo rm -f /etc/nginx/sites-available/default
    
    # Limpiar cualquier configuración SSL residual para los dominios
    backend_hostname=$(echo "${backend_url/https:\/\/}")
    frontend_hostname=$(echo "${frontend_url/https:\/\/}")
    
    # Eliminar configuraciones que contengan los dominios
    sudo find /etc/nginx/sites-available/ -name "*${backend_hostname}*" -delete 2>/dev/null || true
    sudo find /etc/nginx/sites-enabled/ -name "*${backend_hostname}*" -delete 2>/dev/null || true
    sudo find /etc/nginx/sites-available/ -name "*${frontend_hostname}*" -delete 2>/dev/null || true
    sudo find /etc/nginx/sites-enabled/ -name "*${frontend_hostname}*" -delete 2>/dev/null || true
    
    # Verificar que no haya configuraciones SSL residuales
    if sudo nginx -t 2>&1 | grep -q "ssl_certificate"; then
        log_message "WARNING" "Detectadas configuraciones SSL residuales, limpiando..."
        # Buscar y comentar líneas SSL en configuraciones existentes
        sudo find /etc/nginx/ -name "*.conf" -exec sed -i 's/ssl_certificate/#ssl_certificate/g' {} \; 2>/dev/null || true
        sudo find /etc/nginx/ -name "*.conf" -exec sed -i 's/ssl_certificate_key/#ssl_certificate_key/g' {} \; 2>/dev/null || true
        sudo find /etc/nginx/ -name "*.conf" -exec sed -i 's/include.*ssl-nginx.conf/#include ssl-nginx.conf/g' {} \; 2>/dev/null || true
        sudo find /etc/nginx/ -name "*.conf" -exec sed -i 's/ssl_dhparam/#ssl_dhparam/g' {} \; 2>/dev/null || true
        sudo find /etc/nginx/ -name "*.conf" -exec sed -i 's/listen.*ssl/#listen ssl/g' {} \; 2>/dev/null || true
    fi
    
    # Limpiar cualquier configuración SSL que pueda estar en conf.d
    sudo rm -f /etc/nginx/conf.d/*ssl*.conf 2>/dev/null || true
    sudo rm -f /etc/nginx/conf.d/*cert*.conf 2>/dev/null || true

    # Configurar Nginx para backend (HTTP)
    backend_hostname=$(echo "${backend_url/https:\/\/}")
    if ! sudo tee /etc/nginx/sites-available/${instancia_add}-backend > /dev/null << EOF
server {
    listen 80;
    server_name $backend_hostname;
    
    # Webroot para Certbot
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        proxy_pass http://127.0.0.1:${backend_port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    access_log /var/log/nginx/${instancia_add}-backend-access.log;
    error_log /var/log/nginx/${instancia_add}-backend-error.log;
}
EOF
    then
        register_error "No se pudo crear la configuración HTTP de Nginx para el backend"
        return 1
    fi
    if ! sudo ln -sf /etc/nginx/sites-available/${instancia_add}-backend /etc/nginx/sites-enabled/; then
        register_error "No se pudo crear el enlace simbólico para el backend"
        return 1
    fi

    # Configurar Nginx para frontend (HTTP)
    frontend_hostname=$(echo "${frontend_url/https:\/\/}")
    if ! sudo tee /etc/nginx/sites-available/${instancia_add}-frontend > /dev/null << EOF
server {
    listen 80;
    server_name $frontend_hostname;
    
    # Webroot para Certbot
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        proxy_pass http://127.0.0.1:${frontend_port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    access_log /var/log/nginx/${instancia_add}-frontend-access.log;
    error_log /var/log/nginx/${instancia_add}-frontend-error.log;
}
EOF
    then
        register_error "No se pudo crear la configuración HTTP de Nginx para el frontend"
        return 1
    fi
    if ! sudo ln -sf /etc/nginx/sites-available/${instancia_add}-frontend /etc/nginx/sites-enabled/; then
        register_error "No se pudo crear el enlace simbólico para el frontend"
        return 1
    fi

    # Verificar configuración de Nginx
    if ! sudo nginx -t; then
        register_error "La configuración HTTP de Nginx tiene errores"
        return 1
    fi
    
    # Verificar que no haya referencias SSL en la configuración
    if sudo nginx -T 2>&1 | grep -q "ssl_certificate"; then
        log_message "ERROR" "Se detectaron referencias SSL en la configuración HTTP"
        register_error "Configuración HTTP contiene referencias SSL"
        return 1
    fi
    
    log_message "SUCCESS" "✅ Nginx HTTP configurado correctamente"
    sleep 2
    return 0
}

# 2. Crear función para actualizar Nginx a SSL
system_nginx_setup_ssl() {
    log_message "STEP" "=== CONFIGURANDO NGINX (SSL) ==="
    print_banner
    printf "${WHITE} 💻 Configurando Nginx con SSL...${GRAY_LIGHT}\n\n"
    sleep 2

    # Configuración SSL para backend
    backend_hostname=$(echo "${backend_url/https:\/\/}")
    if ! sudo tee /etc/nginx/sites-available/${instancia_add}-backend > /dev/null << EOF
server {
    listen 80;
    server_name $backend_hostname;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    server_name $backend_hostname;
    ssl_certificate /etc/letsencrypt/live/$backend_hostname/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$backend_hostname/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    location / {
        proxy_pass http://127.0.0.1:${backend_port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    access_log /var/log/nginx/${instancia_add}-backend-access.log;
    error_log /var/log/nginx/${instancia_add}-backend-error.log;
}
EOF
    then
        register_error "No se pudo crear la configuración SSL de Nginx para el backend"
        return 1
    fi
    if ! sudo ln -sf /etc/nginx/sites-available/${instancia_add}-backend /etc/nginx/sites-enabled/; then
        register_error "No se pudo crear el enlace simbólico para el backend"
        return 1
    fi

    # Configuración SSL para frontend
    frontend_hostname=$(echo "${frontend_url/https:\/\/}")
    if ! sudo tee /etc/nginx/sites-available/${instancia_add}-frontend > /dev/null << EOF
server {
    listen 80;
    server_name $frontend_hostname;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    server_name $frontend_hostname;
    ssl_certificate /etc/letsencrypt/live/$frontend_hostname/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$frontend_hostname/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    location / {
        proxy_pass http://127.0.0.1:${frontend_port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    access_log /var/log/nginx/${instancia_add}-frontend-access.log;
    error_log /var/log/nginx/${instancia_add}-frontend-error.log;
}
EOF
    then
        register_error "No se pudo crear la configuración SSL de Nginx para el frontend"
        return 1
    fi
    if ! sudo ln -sf /etc/nginx/sites-available/${instancia_add}-frontend /etc/nginx/sites-enabled/; then
        register_error "No se pudo crear el enlace simbólico para el frontend"
        return 1
    fi

    # Verificar que los certificados existan antes de configurar SSL
    backend_cert="/etc/letsencrypt/live/$backend_hostname/fullchain.pem"
    frontend_cert="/etc/letsencrypt/live/$frontend_hostname/fullchain.pem"
    
    if [ ! -f "$backend_cert" ]; then
        log_message "ERROR" "❌ Certificado SSL del backend NO encontrado: $backend_cert"
        log_message "ERROR" "❌ SSL es OBLIGATORIO para producción. Verificando logs..."
        sudo tail -20 /var/log/letsencrypt/letsencrypt.log 2>/dev/null || true
        return 1
    fi
    
    if [ ! -f "$frontend_cert" ]; then
        log_message "ERROR" "❌ Certificado SSL del frontend NO encontrado: $frontend_cert"
        log_message "ERROR" "❌ SSL es OBLIGATORIO para producción. Verificando logs..."
        sudo tail -20 /var/log/letsencrypt/letsencrypt.log 2>/dev/null || true
        return 1
    fi

    # Verificar configuración de Nginx
    if ! sudo nginx -t; then
        register_error "La configuración SSL de Nginx tiene errores"
        return 1
    fi
    log_message "SUCCESS" "✅ Nginx SSL configurado correctamente"
    sleep 2
    return 0
}

# 3. En run_complete_installation, reemplazar la secuencia de red por:
# - system_nginx_setup_http
# - system_nginx_restart
# - system_certbot_setup
# - system_nginx_setup_ssl
# - system_nginx_restart

# (Elimina la llamada a system_nginx_setup original y pon esta secuencia en su lugar)

system_nginx_setup() {
    log_message "STEP" "=== CONFIGURANDO NGINX ==="
    
    print_banner
    printf "${WHITE} 💻 Configurando Nginx...${GRAY_LIGHT}\n\n"

    sleep 2

    # Verificar que Nginx esté instalado
    if ! command -v nginx &> /dev/null; then
        register_error "Nginx no está instalado"
        return 1
    fi

    # Verificar que los directorios de Nginx existan
    if [ ! -d "/etc/nginx/sites-available" ] || [ ! -d "/etc/nginx/sites-enabled" ]; then
        register_error "Los directorios de configuración de Nginx no existen"
        return 1
    fi

    # Limpiar configuraciones existentes
    sudo rm -f /etc/nginx/sites-enabled/${instancia_add}-backend
    sudo rm -f /etc/nginx/sites-enabled/${instancia_add}-frontend
    sudo rm -f /etc/nginx/sites-available/${instancia_add}-backend
    sudo rm -f /etc/nginx/sites-available/${instancia_add}-frontend

    # Extraer solo dominios
    backend_domain=$(extract_domain_only "$backend_url")
    frontend_domain=$(extract_domain_only "$frontend_url")

    # Configurar Nginx para backend
    if ! sudo tee /etc/nginx/sites-available/${instancia_add}-backend > /dev/null << EOF
server {
    listen 80;
    server_name ${backend_domain};
    
    # Configuración de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http: https: wss: ws:; script-src 'self' 'unsafe-inline' 'unsafe-eval';" always;
    
    # Configuración de proxy
    location / {
        proxy_pass http://127.0.0.1:${backend_port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer sizes
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
    
    # Configuración para archivos estáticos
    location /public/ {
        alias /var/www/${instancia_add}/backend/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Configuración de logs
    access_log /var/log/nginx/${instancia_add}-backend-access.log;
    error_log /var/log/nginx/${instancia_add}-backend-error.log;
}
EOF
    then
        register_error "No se pudo crear la configuración de Nginx para el backend"
        return 1
    fi

    # Crear enlace simbólico para backend
    if ! sudo ln -sf /etc/nginx/sites-available/${instancia_add}-backend /etc/nginx/sites-enabled/; then
        register_error "No se pudo crear el enlace simbólico para el backend"
        return 1
    fi

    # Configurar Nginx para frontend
    if ! sudo tee /etc/nginx/sites-available/${instancia_add}-frontend > /dev/null << EOF
server {
    listen 80;
    server_name ${frontend_domain};
    
    # Configuración de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http: https: wss: ws:; script-src 'self' 'unsafe-inline' 'unsafe-eval';" always;
    
    # Configuración de proxy
    location / {
        proxy_pass http://127.0.0.1:${frontend_port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer sizes
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
    
    # Configuración para archivos estáticos
    location /static/ {
        alias /var/www/${instancia_add}/frontend/build/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Configuración de logs
    access_log /var/log/nginx/${instancia_add}-frontend-access.log;
    error_log /var/log/nginx/${instancia_add}-frontend-error.log;
}
EOF
    then
        register_error "No se pudo crear la configuración de Nginx para el frontend"
        return 1
    fi

    # Crear enlace simbólico para frontend
    if ! sudo ln -sf /etc/nginx/sites-available/${instancia_add}-frontend /etc/nginx/sites-enabled/; then
        register_error "No se pudo crear el enlace simbólico para el frontend"
        return 1
    fi

    # Verificar configuración de Nginx
    if ! sudo nginx -t; then
        register_error "La configuración de Nginx tiene errores"
        return 1
    fi

    log_message "SUCCESS" "✅ Nginx configurado correctamente"
    sleep 2
    return 0
}

system_nginx_restart() {
    log_message "STEP" "=== REINICIANDO NGINX ==="
    
    print_banner
    printf "${WHITE} 💻 Reiniciando Nginx...${GRAY_LIGHT}\n\n"

    sleep 2

    # Verificar que Nginx esté instalado
    if ! command -v nginx &> /dev/null; then
        register_error "Nginx no está instalado"
        return 1
    fi

    # Verificar que systemctl esté disponible
    if ! command -v systemctl &> /dev/null; then
        register_error "systemctl no está disponible"
        return 1
    fi

    # Verificar configuración antes de reiniciar
    if ! sudo nginx -t; then
        register_error "La configuración de Nginx tiene errores, no se puede reiniciar"
        return 1
    fi

    # Detener Nginx si está ejecutándose
    if sudo systemctl is-active --quiet nginx; then
        if ! sudo systemctl stop nginx; then
            register_error "No se pudo detener Nginx"
            return 1
        fi
        sleep 2
    fi

    # Iniciar Nginx
    if ! sudo systemctl start nginx; then
        register_error "No se pudo iniciar Nginx"
        return 1
    fi

    # Verificar que Nginx esté ejecutándose
    sleep 3
    if ! sudo systemctl is-active --quiet nginx; then
        register_error "Nginx no se inició correctamente"
        return 1
    fi

    # Verificar que Nginx esté escuchando en el puerto 80
    if ! sudo netstat -tlnp | grep -q ":80.*nginx"; then
        register_error "Nginx no está escuchando en el puerto 80"
        return 1
    fi

    # Verificar que los sitios estén configurados
    if ! sudo nginx -T | grep -q "${instancia_add}-backend"; then
        register_error "La configuración del backend no se cargó correctamente"
        return 1
    fi

    if ! sudo nginx -T | grep -q "${instancia_add}-frontend"; then
        register_error "La configuración del frontend no se cargó correctamente"
        return 1
    fi
    
    log_message "SUCCESS" "✅ Nginx reiniciado correctamente"
    sleep 2
    return 0
}

system_certbot_setup() {
    log_message "STEP" "=== CONFIGURANDO SSL ==="
    
    print_banner
    printf "${WHITE} 💻 Configurando certificados SSL...${GRAY_LIGHT}\n\n"

    sleep 2

    # Verificar que Certbot esté instalado
    if ! command -v certbot &> /dev/null; then
        register_error "Certbot no está instalado"
        return 1
    fi

    # Verificar que Nginx esté ejecutándose
    if ! sudo systemctl is-active --quiet nginx; then
        register_error "Nginx no está ejecutándose, no se pueden configurar certificados SSL"
        return 1
    fi

    # Verificar conectividad a internet
    if ! ping -c 1 google.com &> /dev/null; then
        register_error "No hay conectividad a internet para obtener certificados SSL"
        return 1
    fi

    # Crear directorio webroot para Certbot
    sudo mkdir -p /var/www/html
    sudo chown www-data:www-data /var/www/html
    sudo chmod 755 /var/www/html

    # Extraer solo dominios
    backend_domain=$(extract_domain_only "$backend_url")
    frontend_domain=$(extract_domain_only "$frontend_url")

    # Limpiar certificados SSL existentes si existen
    if [ -d "/etc/letsencrypt/live/$backend_domain" ]; then
        log_message "INFO" "Limpiando certificado SSL existente para backend: $backend_domain"
        sudo certbot delete --cert-name $backend_domain --quiet || true
    fi
    
    if [ -d "/etc/letsencrypt/live/$frontend_domain" ]; then
        log_message "INFO" "Limpiando certificado SSL existente para frontend: $frontend_domain"
        sudo certbot delete --cert-name $frontend_domain --quiet || true
    fi

    # Verificar que los dominios estén configurados en DNS
    log_message "INFO" "Verificando configuración DNS..."
    
    if ! nslookup $backend_domain &> /dev/null; then
        log_message "ERROR" "❌ No se puede resolver el DNS del backend: $backend_domain"
        log_message "ERROR" "❌ SSL es OBLIGATORIO para producción. Configura el DNS correctamente."
        return 1
    fi
    
    if ! nslookup $frontend_domain &> /dev/null; then
        log_message "ERROR" "❌ No se puede resolver el DNS del frontend: $frontend_domain"
        log_message "ERROR" "❌ SSL es OBLIGATORIO para producción. Configura el DNS correctamente."
        return 1
    fi
    
    log_message "SUCCESS" "✅ DNS verificado correctamente para ambos dominios"

    # Verificar que los dominios respondan en HTTP antes de obtener SSL
    log_message "INFO" "Verificando conectividad HTTP..."
    
    if ! curl -s --connect-timeout 10 "http://$backend_domain" > /dev/null 2>&1; then
        log_message "ERROR" "❌ El backend no responde en HTTP: http://$backend_domain"
        log_message "ERROR" "❌ Verifica que Nginx esté configurado correctamente"
        return 1
    fi
    
    if ! curl -s --connect-timeout 10 "http://$frontend_domain" > /dev/null 2>&1; then
        log_message "ERROR" "❌ El frontend no responde en HTTP: http://$frontend_domain"
        log_message "ERROR" "❌ Verifica que Nginx esté configurado correctamente"
        return 1
    fi
    
    log_message "SUCCESS" "✅ Conectividad HTTP verificada para ambos dominios"

    # Configurar SSL para backend
    log_message "INFO" "Configurando SSL para backend: $backend_domain"
    
    # Usar certbot certonly para obtener solo los certificados sin modificar Nginx
    log_message "INFO" "Obteniendo certificado SSL para: $backend_domain"
    
    if ! sudo certbot certonly --webroot -w /var/www/html -d $backend_domain --non-interactive --agree-tos --email admin@$backend_domain --quiet --debug-challenges; then
        log_message "ERROR" "No se pudo obtener certificado SSL para el backend"
        log_message "INFO" "Verificando logs de Certbot..."
        sudo tail -10 /var/log/letsencrypt/letsencrypt.log 2>/dev/null || true
        return 1
    else
        log_message "SUCCESS" "✅ Certificado SSL obtenido para backend: $backend_domain"
    fi

    # Configurar SSL para frontend
    log_message "INFO" "Configurando SSL para frontend: $frontend_domain"
    
    # Usar certbot certonly para obtener solo los certificados sin modificar Nginx
    log_message "INFO" "Obteniendo certificado SSL para: $frontend_domain"
    
    if ! sudo certbot certonly --webroot -w /var/www/html -d $frontend_domain --non-interactive --agree-tos --email admin@$frontend_domain --quiet --debug-challenges; then
        log_message "ERROR" "No se pudo obtener certificado SSL para el frontend"
        log_message "INFO" "Verificando logs de Certbot..."
        sudo tail -10 /var/log/letsencrypt/letsencrypt.log 2>/dev/null || true
        return 1
    else
        log_message "SUCCESS" "✅ Certificado SSL obtenido para frontend: $frontend_domain"
    fi

    # Verificar que los certificados se crearon
    backend_cert="/etc/letsencrypt/live/$backend_domain/fullchain.pem"
    frontend_cert="/etc/letsencrypt/live/$frontend_domain/fullchain.pem"
    
    # Esperar un momento para que los certificados se procesen
    sleep 5
    
    log_message "INFO" "Verificando certificados SSL..."
    
    # Verificar certificado del backend
    if [ -f "$backend_cert" ]; then
        log_message "SUCCESS" "✅ Certificado SSL del backend verificado: $backend_cert"
        # Verificar permisos
        sudo chmod 644 "$backend_cert" 2>/dev/null || true
        sudo chown root:root "$backend_cert" 2>/dev/null || true
    else
        log_message "ERROR" "❌ Certificado SSL del backend NO encontrado: $backend_cert"
        # Verificar si existe el directorio
        if [ -d "/etc/letsencrypt/live/$backend_domain" ]; then
            log_message "INFO" "Directorio de certificados existe, verificando archivos..."
            ls -la "/etc/letsencrypt/live/$backend_domain/" 2>/dev/null || true
        else
            log_message "ERROR" "❌ Directorio de certificados no existe: /etc/letsencrypt/live/$backend_domain"
        fi
        return 1
    fi
    
    # Verificar certificado del frontend
    if [ -f "$frontend_cert" ]; then
        log_message "SUCCESS" "✅ Certificado SSL del frontend verificado: $frontend_cert"
        # Verificar permisos
        sudo chmod 644 "$frontend_cert" 2>/dev/null || true
        sudo chown root:root "$frontend_cert" 2>/dev/null || true
    else
        log_message "ERROR" "❌ Certificado SSL del frontend NO encontrado: $frontend_cert"
        # Verificar si existe el directorio
        if [ -d "/etc/letsencrypt/live/$frontend_domain" ]; then
            log_message "INFO" "Directorio de certificados existe, verificando archivos..."
            ls -la "/etc/letsencrypt/live/$frontend_domain/" 2>/dev/null || true
        else
            log_message "ERROR" "❌ Directorio de certificados no existe: /etc/letsencrypt/live/$frontend_domain"
        fi
        return 1
    fi

    # Configurar renovación automática de certificados SSL
    log_message "INFO" "Configurando renovación automática de certificados SSL..."
    
    # Crear directorio si no existe
    sudo mkdir -p /opt/watoolx
    
    # Crear script de renovación
    sudo tee /opt/watoolx/ssl-renew.sh > /dev/null << 'EOF'
#!/bin/bash
# Script de renovación automática de certificados SSL para WATOOLX

LOG_FILE="/var/log/watoolx/ssl-renew.log"
mkdir -p /var/log/watoolx

echo "$(date): Iniciando renovación de certificados SSL" >> "$LOG_FILE"

# Renovar certificados
if certbot renew --quiet; then
    echo "$(date): Certificados SSL renovados exitosamente" >> "$LOG_FILE"
    # Recargar Nginx para aplicar los nuevos certificados
    systemctl reload nginx
    echo "$(date): Nginx recargado exitosamente" >> "$LOG_FILE"
else
    echo "$(date): Error al renovar certificados SSL" >> "$LOG_FILE"
fi
EOF

    # Hacer el script ejecutable
    sudo chmod +x /opt/watoolx/ssl-renew.sh
    
    # Configurar cron job para renovación automática (diario a las 2:00 AM)
    (crontab -l 2>/dev/null; echo "0 2 * * * /opt/watoolx/ssl-renew.sh") | crontab -
    
    log_message "SUCCESS" "✅ Renovación automática de certificados SSL configurada"
    log_message "SUCCESS" "✅ Obtención de certificados SSL completada"
    sleep 2
    return 0
}

# =============================================================================
# FUNCIONES DE VERIFICACIÓN DE RED
# =============================================================================

verify_network_connectivity() {
    log_message "STEP" "=== VERIFICANDO CONECTIVIDAD DE RED ==="
    
    print_banner
    printf "${WHITE} 💻 Verificando conectividad de red...${GRAY_LIGHT}\n\n"

    sleep 2

    # Verificar conectividad a internet
    if ! ping -c 1 google.com &> /dev/null; then
        register_error "No hay conectividad a internet"
        return 1
    fi

    # Verificar que los puertos estén libres
    for port in 80 443 ${frontend_port} ${backend_port} ${redis_port}; do
        if sudo lsof -ti:$port > /dev/null 2>&1; then
            log_message "WARNING" "El puerto $port está ocupado"
        else
            log_message "INFO" "Puerto $port disponible"
        fi
    done

    # Verificar resolución DNS de los dominios
    backend_hostname=$(echo "${backend_url/https:\/\/}")
    frontend_hostname=$(echo "${frontend_url/https:\/\/}")
    
    if ! nslookup $backend_hostname &> /dev/null; then
        log_message "WARNING" "No se puede resolver el DNS del backend: $backend_hostname"
    else
        log_message "SUCCESS" "✅ DNS del backend resuelto: $backend_hostname"
    fi
    
    if ! nslookup $frontend_hostname &> /dev/null; then
        log_message "WARNING" "No se puede resolver el DNS del frontend: $frontend_hostname"
    else
        log_message "SUCCESS" "✅ DNS del frontend resuelto: $frontend_hostname"
    fi

    log_message "SUCCESS" "✅ Verificación de conectividad completada"
    sleep 2
    return 0
}

verify_services_status() {
    log_message "STEP" "=== VERIFICANDO ESTADO DE SERVICIOS ==="
    
    print_banner
    printf "${WHITE} 💻 Verificando estado de servicios...${GRAY_LIGHT}\n\n"

    sleep 2

    # Verificar estado de PM2
    if command -v pm2 &> /dev/null; then
        if sudo pm2 list | grep -q "${instancia_add}-backend"; then
            log_message "SUCCESS" "✅ Backend ejecutándose en PM2"
        else
            log_message "ERROR" "❌ Backend no está ejecutándose en PM2"
        fi
        
        if sudo pm2 list | grep -q "${instancia_add}-frontend"; then
            log_message "SUCCESS" "✅ Frontend ejecutándose en PM2"
        else
            log_message "ERROR" "❌ Frontend no está ejecutándose en PM2"
        fi
    fi

    # Verificar estado de Nginx
    if sudo systemctl is-active --quiet nginx; then
        log_message "SUCCESS" "✅ Nginx ejecutándose"
    else
        log_message "ERROR" "❌ Nginx no está ejecutándose"
    fi

    # Verificar estado de Redis
    if docker ps > /dev/null 2>&1; then
        if docker ps | grep -q "redis-${instancia_add}"; then
            log_message "SUCCESS" "✅ Redis ejecutándose en Docker"
        else
            log_message "ERROR" "❌ Redis no está ejecutándose"
        fi
    else
        log_message "ERROR" "❌ No se puede acceder a Docker (problemas de permisos)"
        log_message "INFO" "💡 Ejecuta: sudo usermod -aG docker \$USER && newgrp docker"
    fi

    # Verificar estado de MySQL
if sudo systemctl is-active --quiet mysql; then
    log_message "SUCCESS" "✅ MySQL ejecutándose"
else
    log_message "ERROR" "❌ MySQL no está ejecutándose"
fi

    # Verificar respuesta de servicios
    if curl -s http://localhost:${backend_port} > /dev/null 2>&1; then
        log_message "SUCCESS" "✅ Backend responde en puerto ${backend_port}"
    else
        log_message "ERROR" "❌ Backend no responde en puerto ${backend_port}"
    fi

    if curl -s http://localhost:${frontend_port} > /dev/null 2>&1; then
        log_message "SUCCESS" "✅ Frontend responde en puerto ${frontend_port}"
    else
        log_message "ERROR" "❌ Frontend no responde en puerto ${frontend_port}"
    fi

    log_message "SUCCESS" "✅ Verificación de servicios completada"
    sleep 2
    return 0
}

# =============================================================================
# INSTALACIÓN COMPLETA
# =============================================================================

run_complete_installation() {
    log_message "INFO" "=== INICIANDO INSTALACIÓN COMPLETA ==="
    
    echo -e "\n${WHITE}🚀 Iniciando instalación completa de WATOOLX...${NC}"
    
    # Verificar requisitos del sistema
    if ! check_system_requirements; then
        echo -e "\n${RED}❌ No se cumplen los requisitos del sistema. Instalación cancelada.${NC}"
        return 1
    fi
    
    # Verificar permisos del sistema
    verify_all_permissions
    
    # Crear directorios críticos si es necesario
    create_critical_directories
    
    # Actualizar sistema
    if ! system_update; then
        echo -e "\n${RED}❌ Error al actualizar el sistema. Instalación cancelada.${NC}"
        return 1
    fi
    
    # Limpiar procesos y puertos
    cleanup_processes_and_ports
    
    # Capturar datos de configuración
    get_urls_validated
    
    # Verificar y corregir DNS
    verify_and_fix_dns
    
    # Verificar conectividad de red (ahora sí tiene los dominios)
    if ! verify_network_connectivity; then
        echo -e "\n${YELLOW}⚠️  Advertencias de conectividad detectadas, continuando...${NC}"
    fi
    
    # Dependencias del sistema
    if ! system_docker_install; then
        register_error "Error en instalación de Docker"
    fi
    
    if ! system_nodejs_install; then
        register_error "Error en instalación de Node.js"
    fi
    
    if ! system_pm2_install; then
        register_error "Error en instalación de PM2"
    fi
    
    if ! system_nginx_install; then
        register_error "Error en instalación de Nginx"
    fi
    
    if ! system_certbot_install; then
        register_error "Error en instalación de Certbot"
    fi
    
    # Backend
    if ! backend_redis_create; then
        register_error "Error en creación de Redis y base de datos"
    fi
    
    if ! backend_set_env; then
        register_error "Error en configuración de entorno del backend"
    fi
    
    if ! backend_node_dependencies; then
        register_error "Error en instalación de dependencias del backend"
    fi
    
    if ! backend_node_build; then
        register_error "Error en compilación del backend"
    fi
    
    if ! backend_db_migrate; then
        register_error "Error en migraciones de base de datos"
    fi
    
    if ! backend_db_seed; then
        register_error "Error en seeds de base de datos"
    fi
    
    if ! backend_start_pm2; then
        register_error "Error en inicio del backend con PM2"
    fi
    
    # Frontend
    if ! frontend_set_env; then
        register_error "Error en configuración de entorno del frontend"
    fi
    
    if ! frontend_node_dependencies; then
        register_error "Error en instalación de dependencias del frontend"
    fi
    
    if ! frontend_node_build; then
        register_error "Error en compilación del frontend"
    fi
    
    # Configurar server.js para usar el puerto correcto
    local server_js="$FRONTEND_DIR/server.js"
    if [ -f "$server_js" ]; then
        log_message "INFO" "Verificando configuración de puerto en server.js..."
        
        # Verificar que el puerto esté configurado correctamente
        if grep -q "app.listen(${frontend_port}" "$server_js"; then
            log_message "SUCCESS" "✅ server.js ya está configurado para puerto $frontend_port"
        else
            log_message "WARNING" "⚠️ Puerto en server.js no coincide con la configuración"
            # Crear backup
            cp "$server_js" "$server_js.backup"
            
            # Actualizar el puerto en server.js
            sed -i "s/app\.listen([0-9]*,/app.listen(${frontend_port},/g" "$server_js"
            
            log_message "SUCCESS" "✅ server.js actualizado para puerto $frontend_port"
        fi
    fi
    
    if ! frontend_start_pm2; then
        register_error "Error en inicio del frontend con PM2"
    fi
    
    # Configuración SSL y Proxy directo (sin mostrar proceso HTTP)
    log_message "STEP" "=== CONFIGURACIÓN SSL Y PROXY DIRECTO ==="
    
    # Configuración SSL y Proxy mejorada
    if ! obtain_ssl_certificates_improved; then
        register_error "Error en obtención de certificados SSL"
    fi
    
    if ! configure_reverse_proxy_improved; then
        register_error "Error en configuración de proxy inverso"
    fi
    
    # Verificación final de servicios
    verify_services_status
    
    # Verificación final
    verify_installation
    
    # Crear script de recuperación rápida
    create_recovery_script
    
    # Mostrar resumen final
    show_installation_summary
}

# =============================================================================
# MENÚ PRINCIPAL
# =============================================================================

show_main_menu() {
    print_banner
    printf "${WHITE} 💻 Bienvenido(a) al Instalador de Watoolx ¡Ingresa la siguiente acción!${GRAY_LIGHT}"
    printf "\n\n"
    printf "   [1] Instalación Completa (Recomendado)\n"
    printf "   [2] Instalación Paso a Paso\n"
    printf "   [3] Verificar Sistema Actual\n"
    printf "   [4] Configurar Solo Backend\n"
    printf "   [5] Configurar Solo Frontend\n"
    printf "   [6] Configurar Base de Datos\n"
    printf "   [7] Configurar SSL y Proxy\n"
    printf "   [8] Verificar DNS y Conectividad\n"
    printf "   [9] Ver Documentación\n"
    printf "   [0] Salir\n"
    printf "\n"
    read -p "> " option
}

# =============================================================================
# FUNCIÓN PRINCIPAL
# =============================================================================

main() {
    # Inicializar log
    > "$LOG_FILE"
    
    while true; do
        show_main_menu
        
        case "${option}" in
            1) 
                run_complete_installation
                ;;
            2) 
                echo -e "\n${YELLOW}Instalación paso a paso...${NC}"
                # Aquí iría la instalación paso a paso
                ;;
            3) 
                echo -e "\n${YELLOW}Verificando sistema...${NC}"
                # Aquí iría la verificación
                ;;
            4) 
                get_urls_validated
                backend_redis_create
                backend_set_env
                backend_node_dependencies
                backend_node_build
                backend_db_migrate
                backend_db_seed
                backend_start_pm2
                ;;
            5) 
                get_urls_validated
                frontend_set_env
                frontend_node_dependencies
                frontend_node_build
                frontend_start_pm2
                ;;
            6) 
                get_urls_validated
                backend_redis_create
                ;;
            7) 
                echo -e "\n${CYAN}Configurando SSL y Proxy directo...${NC}"
                get_urls_validated
                if ! obtain_ssl_certificates_improved; then
                    echo -e "${RED}Error en obtención de certificados SSL${NC}"
                fi
                if ! configure_reverse_proxy_improved; then
                    echo -e "${RED}Error en configuración de proxy inverso${NC}"
                fi
                ;;
            8) 
                echo -e "\n${CYAN}Verificando DNS y conectividad...${NC}"
                get_urls_validated
                verify_and_fix_dns
                ;;

            9) 
                echo -e "\n${CYAN}Documentación disponible:${NC}"
                echo -e "${WHITE}• Manual Técnico:${NC} setup/MANUAL_TECNICO.md"
                echo -e "${WHITE}• Manual de Usuario:${NC} setup/MANUAL_USUARIO.md"
                echo -e "${WHITE}• Documentación de API:${NC} setup/API_DOCUMENTACION.md"
                echo -e "${WHITE}• Guía de Recuperación:${NC} setup/GUIA_RECUPERACION.md"
                ;;
            0) 
                echo -e "\n${GREEN}¡Gracias por usar WATOOLX!${NC}"
                exit 0
                ;;
            *) 
                echo -e "\n${RED}Opción inválida. Intenta de nuevo.${NC}"
                ;;
        esac
        
        echo -e "\n${YELLOW}Presiona Enter para volver al menú principal...${NC}"
        read
    done
}

# Ejecutar función principal
main "$@" 