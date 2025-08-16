#!/bin/bash
# /home/watoolxoficial/scripts/mysql-disk-monitor.sh
# Script de monitoreo y limpieza automática para MySQL + Performance
# Autor: Asistente AI + Equipo de Desarrollo
# Fecha: 16 de Agosto 2025
# Versión: 2.0 (Integrado con monitor-performance.sh)

# Configuración
THRESHOLD_DISK=80
THRESHOLD_MYSQL_SIZE=50
LOG_FILE="/var/log/watoolx-mysql-monitor.log"
ALERT_EMAIL="leowin8@gmail.com"
BACKUP_DIR="/home/watoolxoficial/backups/mysql"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función de logging
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO") echo -e "${GREEN}[INFO]${NC} $timestamp - $message" | tee -a $LOG_FILE ;;
        "WARN") echo -e "${YELLOW}[WARN]${NC} $timestamp - $message" | tee -a $LOG_FILE ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $timestamp - $message" | tee -a $LOG_FILE ;;
        "DEBUG") echo -e "${BLUE}[DEBUG]${NC} $timestamp - $message" | tee -a $LOG_FILE ;;
    esac
}

# Función de alerta
send_alert() {
    local subject=$1
    local message=$2
    
    log_message "WARN" "🚨 ALERTA: $subject"
    log_message "WARN" "$message"
    
    # Log de alertas para monitoreo
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ALERTA: $subject - $message" >> /tmp/watoolx-alerts.log
}

# Función de limpieza de logs binarios
cleanup_binary_logs() {
    log_message "INFO" "🧹 Iniciando limpieza de logs binarios de MySQL..."
    
    # Verificar si MySQL está funcionando
    if ! systemctl is-active --quiet mysql; then
        log_message "ERROR" "❌ MySQL no está funcionando"
        return 1
    fi
    
    # Crear backup antes de limpiar
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
    fi
    
    # Backup de configuración actual
    cp /etc/mysql/mysql.conf.d/mysqld.cnf "$BACKUP_DIR/mysqld.cnf.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Limpiar logs binarios antiguos (más de 7 días)
    local logs_cleaned=$(mysql -u root -p -e "PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 7 DAY);" 2>/dev/null | grep -c "Query OK")
    
    if [ $? -eq 0 ]; then
        log_message "INFO" "✅ Logs binarios limpiados exitosamente"
        
        # Verificar espacio liberado
        local space_before=$(df / | awk 'NR==2 {print $3}')
        local space_after=$(df / | awk 'NR==2 {print $3}')
        local space_freed=$((space_before - space_after))
        
        log_message "INFO" "💾 Espacio liberado: ${space_freed}KB"
        
        # Limpiar archivos de coredump si existen
        cleanup_coredumps
        
        return 0
    else
        log_message "ERROR" "❌ Error al limpiar logs binarios"
        return 1
    fi
}

# Función de limpieza de coredumps
cleanup_coredumps() {
    log_message "INFO" "🧹 Limpiando coredumps de Node.js..."
    
    local coredump_dir="/var/lib/apport/coredump"
    if [ -d "$coredump_dir" ]; then
        local coredumps_found=$(find "$coredump_dir" -type f -size +100M 2>/dev/null | wc -l)
        
        if [ $coredumps_found -gt 0 ]; then
            find "$coredump_dir" -type f -size +100M -delete 2>/dev/null
            log_message "INFO" "🗑️ Coredumps grandes eliminados: $coredumps_found archivos"
        else
            log_message "DEBUG" "ℹ️ No se encontraron coredumps grandes"
        fi
    fi
}

# Función de optimización de MySQL
optimize_mysql() {
    log_message "INFO" "⚡ Optimizando configuración de MySQL..."
    
    local config_file="/etc/mysql/mysql.conf.d/mysqld.cnf"
    local backup_file="$BACKUP_DIR/mysqld.cnf.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Crear backup
    cp "$config_file" "$backup_file"
    
    # Eliminar configuraciones duplicadas y conflictivas
    sed -i '/^binlog_expire_logs_seconds/d' "$config_file"
    sed -i '/^expire_logs_days/d' "$config_file"
    sed -i '/^max_binlog_size/d' "$config_file"
    
    # Agregar configuración optimizada
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
    
    # Reiniciar MySQL para aplicar cambios
    if systemctl restart mysql; then
        log_message "INFO" "🔄 MySQL reiniciado exitosamente"
    else
        log_message "ERROR" "❌ Error al reiniciar MySQL"
        # Restaurar backup si falla
        cp "$backup_file" "$config_file"
        systemctl restart mysql
    fi
}

# Función de monitoreo de espacio
monitor_disk_usage() {
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    local mysql_size=$(du -sh /var/lib/mysql 2>/dev/null | awk '{print $1}' | sed 's/G//')
    
    log_message "DEBUG" "💾 Uso de disco: ${disk_usage}%, MySQL: ${mysql_size}G"
    
    # Alerta si el disco está muy lleno
    if [ $disk_usage -gt $THRESHOLD_DISK ]; then
        send_alert "DISCO LLENO" "Uso de disco al ${disk_usage}% - Umbral: ${THRESHOLD_DISK}%"
        
        # Limpieza automática de emergencia
        cleanup_binary_logs
        cleanup_coredumps
        
        # Verificar si se resolvió
        local new_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
        if [ $new_usage -lt $THRESHOLD_DISK ]; then
            log_message "INFO" "✅ Problema de disco resuelto automáticamente"
        else
            log_message "ERROR" "❌ Problema de disco persiste después de la limpieza"
        fi
    fi
    
    # Alerta si MySQL está muy grande
    if [ ! -z "$mysql_size" ] && [ ${mysql_size%.*} -gt $THRESHOLD_MYSQL_SIZE ]; then
        send_alert "MYSQL GRANDE" "MySQL ocupa ${mysql_size}G - Umbral: ${THRESHOLD_MYSQL_SIZE}G"
        cleanup_binary_logs
    fi
}

# Función de mantenimiento preventivo
preventive_maintenance() {
    log_message "INFO" "🔧 Iniciando mantenimiento preventivo..."
    
    # Limpieza de logs del sistema
    journalctl --vacuum-time=7d >/dev/null 2>&1
    log_message "INFO" "📝 Logs del sistema limpiados (más de 7 días)"
    
    # Limpieza de paquetes temporales
    apt-get clean >/dev/null 2>&1
    apt-get autoremove -y >/dev/null 2>&1
    log_message "INFO" "📦 Paquetes temporales limpiados"
    
    # Limpieza de logs de aplicaciones
    find /var/log -name "*.log" -mtime +30 -delete 2>/dev/null
    find /var/log -name "*.gz" -mtime +30 -delete 2>/dev/null
    log_message "INFO" "🗂️ Logs de aplicaciones limpiados (más de 30 días)"
    
    # Verificar y reparar MySQL si es necesario
    if mysqlcheck -u root -p --all-databases --check >/dev/null 2>&1; then
        log_message "INFO" "✅ Verificación de MySQL completada"
    else
        log_message "WARN" "⚠️ Se detectaron problemas en MySQL, iniciando reparación..."
        mysqlcheck -u root -p --all-databases --repair >/dev/null 2>&1
    fi
}

# Función de reporte de estado
generate_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "╔══════════════════════════════════════════════════════════════╗" | tee -a $LOG_FILE
    echo "║                REPORTE DE ESTADO MYSQL + DISCO               ║" | tee -a $LOG_FILE
    echo "║                        $timestamp                           ║" | tee -a $LOG_FILE
    echo "╚══════════════════════════════════════════════════════════════╝" | tee -a $LOG_FILE
    
    echo "📊 ESTADO DEL SISTEMA:" | tee -a $LOG_FILE
    echo "   Disco: $(df / | awk 'NR==2 {print $5 " usado, " $4 " disponible"}')" | tee -a $LOG_FILE
    echo "   MySQL: $(du -sh /var/lib/mysql 2>/dev/null | awk '{print $1}')" | tee -a $LOG_FILE
    echo "   Memoria: $(free -h | awk 'NR==2 {print $3 "/" $2}')" | tee -a $LOG_FILE
    
    echo "🔧 SERVICIOS:" | tee -a $LOG_FILE
    echo "   MySQL: $(systemctl is-active mysql)" | tee -a $LOG_FILE
    echo "   PM2 Backend: $(pm2 status | grep watoolx-backend | awk '{print $10}')" | tee -a $LOG_FILE
    echo "   PM2 Frontend: $(pm2 status | grep watoolx-frontend | awk '{print $10}')" | tee -a $LOG_FILE
    
    echo "📈 LOGS BINARIOS:" | tee -a $LOG_FILE
    local binlog_count=$(ls /var/lib/mysql/binlog.* 2>/dev/null | wc -l)
    echo "   Cantidad: $binlog_count archivos" | tee -a $LOG_FILE
    local binlog_size=$(du -sh /var/lib/mysql/binlog.* 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
    echo "   Tamaño total: $binlog_size" | tee -a $LOG_FILE
    
    echo "✅ REPORTE COMPLETADO: $timestamp" | tee -a $LOG_FILE
    echo "" | tee -a $LOG_FILE
}

# Función principal
main() {
    local action=$1
    
    case $action in
        "monitor")
            log_message "INFO" "🚀 Iniciando monitoreo continuo..."
            while true; do
                monitor_disk_usage
                sleep 300  # 5 minutos
            done
            ;;
        "cleanup")
            log_message "INFO" "🧹 Iniciando limpieza manual..."
            cleanup_binary_logs
            cleanup_coredumps
            ;;
        "optimize")
            log_message "INFO" "⚡ Iniciando optimización..."
            optimize_mysql
            ;;
        "maintenance")
            log_message "INFO" "🔧 Iniciando mantenimiento preventivo..."
            preventive_maintenance
            ;;
        "report")
            log_message "INFO" "📊 Generando reporte de estado..."
            generate_report
            ;;
        "full")
            log_message "INFO" "🚀 Iniciando operación completa..."
            monitor_disk_usage
            cleanup_binary_logs
            cleanup_coredumps
            optimize_mysql
            preventive_maintenance
            generate_report
            ;;
        *)
            echo "Uso: $0 {monitor|cleanup|optimize|maintenance|report|full}"
            echo ""
            echo "Acciones disponibles:"
            echo "  monitor     - Monitoreo continuo cada 5 minutos"
            echo "  cleanup     - Limpieza manual de logs y coredumps"
            echo "  optimize    - Optimización de configuración MySQL"
            echo "  maintenance - Mantenimiento preventivo del sistema"
            echo "  report      - Generar reporte de estado completo"
            echo "  full        - Ejecutar todas las operaciones"
            echo ""
            echo "Ejemplos:"
            echo "  $0 monitor     # Monitoreo continuo"
            echo "  $0 full        # Operación completa"
            echo "  $0 cleanup     # Solo limpieza"
            exit 1
            ;;
    esac
    
    log_message "INFO" "✅ Operación '$action' completada exitosamente"
}

# Banner
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                WATOOLX MYSQL + DISK MONITOR                 ║"
echo "║                        v2.0 - 2025                          ║"
echo "║                    Solución Integrada                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# Verificar si se ejecuta como root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Este script debe ejecutarse como root"
    exit 1
fi

# Crear directorio de logs si no existe
mkdir -p $(dirname $LOG_FILE)

# Ejecutar función principal
main "$@"
