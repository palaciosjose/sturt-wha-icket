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
    echo "║                        CON MYSQL                              ║"
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

    # Verificar conectividad a internet
    if ! ping -c 1 google.com &> /dev/null; then
        register_error "No hay conectividad a internet"
        return 1
    fi

    log_message "SUCCESS" "✅ Requisitos del sistema verificados correctamente"
    sleep 2
    return 0
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

    # Instalar Node.js y npm
    log_message "INFO" "Instalando Node.js..."
    if ! curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -; then
        register_error "No se pudo agregar el repositorio de Node.js"
        return 1
    fi
    
    if ! sudo apt-get install -y nodejs; then
        register_error "No se pudo instalar Node.js"
        return 1
    fi

    # Instalar PM2 globalmente
    log_message "INFO" "Instalando PM2..."
    if ! sudo npm install -g pm2; then
        register_error "No se pudo instalar PM2"
        return 1
    fi

    # Instalar MySQL Server
    log_message "INFO" "Instalando MySQL Server..."
    if ! sudo apt-get install -y mysql-server; then
        register_error "No se pudo instalar MySQL Server"
        return 1
    fi

    # Instalar Redis
    log_message "INFO" "Instalando Redis..."
    if ! sudo apt-get install -y redis-server; then
        register_error "No se pudo instalar Redis"
        return 1
    fi

    # Instalar Nginx
    log_message "INFO" "Instalando Nginx..."
    if ! sudo apt-get install -y nginx; then
        register_error "No se pudo instalar Nginx"
        return 1
    fi

    # Instalar Docker (opcional, para Redis en contenedor)
    log_message "INFO" "Instalando Docker..."
    if ! curl -fsSL https://get.docker.com -o get-docker.sh; then
        register_error "No se pudo descargar el script de Docker"
        return 1
    fi
    
    if ! sudo sh get-docker.sh; then
        register_error "No se pudo instalar Docker"
        return 1
    fi
    
    # Agregar usuario actual al grupo docker
    sudo usermod -aG docker $USER

    log_message "SUCCESS" "✅ Dependencias del sistema instaladas correctamente"
    sleep 2
    return 0
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

    # Ejecutar migraciones
    if ! npx sequelize db:migrate; then
        register_error "No se pudieron ejecutar las migraciones"
        return 1
    fi

    # Ejecutar seeders
    if ! npx sequelize db:seed:all; then
        register_error "No se pudieron ejecutar los seeders"
        return 1
    fi

    log_message "SUCCESS" "✅ Migraciones ejecutadas correctamente"
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

    # Crear configuración de Nginx para el backend con WebSocket optimizado
    sudo tee /etc/nginx/sites-available/watoolx-backend << EOF
server {
    server_name ${backend_url};
    
    # Configuración para API REST
    location / {
        proxy_pass http://127.0.0.1:${backend_port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
        
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
        proxy_pass http://127.0.0.1:${backend_port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Configuraciones críticas para WebSocket
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 60s;
        proxy_buffering off;
        proxy_cache off;
        proxy_request_buffering off;
        
        # Headers adicionales para WebSocket
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Server \$host;
        
        # Configuración de buffer para WebSocket
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
    
    # Configuración para archivos estáticos
    location /public/ {
        alias /var/www/watoolx/backend/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

    # Crear configuración de Nginx para el frontend
    sudo tee /etc/nginx/sites-available/watoolx-frontend << EOF
server {
    server_name ${frontend_url};
    
    location / {
        proxy_pass http://127.0.0.1:${frontend_port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
        
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

    # Habilitar sitios
    sudo ln -sf /etc/nginx/sites-available/watoolx-backend /etc/nginx/sites-enabled/
    sudo ln -sf /etc/nginx/sites-available/watoolx-frontend /etc/nginx/sites-enabled/

    # Verificar configuración de Nginx
    if ! sudo nginx -t; then
        register_error "Error en la configuración de Nginx"
        return 1
    fi

    # Recargar Nginx
    if ! sudo systemctl reload nginx; then
        register_error "No se pudo recargar Nginx"
        return 1
    fi

    log_message "SUCCESS" "✅ Nginx configurado correctamente con optimizaciones WebSocket"
    sleep 2
    return 0
}

# Función para diagnosticar WebSocket
diagnose_websocket() {
    log_message "STEP" "=== DIAGNÓSTICO DE WEBSOCKET ==="
    
    print_banner
    printf "${WHITE} 🔍 Diagnosticando WebSocket...${GRAY_LIGHT}\n\n"

    sleep 2

    echo -e "${CYAN}🔧 DIAGNÓSTICO DE WEBSOCKET:${NC}"
    echo -e "${GRAY_LIGHT}"
    
    # Verificar servicios
    echo "1. Verificando servicios..."
    if pm2 list | grep -q "waticket-backend"; then
        echo -e "   ${GREEN}✅ PM2 backend ejecutándose${NC}"
    else
        echo -e "   ${RED}❌ PM2 backend no está ejecutándose${NC}"
    fi
    
    if systemctl is-active --quiet nginx; then
        echo -e "   ${GREEN}✅ Nginx ejecutándose${NC}"
    else
        echo -e "   ${RED}❌ Nginx no está ejecutándose${NC}"
    fi
    
    # Verificar puertos
    echo "2. Verificando puertos..."
    if netstat -tlnp | grep -q ":${backend_port}"; then
        echo -e "   ${GREEN}✅ Puerto ${backend_port} (backend) abierto${NC}"
    else
        echo -e "   ${RED}❌ Puerto ${backend_port} (backend) no está abierto${NC}"
    fi
    
    # Verificar configuración de Nginx
    echo "3. Verificando configuración de Nginx..."
    if nginx -t; then
        echo -e "   ${GREEN}✅ Sintaxis de Nginx correcta${NC}"
    else
        echo -e "   ${RED}❌ Error en la sintaxis de Nginx${NC}"
    fi
    
    if grep -q "socket.io" /etc/nginx/sites-enabled/*; then
        echo -e "   ${GREEN}✅ Configuración de WebSocket encontrada${NC}"
    else
        echo -e "   ${YELLOW}⚠️ Configuración de WebSocket no encontrada${NC}"
    fi
    
    # Verificar headers de WebSocket
    if grep -q "Upgrade" /etc/nginx/sites-enabled/* && grep -q "Connection.*upgrade" /etc/nginx/sites-enabled/*; then
        echo -e "   ${GREEN}✅ Headers de WebSocket configurados${NC}"
    else
        echo -e "   ${RED}❌ Headers de WebSocket no configurados${NC}"
    fi
    
    # Probar conectividad
    echo "4. Probando conectividad..."
    if command -v curl &> /dev/null; then
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:${backend_port} | grep -q "200\|404"; then
            echo -e "   ${GREEN}✅ Backend responde en HTTP${NC}"
        else
            echo -e "   ${RED}❌ Backend no responde en HTTP${NC}"
        fi
        
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:${backend_port}/socket.io/ | grep -q "200\|400"; then
            echo -e "   ${GREEN}✅ Endpoint Socket.IO responde${NC}"
        else
            echo -e "   ${RED}❌ Endpoint Socket.IO no responde${NC}"
        fi
    else
        echo -e "   ${YELLOW}⚠️ curl no está instalado para pruebas${NC}"
    fi
    
    echo ""
    echo -e "${CYAN}💡 RECOMENDACIONES PARA WEBSOCKET:${NC}"
    echo -e "${GRAY_LIGHT}"
    echo "• Verificar que los certificados SSL sean válidos"
    echo "• Asegurar que los puertos 80 y 443 estén abiertos"
    echo "• Verificar que el firewall no bloquee las conexiones"
    echo "• Monitorear los logs de Nginx y PM2"
    echo "• Configurar timeouts apropiados (86400s para WebSocket)"
    echo -e "${NC}"
    
    log_message "SUCCESS" "✅ Diagnóstico de WebSocket completado"
    sleep 2
    return 0
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

# Función principal de instalación
main_installation() {
    log_message "INFO" "Iniciando instalación de Watoolx con MySQL..."
    
    # Actualizar sistema
    if ! system_update; then
        return 1
    fi
    
    # Verificar requisitos
    if ! check_system_requirements; then
        return 1
    fi
    
    # Verificar permisos de MySQL
    if ! verify_mysql_permissions; then
        return 1
    fi
    
    # Instalar dependencias del sistema
    if ! install_system_dependencies; then
        return 1
    fi
    
    # Configurar MySQL
    if ! configure_mysql; then
        return 1
    fi
    
    # Configurar Redis
    if ! configure_redis; then
        return 1
    fi
    
    # Configurar variables de entorno del backend
    if ! backend_environment; then
        return 1
    fi
    
    # Instalar dependencias del backend
    if ! backend_node_dependencies; then
        return 1
    fi
    
    # Compilar backend
    if ! backend_build; then
        return 1
    fi
    
    # Ejecutar migraciones
    if ! backend_migrations; then
        return 1
    fi
    
    # Configurar PM2
    if ! configure_pm2; then
        return 1
    fi
    
    # Configurar Nginx
    if ! configure_nginx; then
        return 1
    fi
    
    log_message "SUCCESS" "🎉 Instalación completada exitosamente"
    return 0
}

# Función principal
main() {
    # Crear archivo de log
    touch "$LOG_FILE"
    
    # Mostrar opciones
    print_banner
    echo -e "${WHITE}¿Qué deseas hacer?${NC}"
    echo -e "${GRAY_LIGHT}1. Instalación completa${NC}"
    echo -e "${GRAY_LIGHT}2. Diagnóstico de WebSocket${NC}"
    echo -e "${GRAY_LIGHT}3. Salir${NC}"
    echo ""
    echo -e "${CYAN}Selecciona una opción (1-3):${NC} "
    read -r option
    
    case $option in
        1)
            # Capturar datos del usuario
            capture_user_data
            
            # Ejecutar instalación principal
            if main_installation; then
                show_installation_summary
                echo -e "\n${GREEN}🎉 ¡Instalación completada exitosamente!${NC}"
                echo -e "${CYAN}Accede a tu aplicación en:${NC} $frontend_url"
                echo -e "${CYAN}API disponible en:${NC} $backend_url"
                echo -e "\n${WHITE}Credenciales por defecto:${NC}"
                echo -e "${GRAY_LIGHT}• Email: admin@admin.com${NC}"
                echo -e "${GRAY_LIGHT}• Password: 123456${NC}"
                
                # Preguntar si quiere hacer diagnóstico
                echo -e "\n${WHITE}¿Quieres hacer un diagnóstico de WebSocket? (y/n):${NC} "
                read -r diagnose_confirm
                if [[ "$diagnose_confirm" =~ ^[Yy]$ ]]; then
                    diagnose_websocket
                fi
            else
                show_installation_summary
                echo -e "\n${RED}❌ La instalación falló. Revisa los errores arriba.${NC}"
                exit 1
            fi
            ;;
        2)
            # Solo diagnóstico
            diagnose_websocket
            ;;
        3)
            echo -e "${YELLOW}Saliendo...${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Opción inválida${NC}"
            exit 1
            ;;
    esac
}

# Ejecutar función principal
main "$@"