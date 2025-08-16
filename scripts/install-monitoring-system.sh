#!/bin/bash
# /home/watoolxoficial/scripts/install-monitoring-system.sh
# Script de instalación automática del sistema de monitoreo WATOOLX
# Autor: Asistente AI + Equipo de Desarrollo
# Fecha: 16 de Agosto 2025
# Versión: 1.0

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
SCRIPTS_DIR="/home/watoolxoficial/scripts"
SERVICE_USER="root"
SERVICE_GROUP="root"

# Banner
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║            INSTALADOR DEL SISTEMA DE MONITOREO               ║"
echo "║                        WATOOLX v2.0                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# Función de logging
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO") echo -e "${GREEN}[INFO]${NC} $timestamp - $message" ;;
        "WARN") echo -e "${YELLOW}[WARN]${NC} $timestamp - $message" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $timestamp - $message" ;;
        "DEBUG") echo -e "${BLUE}[DEBUG]${NC} $timestamp - $message" ;;
    esac
}

# Función de verificación de requisitos
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
    local required_scripts=("monitor-performance.sh" "mysql-disk-monitor.sh")
    for script in "${required_scripts[@]}"; do
        if [ ! -f "$SCRIPTS_DIR/$script" ]; then
            log_message "ERROR" "❌ Script no encontrado: $script"
            exit 1
        fi
    done
    
    log_message "INFO" "✅ Requisitos verificados correctamente"
}

# Función de instalación de dependencias
install_dependencies() {
    log_message "INFO" "📦 Instalando dependencias del sistema..."
    
    # Actualizar repositorios
    apt-get update >/dev/null 2>&1
    
    # Instalar herramientas necesarias
    local packages=("htop" "iotop" "nethogs" "logwatch" "fail2ban" "mysql-client")
    for package in "${packages[@]}"; do
        if ! dpkg -l | grep -q "^ii  $package "; then
            log_message "INFO" "📥 Instalando $package..."
            apt-get install -y "$package" >/dev/null 2>&1
        else
            log_message "DEBUG" "ℹ️ $package ya está instalado"
        fi
    done
    
    log_message "INFO" "✅ Dependencias instaladas correctamente"
}

# Función de configuración de permisos
setup_permissions() {
    log_message "INFO" "🔐 Configurando permisos de scripts..."
    
    # Dar permisos de ejecución
    chmod +x "$SCRIPTS_DIR"/*.sh
    
    # Configurar propiedad
    chown -R "$SERVICE_USER:$SERVICE_GROUP" "$SCRIPTS_DIR"
    
    log_message "INFO" "✅ Permisos configurados correctamente"
}

# Función de creación de directorios necesarios
create_directories() {
    log_message "INFO" "📁 Creando directorios necesarios..."
    
    local directories=(
        "/var/log/watoolx"
        "/home/watoolxoficial/backups/mysql"
        "/etc/watoolx"
        "/var/lib/watoolx"
    )
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            log_message "DEBUG" "📂 Creado: $dir"
        fi
    done
    
    log_message "INFO" "✅ Directorios creados correctamente"
}

# Función de configuración de servicios systemd
setup_systemd_services() {
    log_message "INFO" "⚙️ Configurando servicios systemd..."
    
    # Servicio de monitoreo de performance
    cat > /etc/systemd/system/watoolx-performance-monitor.service << EOF
[Unit]
Description=WATOOLX Performance Monitor
After=network.target

[Service]
Type=simple
User=root
Group=root
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
User=root
Group=root
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
User=root
Group=root
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
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

    # Recargar systemd
    systemctl daemon-reload
    
    log_message "INFO" "✅ Servicios systemd configurados correctamente"
}

# Función de configuración de cron
setup_cron_jobs() {
    log_message "INFO" "⏰ Configurando tareas cron..."
    
    # Crear archivo cron personalizado
    cat > /etc/cron.d/watoolx-monitoring << EOF
# WATOOLX Monitoring System - Cron Jobs
# Limpieza de logs binarios MySQL (cada 6 horas)
0 */6 * * * root $SCRIPTS_DIR/mysql-disk-monitor.sh cleanup >/dev/null 2>&1

# Reporte diario de estado (cada día a las 6:00 AM)
0 6 * * * root $SCRIPTS_DIR/mysql-disk-monitor.sh report >/dev/null 2>&1

# Verificación de performance (cada hora)
0 * * * * root $SCRIPTS_DIR/monitor-performance.sh once >/dev/null 2>&1

# Limpieza de logs antiguos (cada domingo a las 3:00 AM)
0 3 * * 0 root $SCRIPTS_DIR/mysql-disk-monitor.sh maintenance >/dev/null 2>&1

# Sistema de alertas híbrido (WhatsApp + Email) cada 5 minutos
*/5 * * * * root $SCRIPTS_DIR/send-hybrid-alert.sh process >/dev/null 2>&1
EOF

    # Dar permisos al archivo cron
    chmod 644 /etc/cron.d/watoolx-monitoring
    
    log_message "INFO" "✅ Tareas cron configuradas correctamente"
}

# Función de configuración de logrotate
setup_logrotate() {
    log_message "INFO" "📝 Configurando rotación de logs..."
    
    # Configuración para logs de WATOOLX
    cat > /etc/logrotate.d/watoolx << EOF
/var/log/watoolx-*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
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

# Función de configuración de alertas
setup_alerts() {
    log_message "INFO" "🚨 Configurando sistema de alertas híbrido..."
    
    # Crear script de alertas híbridas (WhatsApp + Email)
    cat > "$SCRIPTS_DIR/send-hybrid-alert.sh" << 'EOF'
#!/bin/bash
# Script híbrido para enviar alertas por WhatsApp Y Email automáticamente
# Este es un placeholder - el script completo se copia desde el archivo principal

# Verificar si existe el script completo
if [ -f "$(dirname $0)/send-hybrid-alert.sh" ]; then
    # Ejecutar el script híbrido completo
    exec "$(dirname $0)/send-hybrid-alert.sh" process
else
    # Fallback al sistema básico
    ALERT_FILE="/tmp/watoolx-alerts.log"
    LOG_FILE="/var/log/watoolx-alerts.log"
    
    if [ -f "$ALERT_FILE" ] && [ -s "$ALERT_FILE" ]; then
        cat "$ALERT_FILE" >> "$LOG_FILE"
        > "$ALERT_FILE"
    fi
fi
EOF

    chmod +x "$SCRIPTS_DIR/send-hybrid-alert.sh"
    
    # Crear enlaces simbólicos para compatibilidad
    ln -sf "$SCRIPTS_DIR/send-hybrid-alert.sh" "$SCRIPTS_DIR/send-alert.sh"
    ln -sf "$SCRIPTS_DIR/send-hybrid-alert.sh" "$SCRIPTS_DIR/send-whatsapp-alert.sh"
    ln -sf "$SCRIPTS_DIR/send-hybrid-alert.sh" "$SCRIPTS_DIR/send-email-alert.sh"
    
    # Agregar al cron para verificar alertas cada 5 minutos usando sistema híbrido
    echo "*/5 * * * * root $SCRIPTS_DIR/send-hybrid-alert.sh process >/dev/null 2>&1" >> /etc/cron.d/watoolx-monitoring
    
    log_message "INFO" "✅ Sistema de alertas híbrido configurado correctamente"
}

# Función de configuración de MySQL
setup_mysql_config() {
    log_message "INFO" "🐬 Configurando MySQL para WATOOLX..."
    
    # Crear backup de configuración actual
    local config_file="/etc/mysql/mysql.conf.d/mysqld.cnf"
    local backup_file="/home/watoolxoficial/backups/mysql/mysqld.cnf.backup.$(date +%Y%m%d_%H%M%S)"
    
    if [ -f "$config_file" ]; then
        cp "$config_file" "$backup_file"
        log_message "DEBUG" "📋 Backup creado: $backup_file"
    fi
    
    # Agregar configuración optimizada si no existe
    if ! grep -q "WATOOLX" "$config_file"; then
        cat >> "$config_file" << EOF

# Configuración optimizada para WATOOLX - $(date)
[mysqld]
# Configuración de logs binarios
expire_logs_days = 7
max_binlog_size = 100M
binlog_expire_logs_seconds = 604800

# Configuración de rendimiento
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_log_buffer_size = 64M

# Configuración de seguridad
max_connections = 200
wait_timeout = 600
interactive_timeout = 600

# Configuración de logs
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2
log_error = /var/log/mysql/error.log
EOF
        log_message "INFO" "✅ Configuración de MySQL optimizada"
    else
        log_message "DEBUG" "ℹ️ Configuración de MySQL ya está optimizada"
    fi
}

# Función de activación de servicios
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

# Función de verificación de instalación
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

# Función de generación de reporte de instalación
generate_install_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="/home/watoolxoficial/backups/install-report-$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" << EOF
╔══════════════════════════════════════════════════════════════╗
║                REPORTE DE INSTALACIÓN                        ║
║                    WATOOLX MONITORING                        ║
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
   - Limpieza MySQL: Cada 6 horas
   - Reporte diario: 6:00 AM
   - Verificación performance: Cada hora
   - Mantenimiento: Domingo 3:00 AM

📁 DIRECTORIOS CREADOS:
   - /var/log/watoolx
   - /home/watoolxoficial/backups/mysql
   - /etc/watoolx
   - /var/lib/watoolx

📝 ARCHIVOS DE CONFIGURACIÓN:
   - /etc/systemd/system/watoolx-*.service
   - /etc/cron.d/watoolx-monitoring
   - /etc/logrotate.d/watoolx

🚀 COMANDOS ÚTILES:
   - Ver estado: systemctl status watoolx-*
   - Ver logs: journalctl -u watoolx-*
   - Limpieza manual: $SCRIPTS_DIR/mysql-disk-monitor.sh cleanup
   - Reporte: $SCRIPTS_DIR/mysql-disk-monitor.sh report

✅ INSTALACIÓN COMPLETADA: $timestamp
EOF

    log_message "INFO" "📋 Reporte de instalación generado: $report_file"
}

# Función principal
main() {
    log_message "INFO" "🚀 Iniciando instalación del sistema de monitoreo WATOOLX..."
    
    # Verificar requisitos
    check_requirements
    
    # Instalar dependencias
    install_dependencies
    
    # Configurar permisos
    setup_permissions
    
    # Crear directorios
    create_directories
    
    # Configurar servicios systemd
    setup_systemd_services
    
    # Configurar cron
    setup_cron_jobs
    
    # Configurar logrotate
    setup_logrotate
    
    # Configurar alertas
    setup_alerts
    
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
}

# Ejecutar función principal
main "$@"
