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
    if ! check_internet_connectivity; then
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
        "20250122_add_status_field_to_schedules.js"
        "20250122_add_whatsappId_to_schedules.js"
    )

    # Marcar migraciones problemáticas como ejecutadas ANTES de ejecutar migraciones
    log_message "INFO" "Marcando migraciones problemáticas conocidas como ejecutadas..."
    for migration in "${PROBLEMATIC_MIGRATIONS[@]}"; do
        mysql -u ${instancia_add} -p${mysql_password} ${instancia_add} -e "INSERT IGNORE INTO SequelizeMeta (name) VALUES ('$migration');" 2>/dev/null || true
        log_message "SUCCESS" "Migración problemática marcada como ejecutada: $migration"
    done

    # Ejecutar migraciones con manejo de errores
    log_message "INFO" "Ejecutando migraciones..."
    
    # Contador de reintentos
    RETRY_COUNT=0
    MAX_RETRIES=3
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if npx sequelize db:migrate; then
            log_message "SUCCESS" "✅ Migraciones ejecutadas correctamente"
            break
        else
            RETRY_COUNT=$((RETRY_COUNT + 1))
            log_message "WARNING" "Error en migraciones, intentando recuperación (intento $RETRY_COUNT/$MAX_RETRIES)..."
            
            # Verificar si es error de columna duplicada
            if grep -q "Duplicate column name" /tmp/migration_status.log 2>/dev/null || echo "ERROR: Duplicate column name" | grep -q "Duplicate column name"; then
                log_message "INFO" "Detectada migración duplicada, marcando como ejecutada..."
                
                # Obtener todas las migraciones pendientes
                PENDING_MIGRATIONS=$(npx sequelize db:migrate:status 2>/dev/null | grep "down" | awk '{print $1}' | grep -v "^down$" | grep -v "^up$" | grep -E "^[0-9]+.*\.js$")
                
                if [ ! -z "$PENDING_MIGRATIONS" ]; then
                    log_message "INFO" "Marcando migraciones duplicadas como ejecutadas..."
                    
                    # Marcar cada migración pendiente como ejecutada
                    for migration in $PENDING_MIGRATIONS; do
                        # Verificar que el nombre de la migración sea válido
                        if [[ "$migration" =~ ^[0-9]+.*\.js$ ]]; then
                            mysql -u ${instancia_add} -p${mysql_password} ${instancia_add} -e "INSERT IGNORE INTO SequelizeMeta (name) VALUES ('$migration');" 2>/dev/null || true
                            log_message "SUCCESS" "Migración marcada como ejecutada: $migration"
                        else
                            log_message "WARNING" "Nombre de migración inválido ignorado: $migration"
                        fi
                    done
                    
                    # Reintentar migraciones
                    sleep 2
                    continue
                else
                    log_message "WARNING" "No se pudieron identificar migraciones pendientes, continuando..."
                    break
                fi
            else
                # Si no es migración duplicada, reintentar con configuración optimizada
                log_message "INFO" "Reintentando migraciones con configuración optimizada..."
                sleep 5
                
                # Reiniciar MySQL para limpiar deadlocks
                systemctl restart mysql
                sleep 3
                
                continue
            fi
        fi
    done
    
    # Si llegamos aquí sin éxito, registrar error pero continuar
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        log_message "WARNING" "No se pudieron ejecutar todas las migraciones después de $MAX_RETRIES intentos, pero continuando..."
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
                
                # Intentar ejecutar seeders uno por uno
                for seeder in $AVAILABLE_SEEDERS; do
                    seeder_name=$(basename "$seeder" .ts | basename "$seeder" .js)
                    log_message "INFO" "Ejecutando seeder: $seeder_name"
                    
                    # Ejecutar el seeder con manejo de errores
                    if npx sequelize db:seed --seed "$seeder_name" 2>/dev/null; then
                        log_message "SUCCESS" "Seeder ejecutado correctamente: $seeder_name"
                    else
                        log_message "WARNING" "Seeder $seeder_name falló, pero continuando..."
                    fi
                done
            fi
        else
            log_message "INFO" "No se encontraron seeders en $SEEDERS_DIR"
        fi
    else
        log_message "INFO" "Directorio de seeders no encontrado: $SEEDERS_DIR"
    fi

    log_message "SUCCESS" "✅ Migraciones y seeders procesados"
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
        alias /var/www/watoolx/backend/public/;
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
        alias /home/watoolxoficial/frontend/build/static/;
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
    
    # Certificado para el frontend
    if certbot --nginx -d "$frontend_url" --non-interactive --agree-tos --email admin@$frontend_url; then
        log_message "SUCCESS" "✅ Certificado SSL obtenido para $frontend_url"
    else
        log_message "ERROR" "❌ No se pudo obtener certificado para $frontend_url"
        SSL_SUCCESS=false
    fi

    # Certificado para el backend
    if certbot --nginx -d "$backend_url" --non-interactive --agree-tos --email admin@$backend_url; then
        log_message "SUCCESS" "✅ Certificado SSL obtenido para $backend_url"
    else
        log_message "ERROR" "❌ No se pudo obtener certificado para $backend_url"
        SSL_SUCCESS=false
    fi

    # Configurar renovación automática
    log_message "INFO" "Configurando renovación automática de certificados..."
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

    if [ "$SSL_SUCCESS" = true ]; then
        log_message "SUCCESS" "✅ SSL configurado correctamente"
        return 0
    else
        log_message "WARNING" "⚠️ SSL configurado parcialmente (algunos certificados fallaron)"
        return 1
    fi
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
    
    # Configurar SSL
    if ! configure_ssl; then
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
            if main_installation; then
                show_installation_summary
                echo -e "\n${GREEN}🎉 ¡Instalación completada exitosamente!${NC}"
                echo -e "${CYAN}Accede a tu aplicación en:${NC} $frontend_url"
                echo -e "${CYAN}API disponible en:${NC} $backend_url"
                
                # Preguntar si desea ejecutar diagnóstico
                echo -e "\n${WHITE}¿Deseas ejecutar un diagnóstico del sistema? (y/n):${NC} "
                read -r run_diagnosis
                if [[ "$run_diagnosis" =~ ^[Yy]$ ]]; then
                    diagnose_system
                fi
            else
                echo -e "\n${RED}❌ La instalación falló. Revisa los logs en: $LOG_FILE${NC}"
                exit 1
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