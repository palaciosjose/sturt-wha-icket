#!/bin/bash

# =============================================================================
# WATOOLX - INSTALADOR SIMPLIFICADO CON MYSQL
# =============================================================================
# Script todo en uno para instalar y configurar WATOOLX con MySQL
# Basado en el modelo de software Waticket Saas 
# Autor: Leopoldo Huacasi
# Versión: 1.1.0 | 2025-07-15
# =============================================================================

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

# Variables para detección automática
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

# Función para mostrar banner
print_banner() {
    clear
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                WATOOLX INSTALADOR TODO EN UNO                ║"
    echo "║              Usuario Actual - Versión 1.1.0                  ║"
    echo "║                        CON MYSQL                             ║"
    echo "║                                                              ║"
    echo "║  🚀 Instalación Automática   📋 Captura de Datos             ║"
    echo "║  🔧 Configuración Personal   ✅ Docker + PM2 + Nginx         ║"
    echo "║  📚 Documentación Clara      🎯 Un Solo Script Principal     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Función para verificar conectividad a internet
check_internet_connectivity() {
    log_message "INFO" "Verificando conectividad a internet..."
    
    # Probar con IPv4 primero
    if ping -4 -c 1 8.8.8.8 >/dev/null 2>&1; then
        log_message "SUCCESS" "✅ Conectividad IPv4 verificada"
        return 0
    fi
    
    # Probar con IPv4 y google.com
    if ping -4 -c 1 google.com >/dev/null 2>&1; then
        log_message "SUCCESS" "✅ Conectividad a internet verificada"
        return 0
    fi
    
    # Probar con curl como fallback
    if curl -s --connect-timeout 5 https://httpbin.org/ip >/dev/null 2>&1; then
        log_message "SUCCESS" "✅ Conectividad a internet verificada (curl)"
        return 0
    fi
    
    # Si todo falla, verificar si al menos podemos resolver DNS
    if nslookup google.com >/dev/null 2>&1; then
        log_message "WARNING" "⚠️ DNS funciona pero conectividad limitada, continuando..."
        return 0
    fi
    
    log_message "ERROR" "❌ No hay conectividad a internet"
    return 1
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
    check_reboot_required

    log_message "SUCCESS" "✅ Sistema actualizado correctamente"
    sleep 2
    return 0
}

# Función para verificar si se requiere reinicio del sistema
check_reboot_required() {
    # Verificar archivo de reinicio requerido
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

    # Verificar servicios críticos que pueden requerir reinicio
    local services_need_restart=false
    
    # Verificar si Docker necesita reinicio
    if command -v docker &> /dev/null; then
        if ! docker info &> /dev/null; then
            services_need_restart=true
        fi
    fi
    
    # Verificar si Nginx necesita reinicio
    if command -v nginx &> /dev/null; then
        if ! nginx -t &> /dev/null; then
            services_need_restart=true
        fi
    fi
    
    # Verificar si MySQL necesita reinicio
    if command -v mysql &> /dev/null; then
        if ! systemctl is-active --quiet mysql; then
            services_need_restart=true
        fi
    fi
    
    if [ "$services_need_restart" = true ]; then
        log_message "WARNING" "⚠️  Algunos servicios críticos pueden requerir reinicio"
        echo -e "${YELLOW}⚠️  Se detectaron servicios que pueden requerir reinicio${NC}"
        echo -e "${WHITE}¿Deseas reiniciar ahora para asegurar estabilidad? (y/n):${NC} "
        read -r reboot_confirm
        if [[ "$reboot_confirm" =~ ^[Yy]$ ]]; then
            log_message "INFO" "Reiniciando sistema..."
            sudo reboot
            exit 0
        else
            log_message "WARNING" "Usuario optó por no reiniciar. Continuando..."
        fi
    fi
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

# Función para verificar todos los permisos del sistema
verify_all_permissions() {
    log_message "STEP" "=== VERIFICANDO PERMISOS DEL SISTEMA ==="
    
    print_banner
    printf "${WHITE} 🔐 Verificando permisos del sistema...${GRAY_LIGHT}\n\n"

    sleep 2
    
    # Verificar permisos de PM2
    log_message "INFO" "Verificando permisos de PM2..."
    if command -v pm2 &> /dev/null; then
    if ! sudo pm2 list > /dev/null 2>&1; then
        log_message "WARNING" "⚠️ PM2 no tiene permisos adecuados"
        sudo mkdir -p /root/.pm2 2>/dev/null || true
        if sudo chown -R $USER:$USER /root/.pm2 2>/dev/null; then
            log_message "SUCCESS" "✅ Permisos de PM2 configurados"
        else
            log_message "WARNING" "⚠️ No se pudieron configurar permisos de PM2 completamente"
        fi
    else
        log_message "SUCCESS" "✅ Permisos de PM2 verificados"
    fi
    else
        log_message "INFO" "PM2 no está instalado aún, se instalará más adelante"
    fi

    # Verificar permisos de Docker
    log_message "INFO" "Verificando permisos de Docker..."
    if command -v docker &> /dev/null; then
    if ! sudo systemctl is-active --quiet docker; then
        log_message "WARNING" "⚠️ Servicio Docker no está ejecutándose"
        log_message "INFO" "Iniciando servicio Docker..."
        if ! sudo systemctl start docker; then
            register_error "No se pudo iniciar el servicio Docker"
            return 1
        fi
    fi
    
    if ! docker ps > /dev/null 2>&1; then
        log_message "WARNING" "⚠️ Usuario actual no puede usar Docker, corrigiendo permisos..."
        if ! groups $USER | grep -q docker; then
            log_message "INFO" "➕ Agregando usuario al grupo docker..."
            if ! sudo usermod -aG docker $USER; then
                register_error "No se pudo agregar usuario al grupo docker"
                return 1
            fi
        fi
        
        if [ -S /var/run/docker.sock ]; then
            log_message "INFO" "🔧 Corrigiendo permisos del socket de Docker..."
            if ! sudo chmod 666 /var/run/docker.sock; then
                register_error "No se pudieron corregir los permisos del socket de Docker"
                return 1
            fi
        fi
        
        if ! docker ps > /dev/null 2>&1; then
            log_message "WARNING" "⚠️ Los permisos aún no están activos, intentando con newgrp..."
            if ! newgrp docker -c "docker ps > /dev/null 2>&1"; then
                register_error "No se pudieron corregir los permisos de Docker"
                return 1
            fi
        fi
        
        log_message "SUCCESS" "✅ Permisos de Docker corregidos"
    else
        log_message "SUCCESS" "✅ Permisos de Docker correctos"
    fi
    else
        log_message "INFO" "Docker no está instalado aún, se instalará más adelante"
    fi

    # Verificar permisos de Nginx
    log_message "INFO" "Verificando permisos de Nginx..."
    if command -v nginx &> /dev/null; then
    local nginx_dirs=("/etc/nginx" "/etc/nginx/sites-available" "/etc/nginx/sites-enabled" "/var/log/nginx")
    
    for dir in "${nginx_dirs[@]}"; do
        if ! sudo test -w "$dir" 2>/dev/null; then
            log_message "WARNING" "⚠️ No se puede escribir en $dir"
        else
            log_message "SUCCESS" "✅ Permisos de escritura en $dir"
        fi
    done
    
    if ! sudo nginx -t > /dev/null 2>&1; then
        log_message "WARNING" "⚠️ Nginx tiene problemas de configuración"
    else
        log_message "SUCCESS" "✅ Configuración de Nginx válida"
    fi
    
    if ! sudo systemctl reload nginx > /dev/null 2>&1; then
        log_message "WARNING" "⚠️ No se puede recargar Nginx (puede estar detenido)"
    else
        log_message "SUCCESS" "✅ Nginx puede ser recargado"
    fi
    else
        log_message "INFO" "Nginx no está instalado aún, se instalará más adelante"
    fi

    # Verificar permisos de Certbot
    log_message "INFO" "Verificando permisos de Certbot..."
    if command -v certbot &> /dev/null; then
    if ! sudo test -w "/etc/letsencrypt" 2>/dev/null; then
        log_message "WARNING" "⚠️ No se puede escribir en /etc/letsencrypt"
        
        if ! sudo test -d "/etc/letsencrypt" 2>/dev/null; then
            log_message "INFO" "Creando directorio /etc/letsencrypt..."
            sudo mkdir -p /etc/letsencrypt 2>/dev/null || true
        fi
        
        if sudo chmod 755 /etc/letsencrypt 2>/dev/null; then
            log_message "SUCCESS" "✅ Permisos de /etc/letsencrypt configurados"
        else
            log_message "WARNING" "⚠️ No se pudieron configurar permisos de /etc/letsencrypt"
        fi
    else
        log_message "SUCCESS" "✅ Permisos de Certbot verificados"
    fi
    
    if ! sudo test -w "/var/www/html" 2>/dev/null; then
        log_message "WARNING" "⚠️ No se puede escribir en /var/www/html"
        
        if ! sudo test -d "/var/www/html" 2>/dev/null; then
            log_message "INFO" "Creando directorio /var/www/html..."
            sudo mkdir -p /var/www/html 2>/dev/null || true
        fi
        
        if sudo chmod 755 /var/www/html 2>/dev/null; then
            log_message "SUCCESS" "✅ Permisos de /var/www/html configurados"
        else
            log_message "WARNING" "⚠️ No se pudieron configurar permisos de /var/www/html"
        fi
    else
        log_message "SUCCESS" "✅ Permisos de webroot verificados"
    fi
    else
        log_message "INFO" "Certbot no está instalado aún, se instalará más adelante"
    fi

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
    local current_ip=$(curl -4 -s ifconfig.me 2>/dev/null)
    if [[ ! "$current_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        # Método alternativo si el primero falla
        current_ip=$(curl -4 -s ipinfo.io/ip 2>/dev/null)
        if [[ ! "$current_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            current_ip=$(curl -4 -s icanhazip.com 2>/dev/null)
        fi
    fi
    
    # Permitir corrección manual de la IP si es necesario
    if [[ "$current_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        log_message "INFO" "DNS actual:"
        log_message "INFO" "  $backend_domain -> $current_ip"
        log_message "INFO" "  $frontend_domain -> $current_ip"
        log_message "INFO" "IP actual del servidor (IPv4): $current_ip"
        echo -e "${YELLOW}¿La IP detectada es correcta? (y/n):${NC} "
        read -r ip_correct
        if [[ ! "$ip_correct" =~ ^[Yy]$ ]]; then
            echo -e "${INPUT}Ingresa la IP correcta del servidor:${NC} "
            read -r current_ip
            log_message "INFO" "IP corregida manualmente: $current_ip"
        else
            log_message "SUCCESS" "✅ IP confirmada: $current_ip"
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

# Función para detectar puertos activos automáticamente
detect_active_ports() {
    log_message "INFO" "Detectando puertos activos..."
    
    # Detectar puerto del frontend
    detected_frontend_port=$(pm2 list 2>/dev/null | grep frontend | grep -o "localhost:[0-9]*" | head -1 | cut -d: -f2)
    if [ -z "$detected_frontend_port" ]; then
        detected_frontend_port="3435"  # Puerto por defecto
    fi
    
    # Detectar puerto del backend
    detected_backend_port=$(pm2 list 2>/dev/null | grep backend | grep -o "localhost:[0-9]*" | head -1 | cut -d: -f2)
    if [ -z "$detected_backend_port" ]; then
        detected_backend_port="4142"  # Puerto por defecto
    fi
    
    # Detectar puerto de Redis
    detected_redis_port=$(docker ps 2>/dev/null | grep redis | grep -o ":[0-9]*->" | head -1 | tr -d ':->')
    if [ -z "$detected_redis_port" ]; then
        detected_redis_port="5050"  # Puerto por defecto
    fi
    
    log_message "SUCCESS" "Puertos detectados - Frontend: $detected_frontend_port, Backend: $detected_backend_port, Redis: $detected_redis_port"
}

# Función para extraer solo el dominio de una URL
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

# Función para validar dominio
validate_domain() {
    local domain="$1"
    
    # Validar formato básico de dominio
    if [[ "$domain" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        return 0
    else
        return 1
    fi
}

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

# Función para verificar instalación final
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

# Función para verificar permisos de MySQL
verify_mysql_permissions() {
    log_message "INFO" "Verificando permisos de MySQL..."
    
    # Verificar si MySQL está instalado
    if ! command -v mysql &> /dev/null; then
        log_message "INFO" "MySQL no está instalado aún, se instalará más adelante"
        return 0
    fi
    
    # Verificar si se puede conectar como root
    if ! sudo mysql -u root -e "SELECT 1;" > /dev/null 2>&1; then
        log_message "WARNING" "⚠️ No se puede conectar a MySQL como root"
        log_message "INFO" "Configurando permisos de MySQL..."
        
        # Verificar que el servicio MySQL esté ejecutándose
        if ! sudo systemctl is-active --quiet mysql; then
            log_message "ERROR" "❌ Servicio MySQL no está ejecutándose"
                return 1
    fi

        # Intentar configurar acceso sin contraseña para root
        sudo mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY ''; FLUSH PRIVILEGES;" 2>/dev/null || true
        
        # Verificar nuevamente
        if ! sudo mysql -u root -e "SELECT 1;" > /dev/null 2>&1; then
            log_message "WARNING" "⚠️ MySQL puede requerir configuración manual"
            echo -e "${YELLOW}⚠️  Se requiere configuración manual de MySQL${NC}"
            echo -e "${WHITE}Por favor, configura MySQL manualmente o continúa:${NC} "
            read -r continue_with_mysql
            if [[ ! "$continue_with_mysql" =~ ^[Yy]$ ]]; then
        return 1
    fi
    fi
    fi
    
    log_message "SUCCESS" "✅ Permisos de MySQL verificados"
            return 0
}

# Función para instalar dependencias del sistema
install_system_dependencies() {
    log_message "STEP" "=== INSTALANDO DEPENDENCIAS DEL SISTEMA ==="
    
    print_banner
    printf "${WHITE} 💻 Instalando dependencias del sistema...${GRAY_LIGHT}\n\n"

    sleep 2

    # Actualizar repositorios
    log_message "INFO" "Actualizando repositorios..."
    apt-get update -qq

    # Instalar herramientas básicas
    log_message "INFO" "Instalando herramientas básicas..."
    apt-get install -y curl wget net-tools

    # Instalar Node.js
    log_message "INFO" "Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs

    # Instalar PM2
    log_message "INFO" "Instalando PM2..."
    npm install -g pm2

    # Instalar MySQL Server
    log_message "INFO" "Instalando MySQL Server..."
    apt-get install -y mysql-server

    # Instalar Redis
    log_message "INFO" "Instalando Redis..."
    apt-get install -y redis-server

    # Instalar Nginx
    log_message "INFO" "Instalando Nginx..."
    apt-get install -y nginx

    # Instalar Docker
    log_message "INFO" "Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh

    # Instalar Certbot para SSL
    log_message "INFO" "Instalando Certbot para SSL..."
    apt-get install -y certbot python3-certbot-nginx

    log_message "SUCCESS" "✅ Dependencias del sistema instaladas correctamente"
    sleep 2
}

# Función para instalar Node.js (ya está instalado en install_system_dependencies)
install_nodejs() {
    log_message "INFO" "Node.js ya instalado en dependencias del sistema"
        return 0
}

# Función para instalar PM2 (ya está instalado en install_system_dependencies)
install_pm2() {
    log_message "INFO" "PM2 ya instalado en dependencias del sistema"
            return 0
}

# Función para instalar Nginx (ya está instalado en install_system_dependencies)
install_nginx() {
    log_message "INFO" "Nginx ya instalado en dependencias del sistema"
    return 0
}

# Función para instalar Certbot (ya está instalado en install_system_dependencies)
install_certbot() {
    log_message "INFO" "Certbot ya instalado en dependencias del sistema"
            return 0
}

# Función para instalar backend
install_backend() {
    log_message "STEP" "=== INSTALANDO BACKEND ==="
    
    print_banner
    printf "${WHITE} 💻 Instalando y configurando backend...${GRAY_LIGHT}\n\n"

    sleep 2

    # Navegar al directorio del backend
    cd "$BACKEND_DIR" || {
        register_error "No se pudo acceder al directorio del backend"
        return 1
    }

    # Instalar dependencias del backend
    log_message "INFO" "Instalando dependencias del backend..."
    if npm install; then
        log_message "SUCCESS" "✅ Dependencias del backend instaladas correctamente"
    else
        log_message "ERROR" "❌ Error al instalar dependencias del backend"
        register_error "Error al instalar dependencias del backend"
        return 1
    fi
    
    # Compilar backend
    log_message "INFO" "Compilando backend..."
    if npm run build; then
        log_message "SUCCESS" "✅ Backend compilado correctamente"
    else
        log_message "ERROR" "❌ Error al compilar backend"
        register_error "Error al compilar backend"
        return 1
    fi
    
    # Configurar PM2 para el backend
    log_message "INFO" "Configurando PM2 para el backend..."
    pm2 start dist/server.js --name "beta-back"

    # Guardar configuración de PM2
    pm2 save

    log_message "SUCCESS" "✅ Backend instalado y configurado correctamente"
    
    # Ejecutar migraciones automáticamente
    log_message "INFO" "Ejecutando migraciones de base de datos..."
    sleep 3
    if npx sequelize db:migrate; then
        log_message "SUCCESS" "✅ Migraciones ejecutadas correctamente"
    else
        log_message "WARNING" "⚠️ Error en migraciones, intentando con configuración MySQL..."
        # Configurar MySQL para evitar deadlocks
        mysql -u ${instancia_add} -p${mysql_password} -e "SET GLOBAL innodb_lock_wait_timeout = 120; SET GLOBAL innodb_deadlock_detect = ON;" 2>/dev/null
    sleep 2
        if npx sequelize db:migrate; then
            log_message "SUCCESS" "✅ Migraciones ejecutadas correctamente"
        else
            log_message "ERROR" "❌ No se pudieron ejecutar las migraciones"
            register_error "Error en migraciones de base de datos"
        fi
    fi
    
    # Agregar setting faltante viewregister
    log_message "INFO" "Agregando setting faltante 'viewregister'..."
    
    # Verificar si ya existe el setting
    VIEWREGISTER_EXISTS=$(mysql -u ${instancia_add} -p${mysql_password} ${instancia_add} -e "SELECT COUNT(*) FROM Settings WHERE \`key\` = 'viewregister';" 2>/dev/null | tail -n 1 | tr -d ' ')
    
    if [ "$VIEWREGISTER_EXISTS" -eq 0 ]; then
        # Verificar que existe al menos una empresa
        COMPANY_COUNT=$(mysql -u ${instancia_add} -p${mysql_password} ${instancia_add} -e "SELECT COUNT(*) FROM Companies;" 2>/dev/null | tail -n 1 | tr -d ' ')
        
        if [ "$COMPANY_COUNT" -gt 0 ]; then
            # Obtener el ID de la primera empresa
            COMPANY_ID=$(mysql -u ${instancia_add} -p${mysql_password} ${instancia_add} -e "SELECT id FROM Companies LIMIT 1;" 2>/dev/null | tail -n 1 | tr -d ' ')
            
            if [ ! -z "$COMPANY_ID" ] && [ "$COMPANY_ID" -gt 0 ]; then
                mysql -u ${instancia_add} -p${mysql_password} ${instancia_add} -e "INSERT INTO Settings (\`key\`, \`value\`, createdAt, updatedAt, companyId) VALUES ('viewregister', 'enabled', NOW(), NOW(), $COMPANY_ID);" 2>/dev/null
                if [ $? -eq 0 ]; then
                    log_message "SUCCESS" "✅ Setting 'viewregister' agregado correctamente para empresa ID: $COMPANY_ID"
                else
                    log_message "WARNING" "⚠️ No se pudo agregar el setting 'viewregister', pero continuando..."
                fi
            else
                log_message "WARNING" "⚠️ No se pudo obtener ID de empresa válido para viewregister"
        fi
    else
            log_message "WARNING" "⚠️ No hay empresas disponibles para agregar viewregister"
        fi
    else
        log_message "SUCCESS" "✅ Setting 'viewregister' ya existe"
    fi
    
    sleep 2
    return 0
}

# Función para verificar servicios
verify_services_status() {
    log_message "STEP" "=== VERIFICANDO ESTADO DE SERVICIOS ==="
    
    print_banner
    printf "${WHITE} 🔍 Verificando estado de servicios...${GRAY_LIGHT}\n\n"

    sleep 2

    # Verificar PM2
    if command -v pm2 &> /dev/null; then
        echo -e "${WHITE}Verificando PM2:${NC}"
        pm2 list | grep -E "(backend|frontend)" || echo "No hay procesos PM2 activos"
    fi

    # Verificar Nginx
    if command -v nginx &> /dev/null; then
        echo -e "\n${WHITE}Verificando Nginx:${NC}"
        sudo systemctl status nginx --no-pager -l || echo "Nginx no está corriendo"
    fi

    # Verificar Docker
    if command -v docker &> /dev/null; then
        echo -e "\n${WHITE}Verificando Docker:${NC}"
        docker ps || echo "No hay contenedores Docker activos"
    fi

    # Verificar MySQL
    if command -v mysql &> /dev/null; then
        echo -e "\n${WHITE}Verificando MySQL:${NC}"
        sudo systemctl status mysql --no-pager -l || echo "MySQL no está corriendo"
    fi

    log_message "SUCCESS" "✅ Verificación de servicios completada"
    sleep 2
}

# Función para configurar MySQL
configure_mysql() {
    log_message "STEP" "=== CONFIGURANDO MYSQL ==="
    
    print_banner
    printf "${WHITE} 💻 Configurando MySQL...${GRAY_LIGHT}\n\n"

    sleep 2

    # Iniciar servicio MySQL
    if ! sudo systemctl start mysql; then
        register_error "No se pudo iniciar el servicio MySQL"
            return 1
    fi

    # Habilitar MySQL para iniciar con el sistema
    if ! sudo systemctl enable mysql; then
        register_error "No se pudo habilitar MySQL para inicio automático"
            return 1
    fi

    # Configurar MySQL para acceso sin contraseña (para desarrollo)
    sudo mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY ''; FLUSH PRIVILEGES;" 2>/dev/null || true

    # Crear base de datos
    if ! sudo mysql -u root -e "CREATE DATABASE IF NOT EXISTS ${instancia_add};"; then
        register_error "No se pudo crear la base de datos ${instancia_add}"
        return 1
    fi
    
    # Crear usuario MySQL
    if ! sudo mysql -u root -e "CREATE USER IF NOT EXISTS '${instancia_add}'@'localhost' IDENTIFIED BY '${mysql_password}';"; then
        register_error "No se pudo crear el usuario MySQL ${instancia_add}"
        return 1
    fi

    # Otorgar permisos al usuario
    if ! sudo mysql -u root -e "GRANT ALL PRIVILEGES ON ${instancia_add}.* TO '${instancia_add}'@'localhost'; FLUSH PRIVILEGES;"; then
        register_error "No se pudieron otorgar permisos al usuario MySQL"
        return 1
    fi
    
    # Verificar conexión
    if ! sudo mysql -u ${instancia_add} -p${mysql_password} -e "SELECT 1;" > /dev/null 2>&1; then
        register_error "No se puede conectar a MySQL con las credenciales configuradas"
        return 1
    fi
    
    log_message "SUCCESS" "✅ MySQL configurado correctamente"
    sleep 2
    return 0
}

# Función para configurar Redis
configure_redis() {
    log_message "STEP" "=== CONFIGURANDO REDIS ==="
    
    print_banner
    printf "${WHITE} 💻 Configurando Redis...${GRAY_LIGHT}\n\n"

    sleep 2

    # Iniciar servicio Redis
    if ! sudo systemctl start redis-server; then
        register_error "No se pudo iniciar el servicio Redis"
        return 1
    fi
    
    # Habilitar Redis para iniciar con el sistema
    if ! sudo systemctl enable redis-server; then
        register_error "No se pudo habilitar Redis para inicio automático"
        return 1
    fi

    # Verificar que Redis esté funcionando
    if ! redis-cli ping > /dev/null 2>&1; then
        register_error "Redis no está respondiendo correctamente"
        return 1
    fi

    log_message "SUCCESS" "✅ Redis configurado correctamente"
    sleep 2
    return 0
}

# Función para configurar variables de entorno del backend
backend_environment() {
    log_message "STEP" "=== CONFIGURANDO VARIABLES DE ENTORNO DEL BACKEND ==="
    
    print_banner
    printf "${WHITE} 💻 Configurando variables de entorno del backend...${GRAY_LIGHT}\n\n"

    sleep 2

    # Generar JWT secrets si no están definidos
    if [ -z "$jwt_secret" ]; then
        jwt_secret=$(openssl rand -base64 32)
    fi
    
    if [ -z "$jwt_refresh_secret" ]; then
        jwt_refresh_secret=$(openssl rand -base64 32)
    fi

    # Extraer dominios de las URLs
    backend_domain=$(echo "$backend_url" | sed 's|https://||' | sed 's|http://||')
    frontend_domain=$(echo "$frontend_url" | sed 's|https://||' | sed 's|http://||')

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
REDIS_URI=redis://127.0.0.1:6379
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

# Función para instalar dependencias del backend
backend_node_dependencies() {
    log_message "STEP" "=== INSTALANDO DEPENDENCIAS DEL BACKEND ==="
    
    print_banner
    printf "${WHITE} 💻 Instalando dependencias del backend...${GRAY_LIGHT}\n\n"

    sleep 2

    # Navegar al directorio del backend
    cd "$BACKEND_DIR" || {
        register_error "No se pudo acceder al directorio del backend"
        return 1
    }

    # Instalar dependencias
    if ! npm install; then
        register_error "No se pudieron instalar las dependencias del backend"
        return 1
    fi

    log_message "SUCCESS" "✅ Dependencias del backend instaladas correctamente"
    sleep 2
    return 0
}

# Función para compilar el backend
backend_build() {
    log_message "STEP" "=== COMPILANDO BACKEND ==="
    
    print_banner
    printf "${WHITE} 💻 Compilando backend...${GRAY_LIGHT}\n\n"

    sleep 2

    # Navegar al directorio del backend
    cd "$BACKEND_DIR" || {
        register_error "No se pudo acceder al directorio del backend"
        return 1
    }

    # Compilar TypeScript
    if ! npm run build; then
        register_error "No se pudo compilar el backend"
        return 1
    fi

    log_message "SUCCESS" "✅ Backend compilado correctamente"
    sleep 2
    return 0
}

# Función para ejecutar migraciones
backend_migrations() {
    log_message "STEP" "=== EJECUTANDO MIGRACIONES ==="
    
    print_banner
    printf "${WHITE} 💻 Ejecutando migraciones de la base de datos...${GRAY_LIGHT}\n\n"

    sleep 2

    # Navegar al directorio del backend
    cd "$BACKEND_DIR" || {
        register_error "No se pudo acceder al directorio del backend"
        return 1
    }

    # Configurar MySQL para evitar deadlocks
    log_message "INFO" "Configurando MySQL para evitar deadlocks..."
    mysql -u root -p${mysql_password} -e "SET GLOBAL innodb_lock_wait_timeout = 120;" 2>/dev/null || true
    mysql -u root -p${mysql_password} -e "SET GLOBAL innodb_deadlock_detect = ON;" 2>/dev/null || true

    # Verificar estado de migraciones
    log_message "INFO" "Verificando estado de migraciones..."
    npx sequelize db:migrate:status > /tmp/migration_status.log 2>&1

    # Lista de migraciones problemáticas conocidas
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
        mysql -u ${instancia_add} -p${mysql_password} ${instancia_add} -e "INSERT IGNORE INTO SequelizeMeta (name) VALUES ('$migration');" 2>/dev/null || true
        log_message "SUCCESS" "Migración problemática marcada como ejecutada: $migration"
    done

    # Ejecutar migraciones con manejo de errores
    log_message "INFO" "Ejecutando migraciones..."
    
    # Configurar MySQL para evitar deadlocks durante migraciones
    mysql -u ${instancia_add} -p${mysql_password} -e "SET GLOBAL innodb_lock_wait_timeout = 120; SET GLOBAL innodb_deadlock_detect = ON;" 2>/dev/null
    
    # Contador de reintentos
    RETRY_COUNT=0
    MAX_RETRIES=5
    

    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        # Capturar la salida de las migraciones para análisis
        MIGRATION_OUTPUT=$(npx sequelize db:migrate 2>&1)
        MIGRATION_EXIT_CODE=$?
        
        if [ $MIGRATION_EXIT_CODE -eq 0 ]; then
            log_message "SUCCESS" "✅ Migraciones ejecutadas correctamente"
            break
        else
            RETRY_COUNT=$((RETRY_COUNT + 1))
            log_message "WARNING" "Error en migraciones, intentando recuperación (intento $RETRY_COUNT/$MAX_RETRIES)..."
            
            # Analizar el tipo de error
            if echo "$MIGRATION_OUTPUT" | grep -q "Duplicate column name"; then
                log_message "INFO" "Detectada migración duplicada, marcando como ejecutada..."
                
                # Extraer el nombre de la migración que falló de manera más robusta
                FAILED_MIGRATION=$(echo "$MIGRATION_OUTPUT" | grep -A1 "migrating =======" | tail -1 | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//' | sed 's/^== //' | sed 's/: migrating =======$//')
                
                if [ ! -z "$FAILED_MIGRATION" ]; then
                    log_message "INFO" "Marcando migración fallida como ejecutada: $FAILED_MIGRATION"
                    mysql -u ${instancia_add} -p${mysql_password} ${instancia_add} -e "INSERT IGNORE INTO SequelizeMeta (name) VALUES ('$FAILED_MIGRATION');" 2>/dev/null || true
                    log_message "SUCCESS" "Migración duplicada marcada como ejecutada: $FAILED_MIGRATION"
            sleep 2
                    continue
                else
                    # Obtener migraciones pendientes como fallback
                    PENDING_MIGRATIONS=$(npx sequelize db:migrate:status 2>/dev/null | grep "down" | awk '{print $1}' | grep -v "^down$" | grep -v "^up$" | grep -E "^[0-9]+.*\.js$")
                    
                    if [ ! -z "$PENDING_MIGRATIONS" ]; then
                        log_message "INFO" "Marcando migraciones duplicadas como ejecutadas..."
                        
                        for migration in $PENDING_MIGRATIONS; do
                            if [[ "$migration" =~ ^[0-9]+.*\.js$ ]]; then
                                mysql -u ${instancia_add} -p${mysql_password} ${instancia_add} -e "INSERT IGNORE INTO SequelizeMeta (name) VALUES ('$migration');" 2>/dev/null || true
                                log_message "SUCCESS" "Migración marcada como ejecutada: $migration"
                            fi
                        done
                        
            sleep 2
                        continue
                    fi
                fi
            elif echo "$MIGRATION_OUTPUT" | grep -q "ER_NO_SUCH_TABLE"; then
                log_message "ERROR" "❌ Error: Tabla no existe, verificar estructura de base de datos"
                register_error "Error de tabla no existe en migraciones"
                break
            elif echo "$MIGRATION_OUTPUT" | grep -q "ER_BAD_FIELD_ERROR"; then
                log_message "ERROR" "❌ Error: Columna no existe, verificar estructura de base de datos"
                register_error "Error de columna no existe en migraciones"
                break
            else
                # Error genérico, reintentar con configuración optimizada
                log_message "INFO" "Reintentando migraciones con configuración optimizada..."
                sleep 5
                
                # Reiniciar MySQL para limpiar deadlocks
                systemctl restart mysql
                sleep 3
                
                continue
            fi
        fi
    done
    
    # Verificación final de migraciones
    log_message "INFO" "Verificando estado final de migraciones..."
    FINAL_MIGRATION_STATUS=$(npx sequelize db:migrate:status 2>/dev/null | grep -c "up" || echo "0")
    log_message "SUCCESS" "✅ Migraciones ejecutadas: $FINAL_MIGRATION_STATUS"
    
    # Verificar que las migraciones críticas se ejecutaron
    log_message "INFO" "Verificando migraciones críticas..."
    CRITICAL_MIGRATIONS=(
        "20231214143411-add-promptId-to-tickets.js"
        "20210109192513-add-greetingMessage-to-whatsapp.js"
        "20210109192514-create-companies-table.js"
    )
    
    for migration in "${CRITICAL_MIGRATIONS[@]}"; do
        MIGRATION_STATUS=$(mysql -u ${instancia_add} -p${mysql_password} ${instancia_add} -e "SELECT COUNT(*) FROM SequelizeMeta WHERE name = '$migration';" 2>/dev/null | tail -n 1 | tr -d ' ')
        if [ "$MIGRATION_STATUS" -eq 0 ]; then
            log_message "WARNING" "⚠️ Migración crítica no ejecutada: $migration"
            register_error "Migración crítica no ejecutada: $migration"
        else
            log_message "SUCCESS" "✅ Migración crítica verificada: $migration"
        fi
    done
    
    # Si llegamos aquí sin éxito, registrar error pero continuar
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        log_message "WARNING" "No se pudieron ejecutar todas las migraciones después de $MAX_RETRIES intentos, pero continuando..."
        register_error "Migraciones incompletas después de $MAX_RETRIES intentos"
    fi
    
    # Verificar que el backend puede funcionar correctamente
    log_message "INFO" "Verificando funcionalidad del backend después de migraciones..."
    sleep 3
    
    # Verificar que las tablas críticas existen y tienen la estructura correcta
    CRITICAL_TABLES=("Tickets" "Companies" "Settings" "Users" "Whatsapps")
    for table in "${CRITICAL_TABLES[@]}"; do
        TABLE_EXISTS=$(mysql -u ${instancia_add} -p${mysql_password} ${instancia_add} -e "SHOW TABLES LIKE '$table';" 2>/dev/null | wc -l)
        if [ "$TABLE_EXISTS" -gt 1 ]; then
            log_message "SUCCESS" "✅ Tabla $table existe"
        else
            log_message "ERROR" "❌ Tabla $table no existe"
            register_error "Tabla crítica no existe: $table"
        fi
    done
    
    # Verificar columnas críticas en Tickets
    if mysql -u ${instancia_add} -p${mysql_password} ${instancia_add} -e "DESCRIBE Tickets;" 2>/dev/null | grep -q "promptId"; then
        log_message "SUCCESS" "✅ Columna promptId existe en Tickets"
    else
        log_message "WARNING" "⚠️ Columna promptId no existe en Tickets"
        register_error "Columna crítica promptId no existe en Tickets"
    fi
    
    # Crear WhatsApp por defecto si no existe
    log_message "INFO" "Verificando WhatsApp por defecto..."
    WHATSAPP_COUNT=$(mysql -u ${instancia_add} -p${mysql_password} ${instancia_add} -e "SELECT COUNT(*) FROM Whatsapps;" 2>/dev/null | tail -n 1 | tr -d ' ')
    
    if [ "$WHATSAPP_COUNT" -eq 0 ]; then
        log_message "INFO" "Creando WhatsApp por defecto..."
        mysql -u ${instancia_add} -p${mysql_password} ${instancia_add} -e "INSERT INTO Whatsapps (name, status, isDefault, retries, companyId, createdAt, updatedAt) VALUES ('WhatsApp Demo', 'DISCONNECTED', 1, 0, 1, NOW(), NOW());" 2>/dev/null
        if [ $? -eq 0 ]; then
            log_message "SUCCESS" "✅ WhatsApp por defecto creado correctamente"
        else
            log_message "WARNING" "⚠️ No se pudo crear WhatsApp por defecto, pero continuando..."
            register_error "Error al crear WhatsApp por defecto"
        fi
    else
        log_message "SUCCESS" "✅ WhatsApp por defecto ya existe"
    fi
    
    # Reiniciar backend para que tome los cambios de migraciones
    log_message "INFO" "Reiniciando backend para aplicar cambios de migraciones..."
    pm2 restart beta-back --update-env
    sleep 5
    
    # Verificar que el backend responde correctamente
    log_message "INFO" "Verificando respuesta del backend..."
    if curl -s -I http://localhost:4142 | grep -q "HTTP/1.1"; then
        log_message "SUCCESS" "✅ Backend responde correctamente"
    else
        log_message "WARNING" "⚠️ Backend no responde, verificando logs..."
        pm2 logs beta-back --lines 5
        register_error "Backend no responde después de migraciones"
    fi
    
    # Limpiar variables de entorno problemáticas
    log_message "INFO" "Limpiando variables de entorno problemáticas..."
    cd "$BACKEND_DIR" || {
        register_error "No se pudo acceder al directorio del backend"
        return 1
    }
    
    # Limpiar variables que pueden causar errores
    sed -i 's/TRANSLATION_API_URL=https:\/\/waticketapi.todosistemas.online/TRANSLATION_API_URL=/' .env 2>/dev/null || true
    sed -i 's/OPENAI_API_KEY=/OPENAI_API_KEY=disabled/' .env 2>/dev/null || true
    sed -i 's/LOG_LEVEL=debug/LOG_LEVEL=error/' .env 2>/dev/null || true
    sed -i 's/DB_DEBUG=true/DB_DEBUG=false/' .env 2>/dev/null || true
    
    log_message "SUCCESS" "✅ Variables de entorno limpiadas"
    
    # Reiniciar backend con variables limpias
    log_message "INFO" "Reiniciando backend con variables limpias..."
    pm2 restart beta-back --update-env
    sleep 5
    
    # Verificar que el backend responde correctamente después de la limpieza
    log_message "INFO" "Verificando respuesta del backend después de limpieza..."
    sleep 3
    
    # Intentar hacer una petición simple al backend
    if curl -s -I http://localhost:4142 | grep -q "HTTP/1.1"; then
        log_message "SUCCESS" "✅ Backend responde correctamente después de limpieza"
    else
        log_message "WARNING" "⚠️ Backend no responde después de limpieza"
        register_error "Backend no responde después de limpieza de variables"
    fi
    
    # Verificar que las tablas críticas tienen datos
    log_message "INFO" "Verificando datos críticos en la base de datos..."
    
    # Verificar que existe al menos un usuario
    USER_COUNT=$(mysql -u ${instancia_add} -p${mysql_password} ${instancia_add} -e "SELECT COUNT(*) FROM Users;" 2>/dev/null | tail -n 1 | tr -d ' ')
    if [ "$USER_COUNT" -gt 0 ]; then
        log_message "SUCCESS" "✅ Usuarios encontrados: $USER_COUNT"
    else
        log_message "ERROR" "❌ No hay usuarios en la base de datos"
        register_error "No hay usuarios en la base de datos"
    fi
    
    # Verificar que existe al menos un WhatsApp
    WHATSAPP_COUNT=$(mysql -u ${instancia_add} -p${mysql_password} ${instancia_add} -e "SELECT COUNT(*) FROM Whatsapps;" 2>/dev/null | tail -n 1 | tr -d ' ')
    if [ "$WHATSAPP_COUNT" -gt 0 ]; then
        log_message "SUCCESS" "✅ WhatsApps encontrados: $WHATSAPP_COUNT"
    else
        log_message "ERROR" "❌ No hay WhatsApps en la base de datos"
        register_error "No hay WhatsApps en la base de datos"
    fi

    # Ejecutar seeders con manejo de errores MEJORADO
    log_message "INFO" "Ejecutando seeders..."
    
    # Verificar si los seeders existen antes de ejecutarlos
    SEEDERS_DIR="src/database/seeds"
    if [ -d "$SEEDERS_DIR" ]; then
        log_message "INFO" "Verificando seeders disponibles..."
        
        # Listar todos los seeders disponibles (buscar .ts y .js)
        AVAILABLE_SEEDERS=$(find "$SEEDERS_DIR" -name "*.ts" -o -name "*.js" 2>/dev/null | sort)
        
        if [ ! -z "$AVAILABLE_SEEDERS" ]; then
            log_message "INFO" "Seeders encontrados:"
            echo "$AVAILABLE_SEEDERS" | while read seeder; do
                seeder_name=$(basename "$seeder" .ts | basename "$seeder" .js)
                log_message "INFO" "  - $seeder_name"
            done
            
            # Verificar si ya existen datos básicos antes de ejecutar seeders
            log_message "INFO" "Verificando datos existentes..."
            
            # Verificar si ya existe una empresa
            COMPANY_COUNT=$(mysql -u ${instancia_add} -p${mysql_password} ${instancia_add} -e "SELECT COUNT(*) FROM Companies;" 2>/dev/null | tail -n 1 | tr -d ' ')
            if [ "$COMPANY_COUNT" -gt 0 ]; then
                log_message "SUCCESS" "✅ Datos básicos ya existen (Empresa, Usuario, Plan)"
                log_message "INFO" "Saltando ejecución de seeders..."
            else
                log_message "INFO" "No se encontraron datos básicos, ejecutando seeders..."
                
                # Intentar ejecutar seeders uno por uno con retry logic
                for seeder in $AVAILABLE_SEEDERS; do
                    seeder_name=$(basename "$seeder" .ts | basename "$seeder" .js)
                    log_message "INFO" "Ejecutando seeder: $seeder_name"
                    
                    # Configurar MySQL para evitar deadlocks durante seeders
                    mysql -u ${instancia_add} -p${mysql_password} -e "SET GLOBAL innodb_lock_wait_timeout = 120; SET GLOBAL innodb_deadlock_detect = ON;" 2>/dev/null
                    
                    # Intentar ejecutar el seeder con retry logic
                    MAX_SEEDER_RETRIES=3
                    seeder_success=false
                    
                    for ((retry=1; retry<=MAX_SEEDER_RETRIES; retry++)); do
                        log_message "INFO" "Intento $retry/$MAX_SEEDER_RETRIES para seeder: $seeder_name"
                        
                        # Ejecutar el seeder
                        if npx sequelize db:seed --seed "$seeder_name" 2>/dev/null; then
                            log_message "SUCCESS" "✅ Seeder ejecutado correctamente: $seeder_name"
                            seeder_success=true
                            break
                        else
                            # Capturar el error específico
                            SEEDER_ERROR=$(npx sequelize db:seed --seed "$seeder_name" 2>&1 | tail -n 1)
                            
                            if echo "$SEEDER_ERROR" | grep -q "Validation error"; then
                                log_message "WARNING" "⚠️ Seeder $seeder_name falló por Validation error (datos duplicados), continuando..."
                                seeder_success=true  # Considerar como éxito si es error de validación
                                break
                            elif echo "$SEEDER_ERROR" | grep -q "Duplicate entry"; then
                                log_message "WARNING" "⚠️ Seeder $seeder_name falló por entrada duplicada, continuando..."
                                seeder_success=true  # Considerar como éxito si es entrada duplicada
                                break
                            elif echo "$SEEDER_ERROR" | grep -q "ER_NO_SUCH_TABLE"; then
                                log_message "ERROR" "❌ Seeder $seeder_name falló - tabla no existe"
                                break
                            else
                                log_message "WARNING" "⚠️ Seeder $seeder_name falló (intento $retry/$MAX_SEEDER_RETRIES): $SEEDER_ERROR"
                                if [ $retry -lt $MAX_SEEDER_RETRIES ]; then
    sleep 2
                                fi
                            fi
                        fi
                    done
                    
                    if [ "$seeder_success" = false ]; then
                        log_message "ERROR" "❌ Seeder $seeder_name falló después de $MAX_SEEDER_RETRIES intentos"
                        register_error "Seeder $seeder_name falló"
                    fi
                done
                
                # Como alternativa, intentar ejecutar todos los seeders de una vez
                log_message "INFO" "Intentando ejecutar todos los seeders de una vez..."
                if npx sequelize db:seed:all 2>/dev/null; then
                    log_message "SUCCESS" "✅ Todos los seeders ejecutados correctamente"
                else
                    log_message "WARNING" "⚠️ Ejecución masiva de seeders falló, pero los individuales pueden haber funcionado"
                fi
            fi
        else
            log_message "INFO" "No se encontraron seeders en $SEEDERS_DIR"
        fi
    else
        log_message "INFO" "Directorio de seeders no encontrado: $SEEDERS_DIR"
    fi

    log_message "SUCCESS" "✅ Migraciones y seeders procesados"
    
    # Agregar setting faltante viewregister
    log_message "INFO" "Agregando setting faltante 'viewregister'..."
    
    # Verificar si ya existe el setting
    VIEWREGISTER_EXISTS=$(mysql -u ${instancia_add} -p${mysql_password} ${instancia_add} -e "SELECT COUNT(*) FROM Settings WHERE \`key\` = 'viewregister';" 2>/dev/null | tail -n 1 | tr -d ' ')
    
    if [ "$VIEWREGISTER_EXISTS" -eq 0 ]; then
        # Verificar que existe al menos una empresa
        COMPANY_COUNT=$(mysql -u ${instancia_add} -p${mysql_password} ${instancia_add} -e "SELECT COUNT(*) FROM Companies;" 2>/dev/null | tail -n 1 | tr -d ' ')
        
        if [ "$COMPANY_COUNT" -gt 0 ]; then
            # Obtener el ID de la primera empresa
            COMPANY_ID=$(mysql -u ${instancia_add} -p${mysql_password} ${instancia_add} -e "SELECT id FROM Companies LIMIT 1;" 2>/dev/null | tail -n 1 | tr -d ' ')
            
            if [ ! -z "$COMPANY_ID" ] && [ "$COMPANY_ID" -gt 0 ]; then
                mysql -u ${instancia_add} -p${mysql_password} ${instancia_add} -e "INSERT INTO Settings (\`key\`, \`value\`, createdAt, updatedAt, companyId) VALUES ('viewregister', 'enabled', NOW(), NOW(), $COMPANY_ID);" 2>/dev/null
                if [ $? -eq 0 ]; then
                    log_message "SUCCESS" "✅ Setting 'viewregister' agregado correctamente para empresa ID: $COMPANY_ID"
                else
                    log_message "WARNING" "⚠️ No se pudo agregar el setting 'viewregister', pero continuando..."
                fi
            else
                log_message "WARNING" "⚠️ No se pudo obtener ID de empresa válido para viewregister"
            fi
        else
            log_message "WARNING" "⚠️ No hay empresas disponibles para agregar viewregister"
        fi
    else
        log_message "SUCCESS" "✅ Setting 'viewregister' ya existe"
    fi
    
    sleep 2
    return 0
}

# Función para configurar PM2
configure_pm2() {
    log_message "STEP" "=== CONFIGURANDO PM2 ==="
    
    print_banner
    printf "${WHITE} 💻 Configurando PM2...${GRAY_LIGHT}\n\n"

    sleep 2

    # Navegar al directorio del backend
    cd "$BACKEND_DIR" || {
        register_error "No se pudo acceder al directorio del backend"
        return 1
    }

    # Iniciar aplicación con PM2
    if ! pm2 start ecosystem.config.js; then
        register_error "No se pudo iniciar la aplicación con PM2"
        return 1
    fi

    # Guardar configuración de PM2
    if ! pm2 save; then
        register_error "No se pudo guardar la configuración de PM2"
        return 1
    fi

    # Configurar PM2 para iniciar con el sistema
    if ! pm2 startup; then
        register_error "No se pudo configurar PM2 para inicio automático"
        return 1
    fi
    
    log_message "SUCCESS" "✅ PM2 configurado correctamente"
    sleep 2
    return 0
}

# Función para configurar Nginx
configure_nginx() {
    log_message "STEP" "=== CONFIGURANDO NGINX ==="
    
    print_banner
    printf "${WHITE} 💻 Configurando Nginx con optimizaciones WebSocket...${GRAY_LIGHT}\n\n"

    sleep 2

    # Limpiar configuraciones anteriores
    log_message "INFO" "Limpiando configuraciones anteriores de Nginx..."
    rm -f /etc/nginx/sites-enabled/watoolx*
    rm -f /etc/nginx/sites-available/watoolx*
    rm -f /etc/nginx/sites-enabled/default

    # Crear configuración de Nginx
    log_message "INFO" "Creando configuración de Nginx..."
    cat > /etc/nginx/sites-available/watoolx << 'EOF'
server {
    server_name waticketapi.todosistemas.online;

    # Configuración para API REST
    location / {
        proxy_pass http://127.0.0.1:4142;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;

        # Timeouts para API
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
        proxy_connect_timeout 60s;
        
        # Buffer sizes para API
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # Configuración optimizada para WebSocket (CRÍTICA)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:4142;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Configuraciones críticas para WebSocket
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 60s;
        proxy_buffering off;
        proxy_cache off;
        proxy_request_buffering off;

        # Headers adicionales para WebSocket
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;

        # Configuración de buffer para WebSocket
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
    
    # Configuración para archivos estáticos
    location /public/ {
        alias ${BACKEND_DIR}/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

server {
    server_name waticketapp.todosistemas.online;

    location / {
        proxy_pass http://127.0.0.1:3435;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;

        # Timeouts para frontend
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
        proxy_connect_timeout 60s;
        
        # Buffer sizes para frontend
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
    
    # Configuración para archivos estáticos
    location /static/ {
        alias ${FRONTEND_DIR}/build/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

    # Verificar sintaxis de Nginx
    if nginx -t; then
        log_message "SUCCESS" "✅ Sintaxis de Nginx verificada correctamente"
    else
        log_message "ERROR" "❌ Error en la sintaxis de Nginx"
        register_error "Error en la configuración de Nginx"
        return 1
    fi

    # Habilitar el sitio
    log_message "INFO" "Habilitando sitio en Nginx..."
    ln -sf /etc/nginx/sites-available/watoolx /etc/nginx/sites-enabled/
    
    # Verificar que el enlace se creó correctamente
    if [ -L "/etc/nginx/sites-enabled/watoolx" ]; then
        log_message "SUCCESS" "✅ Enlace simbólico creado correctamente"
    else
        log_message "ERROR" "❌ No se pudo crear el enlace simbólico"
        register_error "Error al crear enlace simbólico de Nginx"
        return 1
    fi

    # Recargar Nginx
    if systemctl reload nginx; then
        log_message "SUCCESS" "✅ Nginx configurado correctamente con optimizaciones WebSocket"
    else
        log_message "ERROR" "❌ Error al recargar Nginx"
        register_error "Error al recargar Nginx"
        return 1
    fi

    # Verificar que el sitio esté habilitado correctamente
    log_message "INFO" "Verificando configuración de Nginx..."
    if [ ! -L "/etc/nginx/sites-enabled/watoolx" ]; then
        log_message "WARNING" "⚠️ Sitio de Nginx no está habilitado, habilitando..."
        ln -sf /etc/nginx/sites-available/watoolx /etc/nginx/sites-enabled/watoolx
        rm -f /etc/nginx/sites-enabled/default
        systemctl reload nginx
        log_message "SUCCESS" "✅ Sitio de Nginx habilitado correctamente"
    fi
    
    # Verificar que los archivos estáticos sean accesibles
    log_message "INFO" "Verificando acceso a archivos estáticos..."
    sleep 3
    
    # Verificar que el directorio de archivos estáticos existe
    if [ ! -d "${BACKEND_DIR}/public" ]; then
        log_message "ERROR" "❌ Directorio de archivos estáticos no encontrado: ${BACKEND_DIR}/public"
        register_error "Directorio de archivos estáticos no encontrado"
        return 1
    fi

    # Verificar que al menos un archivo de imagen existe
    if [ ! -f "${BACKEND_DIR}/public/logotipos/login.png" ]; then
        log_message "WARNING" "⚠️ Archivo login.png no encontrado, verificando otros archivos..."
        if ls ${BACKEND_DIR}/public/logotipos/*.png >/dev/null 2>&1; then
            log_message "SUCCESS" "✅ Archivos de logotipos encontrados"
        else
            log_message "ERROR" "❌ No se encontraron archivos de logotipos"
            register_error "Archivos de logotipos no encontrados"
        return 1
    fi
    else
        log_message "SUCCESS" "✅ Archivo login.png encontrado"
    fi

    sleep 2
    return 0
}

# Función para configurar SSL con Certbot
configure_ssl() {
    log_message "STEP" "=== CONFIGURANDO SSL CON CERTBOT ==="
    
    print_banner
    printf "${WHITE} 🔒 Configurando certificados SSL...${GRAY_LIGHT}\n\n"

    sleep 2

    # Verificar que Nginx esté configurado y funcionando
    if ! systemctl is-active --quiet nginx; then
        log_message "ERROR" "❌ Nginx no está ejecutándose"
        register_error "Nginx no está ejecutándose"
        return 1
    fi

    # Verificar que el sitio esté habilitado
    if [ ! -L "/etc/nginx/sites-enabled/watoolx" ]; then
        log_message "ERROR" "❌ Sitio de Nginx no está habilitado"
        register_error "Sitio de Nginx no está habilitado"
        return 1
    fi

    # Verificar si los certificados ya existen
    if [ -d "/etc/letsencrypt/live/$frontend_url" ] && [ -d "/etc/letsencrypt/live/$backend_url" ]; then
        log_message "SUCCESS" "✅ Certificados SSL ya existen"
        return 0
    fi

    # Solicitar certificados SSL
    log_message "INFO" "Solicitando certificados SSL para $frontend_url y $backend_url..."
    
    SSL_SUCCESS=true
    
    # Obtener certificados para ambos dominios en una sola operación
    if certbot --nginx -d "$frontend_url" -d "$backend_url" --non-interactive --agree-tos --email admin@$frontend_url; then
        log_message "SUCCESS" "✅ Certificados SSL obtenidos para $frontend_url y $backend_url"
        SSL_SUCCESS=true
    else
        log_message "ERROR" "❌ No se pudieron obtener certificados SSL"
        SSL_SUCCESS=false
    fi

    # Configurar renovación automática
    log_message "INFO" "Configurando renovación automática de certificados..."
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

    if [ "$SSL_SUCCESS" = true ]; then
        log_message "SUCCESS" "✅ SSL configurado correctamente"
        
            # Verificar que Nginx esté escuchando en puerto 443
    log_message "INFO" "Verificando que Nginx esté escuchando en puerto 443..."
    sleep 3
    if netstat -tlnp | grep -q ":443.*nginx"; then
        log_message "SUCCESS" "✅ Nginx escuchando correctamente en puerto 443"
    else
        log_message "WARNING" "⚠️ Nginx no está escuchando en puerto 443, recargando..."
        systemctl reload nginx
        sleep 2
        if netstat -tlnp | grep -q ":443.*nginx"; then
            log_message "SUCCESS" "✅ Nginx escuchando correctamente en puerto 443"
        else
            log_message "ERROR" "❌ Nginx no está escuchando en puerto 443"
            SSL_SUCCESS=false
        fi
    fi
    
    # Verificar que el backend esté funcionando después de SSL
    log_message "INFO" "Verificando que el backend esté funcionando..."
    sleep 5
    if curl -s -I http://localhost:4142 > /dev/null 2>&1; then
        log_message "SUCCESS" "✅ Backend respondiendo correctamente"
    else
        log_message "ERROR" "❌ Backend no está respondiendo"
        SSL_SUCCESS=false
    fi
    
    # Verificar que las imágenes sean accesibles después de SSL
    log_message "INFO" "Verificando acceso a imágenes después de SSL..."
    sleep 3
    if curl -s -I https://waticketapi.todosistemas.online/public/logotipos/login.png | grep -q "200 OK"; then
        log_message "SUCCESS" "✅ Imágenes accesibles correctamente"
    else
        log_message "WARNING" "⚠️ Las imágenes no son accesibles, verificando configuración..."
        # Intentar recargar Nginx
        systemctl reload nginx
        sleep 2
        if curl -s -I https://waticketapi.todosistemas.online/public/logotipos/login.png | grep -q "200 OK"; then
            log_message "SUCCESS" "✅ Imágenes accesibles después de recargar Nginx"
        else
            log_message "ERROR" "❌ Las imágenes no son accesibles"
            SSL_SUCCESS=false
        fi
    fi
        
        return 0
    else
        log_message "WARNING" "⚠️ SSL configurado parcialmente (algunos certificados fallaron)"
        return 1
    fi
}

# Función para instalar y configurar el frontend
install_frontend() {
    log_message "STEP" "=== INSTALANDO Y CONFIGURANDO FRONTEND ==="
    
    print_banner
    printf "${WHITE} 💻 Instalando y configurando frontend...${GRAY_LIGHT}\n\n"

    sleep 2

    # Navegar al directorio del frontend
    cd "$FRONTEND_DIR" || {
        register_error "No se pudo acceder al directorio del frontend"
        return 1
    }

    # Configurar variables de entorno del frontend
    log_message "INFO" "Configurando variables de entorno del frontend..."
    cat > .env << EOF
REACT_APP_BACKEND_URL=https://${backend_url}
REACT_APP_HOURS_CLOSE_TICKETS_AUTO=24
REACT_APP_REACT_APP_SHOW_LOGO_TOP=true
REACT_APP_REACT_APP_SHOW_LOGO_LOGIN=true
REACT_APP_REACT_APP_SHOW_LOGO_FAVICON=true
REACT_APP_REACT_APP_SHOW_LOGO_MAIN_SCREEN=true
REACT_APP_REACT_APP_SHOW_LOGO_MENU=true
REACT_APP_REACT_APP_SHOW_LOGO_TICKET=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_DARK=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_LIGHT=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_DARK=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_LIGHT=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_WHITE=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_BLACK=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_GRAY=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_RED=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_GREEN=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_BLUE=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_YELLOW=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_ORANGE=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_PURPLE=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_PINK=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_BROWN=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_CYAN=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_MAGENTA=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_LIME=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_INDIGO=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_TEAL=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_AMBER=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_EMERALD=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_ROSE=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_SKY=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_SLATE=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_STONE=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_NEUTRAL=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_ZINC=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_GRAY_50=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_GRAY_100=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_GRAY_200=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_GRAY_300=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_GRAY_400=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_GRAY_500=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_GRAY_600=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_GRAY_700=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_GRAY_800=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_GRAY_900=true
REACT_APP_REACT_APP_SHOW_LOGO_EMPTY_TICKET_WHATSAPP_GRAY_950=true
EOF

    log_message "SUCCESS" "✅ Variables de entorno del frontend configuradas"

    # Instalar dependencias del frontend
    log_message "INFO" "Instalando dependencias del frontend..."
    if npm install --legacy-peer-deps; then
        log_message "SUCCESS" "✅ Dependencias del frontend instaladas correctamente"
    else
        log_message "ERROR" "❌ Error al instalar dependencias del frontend"
        register_error "Error al instalar dependencias del frontend"
        return 1
    fi

    # Corregir permisos de ejecución en binarios npm
    log_message "INFO" "Corrigiendo permisos de ejecución..."
    chmod +x node_modules/.bin/* 2>/dev/null || true

    # Crear archivo isExpired.js si no existe
    log_message "INFO" "Verificando archivos faltantes..."
    if [ ! -f "src/utils/isExpired.js" ]; then
        cat > src/utils/isExpired.js << 'EOF'
// Función para verificar si un token JWT ha expirado
export const isExpired = (token) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    return true;
  }
};
EOF
        log_message "SUCCESS" "✅ Archivo isExpired.js creado"
    fi

    # Corregir import de socket.io-client
    log_message "INFO" "Corrigiendo imports de socket.io-client..."
    if grep -q "openSocket" src/context/Socket/SocketContext.js; then
        sed -i 's/import { openSocket } from "socket.io-client";/import { io } from "socket.io-client";/g' src/context/Socket/SocketContext.js
        sed -i 's/openSocket/io/g' src/context/Socket/SocketContext.js
        log_message "SUCCESS" "✅ Imports de socket.io-client corregidos"
    fi

    # Compilar frontend para producción
    log_message "INFO" "Compilando frontend para producción..."
    if npm run build; then
        log_message "SUCCESS" "✅ Frontend compilado correctamente"
    else
        log_message "ERROR" "❌ Error al compilar frontend"
        register_error "Error al compilar frontend"
        return 1
    fi

    # Instalar serve para servir el frontend
    log_message "INFO" "Instalando serve para servir el frontend..."
    npm install -g serve

    # Configurar PM2 para el frontend
    log_message "INFO" "Configurando PM2 para el frontend..."
    pm2 start serve --name "beta-front" -- -s build -l 3435

    # Guardar configuración de PM2
    pm2 save

    log_message "SUCCESS" "✅ Frontend instalado y configurado correctamente"
    sleep 2
    return 0
}

# Función para diagnóstico completo del sistema
diagnose_system() {
    log_message "STEP" "=== DIAGNÓSTICO COMPLETO DEL SISTEMA ==="
    
    print_banner
    printf "${WHITE} 🔍 Realizando diagnóstico completo...${GRAY_LIGHT}\n\n"

    sleep 2

    echo -e "${CYAN}🔧 DIAGNÓSTICO DEL SISTEMA:${NC}"
    echo -e "${GRAY_LIGHT}"
    
    # 1. Verificar servicios del sistema
    echo "1. Verificando servicios del sistema..."
    if systemctl is-active --quiet mysql; then
        echo -e "   ${GREEN}✅ MySQL ejecutándose${NC}"
    else
        echo -e "   ${RED}❌ MySQL no está ejecutándose${NC}"
    fi
    
    if systemctl is-active --quiet redis-server; then
        echo -e "   ${GREEN}✅ Redis ejecutándose${NC}"
    else
        echo -e "   ${RED}❌ Redis no está ejecutándose${NC}"
    fi
    
    if systemctl is-active --quiet nginx; then
        echo -e "   ${GREEN}✅ Nginx ejecutándose${NC}"
    else
        echo -e "   ${RED}❌ Nginx no está ejecutándose${NC}"
    fi
    
    # 2. Verificar aplicaciones PM2
    echo -e "\n2. Verificando aplicaciones PM2..."
    if command -v pm2 &> /dev/null; then
        PM2_APPS=$(pm2 list --no-daemon 2>/dev/null | grep -c "online" || echo "0")
        if [ "$PM2_APPS" -gt 0 ]; then
            echo -e "   ${GREEN}✅ PM2 ejecutando $PM2_APPS aplicación(es)${NC}"
        else
            echo -e "   ${YELLOW}⚠️  PM2 instalado pero sin aplicaciones ejecutándose${NC}"
        fi
    else
        echo -e "   ${RED}❌ PM2 no está instalado${NC}"
    fi
    
    # 3. Verificar puertos
    echo -e "\n3. Verificando puertos..."
    if netstat -tlnp 2>/dev/null | grep -q ":3306"; then
        echo -e "   ${GREEN}✅ Puerto 3306 (MySQL) abierto${NC}"
    else
        echo -e "   ${RED}❌ Puerto 3306 (MySQL) cerrado${NC}"
    fi
    
    if netstat -tlnp 2>/dev/null | grep -q ":6379"; then
        echo -e "   ${GREEN}✅ Puerto 6379 (Redis) abierto${NC}"
    else
        echo -e "   ${RED}❌ Puerto 6379 (Redis) cerrado${NC}"
    fi
    
    if netstat -tlnp 2>/dev/null | grep -q ":4142"; then
        echo -e "   ${GREEN}✅ Puerto 4142 (Backend) abierto${NC}"
    else
        echo -e "   ${RED}❌ Puerto 4142 (Backend) cerrado${NC}"
    fi
    
    if netstat -tlnp 2>/dev/null | grep -q ":80"; then
        echo -e "   ${GREEN}✅ Puerto 80 (Nginx) abierto${NC}"
    else
        echo -e "   ${RED}❌ Puerto 80 (Nginx) cerrado${NC}"
    fi
    
    # 4. Verificar base de datos
    echo -e "\n4. Verificando base de datos..."
    if mysql -u root -p${mysql_password} -e "USE ${instancia_add}; SHOW TABLES;" 2>/dev/null | grep -q "Users"; then
        echo -e "   ${GREEN}✅ Base de datos ${instancia_add} accesible${NC}"
    else
        echo -e "   ${RED}❌ Base de datos ${instancia_add} no accesible${NC}"
    fi
    
    # 5. Verificar migraciones
    echo -e "\n5. Verificando migraciones..."
    if [ -d "$BACKEND_DIR" ]; then
        cd "$BACKEND_DIR" 2>/dev/null
        MIGRATION_STATUS=$(npx sequelize db:migrate:status 2>/dev/null | grep -c "up" || echo "0")
        if [ "$MIGRATION_STATUS" -gt 0 ]; then
            echo -e "   ${GREEN}✅ $MIGRATION_STATUS migración(es) ejecutada(s)${NC}"
        else
            echo -e "   ${YELLOW}⚠️  No se encontraron migraciones ejecutadas${NC}"
        fi
    else
        echo -e "   ${RED}❌ Directorio backend no encontrado${NC}"
    fi
    
    # 6. Verificar logs de errores
    echo -e "\n6. Verificando logs de errores..."
    if [ -f "/var/log/nginx/error.log" ]; then
        NGINX_ERRORS=$(tail -n 20 /var/log/nginx/error.log | grep -c "error" || echo "0")
        if [ "$NGINX_ERRORS" -eq 0 ]; then
            echo -e "   ${GREEN}✅ Nginx sin errores recientes${NC}"
        else
            echo -e "   ${YELLOW}⚠️  $NGINX_ERRORS error(es) en logs de Nginx${NC}"
        fi
    fi
    
    if command -v pm2 &> /dev/null; then
        PM2_ERRORS=$(pm2 logs --no-daemon --lines 1 2>/dev/null | grep -c "ERROR" || echo "0")
        if [ "$PM2_ERRORS" -eq 0 ]; then
            echo -e "   ${GREEN}✅ PM2 sin errores recientes${NC}"
        else
            echo -e "   ${YELLOW}⚠️  $PM2_ERRORS error(es) en logs de PM2${NC}"
        fi
    fi
    
    # 7. Verificar WebSocket
    echo -e "\n7. Verificando WebSocket..."
    if curl -s http://localhost:4142/socket.io/ > /dev/null 2>&1; then
        echo -e "   ${GREEN}✅ WebSocket accesible${NC}"
    else
        echo -e "   ${RED}❌ WebSocket no accesible${NC}"
    fi
    
    # 8. Verificar configuración de Nginx
    echo -e "\n8. Verificando configuración de Nginx..."
    if nginx -t 2>/dev/null; then
        echo -e "   ${GREEN}✅ Configuración de Nginx válida${NC}"
    else
        echo -e "   ${RED}❌ Configuración de Nginx inválida${NC}"
    fi
    
    echo -e "\n${CYAN}📊 RESUMEN DEL DIAGNÓSTICO:${NC}"
    echo -e "${GRAY_LIGHT}• Sistema: $(uname -s) $(uname -r)${NC}"
    echo -e "${GRAY_LIGHT}• Memoria disponible: $(free -h | grep Mem | awk '{print $7}')${NC}"
    echo -e "${GRAY_LIGHT}• Espacio en disco: $(df -h / | tail -1 | awk '{print $4}')${NC}"
    echo -e "${GRAY_LIGHT}• Carga del sistema: $(uptime | awk -F'load average:' '{print $2}')${NC}"
    
    echo -e "\n${WHITE}¿Deseas generar un reporte detallado? (y/n):${NC} "
    read -r generate_report
    if [[ "$generate_report" =~ ^[Yy]$ ]]; then
        generate_detailed_report
    fi
}

# Función para generar reporte detallado
generate_detailed_report() {
    local report_file="/tmp/watoolx_diagnostic_$(date +%Y%m%d_%H%M%S).txt"
    
    echo "=== REPORTE DIAGNÓSTICO WATOOLX ===" > "$report_file"
    echo "Fecha: $(date)" >> "$report_file"
    echo "Sistema: $(uname -a)" >> "$report_file"
    echo "" >> "$report_file"
    
    echo "=== SERVICIOS ===" >> "$report_file"
    systemctl status mysql redis-server nginx >> "$report_file" 2>&1
    echo "" >> "$report_file"
    
    echo "=== PM2 STATUS ===" >> "$report_file"
    pm2 list >> "$report_file" 2>&1
    echo "" >> "$report_file"
    
    echo "=== PUERTOS ABIERTOS ===" >> "$report_file"
    netstat -tlnp >> "$report_file" 2>&1
    echo "" >> "$report_file"
    
    echo "=== LOGS DE ERRORES ===" >> "$report_file"
    tail -n 50 /var/log/nginx/error.log >> "$report_file" 2>&1
    echo "" >> "$report_file"
    
    echo "Reporte guardado en: $report_file"
    echo -e "${GREEN}✅ Reporte detallado generado${NC}"
}

# Función para capturar datos del usuario
capture_user_data() {
    print_banner
    echo -e "${WHITE}📋 CAPTURA DE DATOS PARA INSTALACIÓN${NC}"
    echo -e "${GRAY_LIGHT}Por favor, proporciona la siguiente información:${NC}\n"
    
    # Capturar nombre de la instancia
    while [ -z "$instancia_add" ]; do
        echo -e "${CYAN}Nombre de la instancia (ej: miempresa):${NC} "
        read -r instancia_add
        if [ -z "$instancia_add" ]; then
            echo -e "${RED}❌ El nombre de la instancia es requerido${NC}"
        fi
    done
    
    # Capturar URL del frontend
    while [ -z "$frontend_url" ]; do
        echo -e "${CYAN}URL del frontend (ej: https://miempresa.com):${NC} "
        read -r frontend_url
        if [ -z "$frontend_url" ]; then
            echo -e "${RED}❌ La URL del frontend es requerida${NC}"
        fi
    done
    
    # Capturar URL del backend
    while [ -z "$backend_url" ]; do
        echo -e "${CYAN}URL del backend (ej: https://api.miempresa.com):${NC} "
        read -r backend_url
        if [ -z "$backend_url" ]; then
            echo -e "${RED}❌ La URL del backend es requerida${NC}"
        fi
    done
    
    # Mostrar resumen de configuración
    echo -e "\n${GREEN}✅ Configuración capturada:${NC}"
    echo -e "${GRAY_LIGHT}• Instancia: $instancia_add${NC}"
    echo -e "${GRAY_LIGHT}• Frontend: $frontend_url${NC}"
    echo -e "${GRAY_LIGHT}• Backend: $backend_url${NC}"
    echo -e "${GRAY_LIGHT}• Contraseña MySQL: $mysql_password${NC}"
    echo -e "${GRAY_LIGHT}• Puerto Frontend: $frontend_port${NC}"
    echo -e "${GRAY_LIGHT}• Puerto Backend: $backend_port${NC}"
    echo -e "${GRAY_LIGHT}• Puerto Redis: $redis_port${NC}"
    
    echo -e "\n${WHITE}¿Continuar con la instalación? (y/n):${NC} "
    read -r confirm_installation
    if [[ ! "$confirm_installation" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Instalación cancelada por el usuario${NC}"
        exit 0
    fi
}

# Función principal de instalación completa
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
    if ! check_internet_connectivity; then
        echo -e "\n${YELLOW}⚠️  Advertencias de conectividad detectadas, continuando...${NC}"
    fi
    
    # Dependencias del sistema
    if ! install_system_dependencies; then
        register_error "Error en instalación de dependencias del sistema"
    fi
    
    # Verificar reinicio después de instalar dependencias del sistema
    check_reboot_required
    
    # Configurar MySQL y Redis
    if ! configure_mysql; then
        register_error "Error en configuración de MySQL"
    fi
    
    if ! configure_redis; then
        register_error "Error en configuración de Redis"
    fi
    
    # Configurar variables de entorno del backend
    if ! backend_environment; then
        register_error "Error en configuración de variables de entorno del backend"
    fi
    
    # Backend
    if ! install_backend; then
        register_error "Error en instalación del backend"
    fi
    
    # Frontend
    if ! install_frontend; then
        register_error "Error en instalación del frontend"
    fi
    
    # Configuración SSL y Proxy directo (sin mostrar proceso HTTP)
    log_message "STEP" "=== CONFIGURACIÓN SSL Y PROXY DIRECTO ==="
    
    # Configuración SSL y Proxy mejorada
    if ! configure_ssl; then
        register_error "Error en obtención de certificados SSL"
    fi
    
    if ! configure_nginx; then
        register_error "Error en configuración de proxy inverso"
    fi
    
    # Verificar reinicio después de configurar Nginx
    check_reboot_required
    
    # Verificación final de servicios
    verify_services_status
    
    # Verificación final
    verify_installation
    
    # Verificación final de reinicio requerido
    check_reboot_required
    
    # Mostrar resumen final
    show_installation_summary
    
    # Solo mostrar éxito si no hay errores
    if [ ${#INSTALLATION_ERRORS[@]} -eq 0 ]; then
        echo -e "\n${WHITE}Presiona 'm' para regresar al menú principal:${NC} "
        read -r return_to_menu
        if [[ "$return_to_menu" =~ ^[Mm]$ ]]; then
            main
        fi
    else
        echo -e "\n${WHITE}Presiona 'm' para regresar al menú principal:${NC} "
        read -r return_to_menu
        if [[ "$return_to_menu" =~ ^[Mm]$ ]]; then
            main
        fi
    fi
}

# Función principal
main() {
    # Crear archivo de log
    touch "$LOG_FILE"
    
    # Mostrar opciones
    print_banner
    echo -e "${WHITE}¿Qué deseas hacer?${NC}"
    echo -e "${GRAY_LIGHT}1. Instalación completa${NC}"
    echo -e "${GRAY_LIGHT}2. Diagnóstico completo del sistema${NC}"
    echo -e "${GRAY_LIGHT}3. Salir${NC}"
    echo ""
    echo -e "${CYAN}Selecciona una opción (1-3):${NC} "
    read -r option
    
    case $option in
        1)
            # Capturar datos del usuario
            capture_user_data
            
            # Ejecutar instalación principal
            if run_complete_installation; then
                show_installation_summary
                # El mensaje de éxito/error se maneja dentro de run_complete_installation
            else
                echo -e "\n${RED}❌ La instalación falló. Revisa los logs en: $LOG_FILE${NC}"
                echo -e "\n${WHITE}Presiona 'm' para regresar al menú principal:${NC} "
                read -r return_to_menu
                if [[ "$return_to_menu" =~ ^[Mm]$ ]]; then
                    main
                fi
            fi
            ;;
        2)
            # Ejecutar diagnóstico
            diagnose_system
            ;;
        3)
            echo -e "${YELLOW}¡Hasta luego!${NC}"
                exit 0
                ;;
            *) 
            echo -e "${RED}Opción inválida. Por favor, selecciona 1, 2 o 3.${NC}"
            main
                ;;
        esac
}

# Ejecutar función principal
main "$@" 