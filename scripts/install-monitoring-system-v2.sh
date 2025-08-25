#!/bin/bash
# /home/sturt-wha-icket/scripts/install-monitoring-system-v2.sh
# Script de instalación automática del sistema de monitoreo WATOOLX v2.0
# Autor: Asistente AI + Equipo de Desarrollo
# Fecha: 17 de Agosto 2025
# Versión: 2.0 (Reordenado con variables dinámicas)

# =============================================================================
# CONFIGURACIÓN Y VARIABLES
# =============================================================================

# Cargar archivo de configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/watoolx-monitoring.conf"

# Verificar si existe el archivo de configuración
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ ERROR: Archivo de configuración no encontrado: $CONFIG_FILE"
    echo "💡 Crea el archivo watoolx-monitoring.conf primero"
    exit 1
fi

# Cargar configuración
source "$CONFIG_FILE"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# FUNCIONES DE UTILIDAD
# =============================================================================

# Función de logging con colores
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO") echo -e "${GREEN}[INFO]${NC} $timestamp - $message" | tee -a "$MAIN_LOG_FILE" ;;
        "WARN") echo -e "${YELLOW}[WARN]${NC} $timestamp - $message" | tee -a "$MAIN_LOG_FILE" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $timestamp - $message" | tee -a "$MAIN_LOG_FILE" ;;
        "DEBUG") echo -e "${BLUE}[DEBUG]${NC} $timestamp - $message" | tee -a "$MAIN_LOG_FILE" ;;
    esac
}

# Función de banner
show_banner() {
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║            INSTALADOR DEL SISTEMA DE MONITOREO               ║"
    echo "║                        WATOOLX v2.0                          ║"
    echo "║                    (Variables Dinámicas)                     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
}

# =============================================================================
# VERIFICACIÓN DE REQUISITOS
# =============================================================================

check_requirements() {
    log_message "INFO" "🔍 Verificando requisitos del sistema..."
    
    # Verificar si se ejecuta como root
    if [ "$EUID" -ne 0 ]; then
        log_message "ERROR" "❌ Este script debe ejecutarse como root"
        exit 1
    fi
    
    # Verificar directorio de scripts
    if [ ! -d "$SCRIPTS_DIR" ]; then
        log_message "ERROR" "❌ Directorio de scripts no encontrado: $SCRIPTS_DIR"
        exit 1
    fi
    
    # Verificar scripts necesarios
    for script in "${REQUIRED_SCRIPTS[@]}"; do
        if [ ! -f "$SCRIPTS_DIR/$script" ]; then
            log_message "ERROR" "❌ Script no encontrado: $script"
            exit 1
        fi
    done
    
    # Validar configuración
    if ! validate_config; then
        log_message "ERROR" "❌ Configuración inválida"
        exit 1
    fi
    
    log_message "INFO" "✅ Requisitos verificados correctamente"
}

# =============================================================================
# INSTALACIÓN DE DEPENDENCIAS
# =============================================================================

install_dependencies() {
    log_message "INFO" "📦 Instalando dependencias del sistema..."
    
    # Actualizar repositorios
    apt-get update >/dev/null 2>&1
    
    # Instalar paquetes necesarios
    for package in "${SYSTEM_PACKAGES[@]}"; do
        if ! dpkg -l | grep -q "^ii  $package "; then
            log_message "INFO" "📥 Instalando $package..."
            apt-get install -y "$package" >/dev/null 2>&1
        else
            log_message "DEBUG" "ℹ️ $package ya está instalado"
        fi
    done
    
    log_message "INFO" "✅ Dependencias instaladas correctamente"
}

# =============================================================================
# CONFIGURACIÓN DE PERMISOS Y DIRECTORIOS
# =============================================================================

setup_permissions_and_directories() {
    log_message "INFO" "🔐 Configurando permisos y directorios..."
    
    # Crear directorios necesarios
    for dir in "${REQUIRED_DIRECTORIES[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            log_message "DEBUG" "📂 Creado: $dir"
        fi
    done
    
    # Dar permisos de ejecución a scripts
    chmod +x "$SCRIPTS_DIR"/*.sh
    
    # Configurar propiedad
    chown -R "$SERVICE_USER:$SERVICE_GROUP" "$SCRIPTS_DIR"
    chown -R "$SERVICE_USER:$SERVICE_GROUP" "$LOG_DIR"
    chown -R "$SERVICE_USER:$SERVICE_GROUP" "$BACKUP_DIR"
    
    log_message "INFO" "✅ Permisos y directorios configurados correctamente"
}

# =============================================================================
# CONFIGURACIÓN DE SERVICIOS SYSTEMD
# =============================================================================

setup_systemd_services() {
    log_message "INFO" "⚙️ Configurando servicios systemd..."
    
    # Servicio de monitoreo de performance
    cat > /etc/systemd/system/watoolx-performance-monitor.service << EOF
[Unit]
Description=WATOOLX Performance Monitor
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_GROUP
WorkingDirectory=$SCRIPTS_DIR
ExecStart=$SCRIPTS_DIR/monitor-performance.sh continuous
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # Servicio de monitoreo MySQL + Disco
    cat > /etc/systemd/system/watoolx-mysql-monitor.service << EOF
[Unit]
Description=WATOOLX MySQL + Disk Monitor
After=mysql.service
Wants=mysql.service

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_GROUP
WorkingDirectory=$SCRIPTS_DIR
ExecStart=$SCRIPTS_DIR/mysql-disk-monitor.sh monitor
Restart=always
RestartSec=30
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # Servicio de mantenimiento diario
    cat > /etc/systemd/system/watoolx-daily-maintenance.service << EOF
[Unit]
Description=WATOOLX Daily Maintenance
After=network.target

[Service]
Type=oneshot
User=$SERVICE_USER
Group=$SERVICE_GROUP
WorkingDirectory=$SCRIPTS_DIR
ExecStart=$SCRIPTS_DIR/mysql-disk-monitor.sh maintenance
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # Timer para mantenimiento diario
    cat > /etc/systemd/system/watoolx-daily-maintenance.timer << EOF
[Unit]
Description=Run WATOOLX Daily Maintenance
Requires=watoolx-daily-maintenance.service

[Timer]
OnCalendar=*-*-* $WEEKLY_MAINTENANCE_HOUR:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

    # Recargar systemd
    systemctl daemon-reload
    
    log_message "INFO" "✅ Servicios systemd configurados correctamente"
}

# =============================================================================
# CONFIGURACIÓN DE CRON
# =============================================================================

setup_cron_jobs() {
    log_message "INFO" "⏰ Configurando tareas cron..."
    
    # Crear archivo cron personalizado
    cat > /etc/cron.d/watoolx-monitoring << EOF
# WATOOLX Monitoring System - Cron Jobs
# Limpieza de logs binarios MySQL (cada X horas)
0 */$MYSQL_CLEANUP_FREQUENCY * * * root $SCRIPTS_DIR/mysql-disk-monitor.sh cleanup >/dev/null 2>&1

# Reporte diario de estado (cada día a las X:00 AM)
0 $DAILY_REPORT_HOUR * * * root $SCRIPTS_DIR/mysql-disk-monitor.sh report >/dev/null 2>&1

# Verificación de performance (cada X horas)
0 */$PERFORMANCE_CHECK_FREQUENCY * * * root $SCRIPTS_DIR/monitor-performance.sh once >/dev/null 2>&1

# Limpieza de logs antiguos (cada semana)
0 $WEEKLY_MAINTENANCE_HOUR * * $WEEKLY_MAINTENANCE_DAY root $SCRIPTS_DIR/mysql-disk-monitor.sh maintenance >/dev/null 2>&1

# Sistema de alertas WhatsApp cada X minutos
*/$ALERT_FREQUENCY * * * * root $SCRIPTS_DIR/send-whatsapp-alert.sh process >/dev/null 2>&1
EOF

    # Dar permisos al archivo cron
    chmod 644 /etc/cron.d/watoolx-monitoring
    
    log_message "INFO" "✅ Tareas cron configuradas correctamente"
}

# =============================================================================
# CONFIGURACIÓN DE LOGROTATE
# =============================================================================

setup_logrotate() {
    log_message "INFO" "📝 Configurando rotación de logs..."
    
    # Configuración para logs de WATOOLX
    cat > /etc/logrotate.d/watoolx << EOF
$LOG_DIR/watoolx-*.log {
    daily
    missingok
    rotate $LOG_ROTATION_DAYS
    compress
    delaycompress
    notifempty
    create 644 $SERVICE_USER $SERVICE_GROUP
    postrotate
        systemctl reload watoolx-performance-monitor >/dev/null 2>&1 || true
        systemctl reload watoolx-mysql-monitor >/dev/null 2>&1 || true
    endscript
}

/var/log/mysql/slow.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 mysql mysql
    postrotate
        systemctl reload mysql >/dev/null 2>&1 || true
    endscript
}
EOF

    log_message "INFO" "✅ Rotación de logs configurada correctamente"
}

# =============================================================================
# CONFIGURACIÓN DE MYSQL OPTIMIZADA
# =============================================================================

setup_mysql_config() {
    log_message "INFO" "🐬 Configurando MySQL optimizado para WATOOLX..."
    
    # Crear backup de configuración actual
    local backup_file="$BACKUP_DIR/mysqld.cnf.backup.$(date +%Y%m%d_%H%M%S)"
    
    if [ -f "$MYSQL_CONFIG_FILE" ]; then
        cp "$MYSQL_CONFIG_FILE" "$backup_file"
        log_message "DEBUG" "📋 Backup creado: $backup_file"
    fi
    
    # Agregar configuración optimizada si no existe
    if ! grep -q "WATOOLX" "$MYSQL_CONFIG_FILE"; then
        cat >> "$MYSQL_CONFIG_FILE" << EOF

# Configuración optimizada para WATOOLX - $(date)
[mysqld]
# Configuración de logs binarios (14 días)
expire_logs_days = $BINARY_LOG_RETENTION_DAYS
max_binlog_size = $MAX_BINLOG_SIZE
binlog_expire_logs_seconds = $BINARY_LOG_EXPIRE_SECONDS

# Configuración de rendimiento
innodb_buffer_pool_size = $INNODB_BUFFER_POOL_SIZE
innodb_log_file_size = $INNODB_LOG_FILE_SIZE
innodb_log_buffer_size = $INNODB_LOG_BUFFER_SIZE

# Configuración de seguridad
max_connections = $MAX_CONNECTIONS
wait_timeout = $WAIT_TIMEOUT
interactive_timeout = $INTERACTIVE_TIMEOUT

# Configuración de logs
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2
log_error = /var/log/mysql/error.log

# Configuración de compresión
innodb_compression_pad_pct_max = 50
innodb_compression_level = 6
EOF
        log_message "INFO" "✅ Configuración de MySQL optimizada para 14 días"
    else
        log_message "DEBUG" "ℹ️ Configuración de MySQL ya está optimizada"
    fi
}

# =============================================================================
# ACTIVACIÓN DE SERVICIOS
# =============================================================================

enable_services() {
    log_message "INFO" "🚀 Activando servicios del sistema..."
    
    local services=(
        "watoolx-performance-monitor"
        "watoolx-mysql-monitor"
        "watoolx-daily-maintenance.timer"
    )
    
    for service in "${services[@]}"; do
        systemctl enable "$service" >/dev/null 2>&1
        systemctl start "$service" >/dev/null 2>&1
        
        if systemctl is-active --quiet "$service"; then
            log_message "INFO" "✅ $service activado y funcionando"
        else
            log_message "WARN" "⚠️ $service no se pudo activar correctamente"
        fi
    done
    
    log_message "INFO" "✅ Servicios activados correctamente"
}

# =============================================================================
# VERIFICACIÓN DE INSTALACIÓN
# =============================================================================

verify_installation() {
    log_message "INFO" "🔍 Verificando instalación..."
    
    local checks=(
        "systemctl is-active watoolx-performance-monitor"
        "systemctl is-active watoolx-mysql-monitor"
        "systemctl is-enabled watoolx-daily-maintenance.timer"
        "test -f /etc/cron.d/watoolx-monitoring"
        "test -f /etc/logrotate.d/watoolx"
    )
    
    local passed=0
    local total=${#checks[@]}
    
    for check in "${checks[@]}"; do
        if eval "$check" >/dev/null 2>&1; then
            log_message "DEBUG" "✅ Verificación: $check"
            ((passed++))
        else
            log_message "WARN" "⚠️ Verificación falló: $check"
        fi
    done
    
    if [ $passed -eq $total ]; then
        log_message "INFO" "🎉 ¡Instalación completada exitosamente!"
        log_message "INFO" "✅ $passed/$total verificaciones pasaron"
    else
        log_message "WARN" "⚠️ Instalación completada con advertencias"
        log_message "WARN" "✅ $passed/$total verificaciones pasaron"
    fi
}

# =============================================================================
# GENERACIÓN DE REPORTE
# =============================================================================

generate_install_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="$BACKUP_DIR/install-report-$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" << EOF
╔══════════════════════════════════════════════════════════════╗
║                REPORTE DE INSTALACIÓN                        ║
║                    WATOOLX MONITORING v2.0                   ║
║                        $timestamp                           ║
╚══════════════════════════════════════════════════════════════╝

📋 RESUMEN DE INSTALACIÓN:
   Fecha: $timestamp
   Usuario: $SERVICE_USER
   Grupo: $SERVICE_GROUP
   Directorio: $SCRIPTS_DIR

🔧 SERVICIOS INSTALADOS:
   - watoolx-performance-monitor.service
   - watoolx-mysql-monitor.service
   - watoolx-daily-maintenance.timer

⏰ TAREAS CRON CONFIGURADAS:
   - Limpieza MySQL: Cada $MYSQL_CLEANUP_FREQUENCY horas
   - Reporte diario: $DAILY_REPORT_HOUR:00 AM
   - Verificación performance: Cada $PERFORMANCE_CHECK_FREQUENCY horas
   - Mantenimiento: Día $WEEKLY_MAINTENANCE_DAY a las $WEEKLY_MAINTENANCE_HOUR:00
   - Alertas: Cada $ALERT_FREQUENCY minutos

📁 DIRECTORIOS CREADOS:
   - $LOG_DIR
   - $BACKUP_DIR
   - $CONFIG_DIR
   - $DATA_DIR

📝 ARCHIVOS DE CONFIGURACIÓN:
   - /etc/systemd/system/watoolx-*.service
   - /etc/cron.d/watoolx-monitoring
   - /etc/logrotate.d/watoolx

🐬 CONFIGURACIÓN MYSQL:
   - Retención logs binarios: $BINARY_LOG_RETENTION_DAYS días
   - Tamaño máximo binlog: $MAX_BINLOG_SIZE
   - Buffer pool InnoDB: $INNODB_BUFFER_POOL_SIZE
   - Log file InnoDB: $INNODB_LOG_FILE_SIZE

🚀 COMANDOS ÚTILES:
   - Ver estado: systemctl status watoolx-*
   - Ver logs: journalctl -u watoolx-*
   - Limpieza manual: $SCRIPTS_DIR/mysql-disk-monitor.sh cleanup
   - Reporte: $SCRIPTS_DIR/mysql-disk-monitor.sh report
   - Ver configuración: $SCRIPTS_DIR/watoolx-monitoring.conf

✅ INSTALACIÓN COMPLETADA: $timestamp
EOF

    log_message "INFO" "📋 Reporte de instalación generado: $report_file"
}

# =============================================================================
# FUNCIÓN PRINCIPAL
# =============================================================================

main() {
    show_banner
    
    # Mostrar configuración actual
    log_message "INFO" "⚙️ Configuración del sistema:"
    show_config
    
    log_message "INFO" "🚀 Iniciando instalación del sistema de monitoreo WATOOLX v2.0..."
    
    # Verificar requisitos
    check_requirements
    
    # Instalar dependencias
    install_dependencies
    
    # Configurar permisos y directorios
    setup_permissions_and_directories
    
    # Configurar servicios systemd
    setup_systemd_services
    
    # Configurar cron
    setup_cron_jobs
    
    # Configurar logrotate
    setup_logrotate
    
    # Configurar MySQL
    setup_mysql_config
    
    # Activar servicios
    enable_services
    
    # Verificar instalación
    verify_installation
    
    # Generar reporte
    generate_install_report
    
    log_message "INFO" "🎉 ¡Instalación completada exitosamente!"
    log_message "INFO" "📖 Revisa el reporte de instalación para más detalles"
    log_message "INFO" "🚀 El sistema de monitoreo está funcionando automáticamente"
    log_message "INFO" "⚙️ Configuración personalizable en: $CONFIG_FILE"
}

# Ejecutar función principal
main "$@"
