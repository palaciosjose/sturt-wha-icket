#!/bin/bash
# /home/watoolxoficial/scripts/monitor-performance.sh
# Script de monitoreo inteligente de performance para WATOOLX
# Autor: Asistente AI + Equipo de Desarrollo
# Fecha: 16 de Agosto 2025

# Configuración
THRESHOLD_CPU=80
THRESHOLD_LOAD=2.0
THRESHOLD_MEMORY=85
LOG_FILE="/var/log/watoolx-performance.log"
ALERT_EMAIL="leowin8@gmail.com"

# Credenciales MySQL
MYSQL_USER="root"
MYSQL_PASSWORD="mysql1122"
MYSQL_DATABASE="watoolx"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función de conexión MySQL
mysql_connect() {
    mysql -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -D "$MYSQL_DATABASE" "$@"
}

# Función de logging con colores
log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "DEBUG")
            echo -e "${BLUE}[DEBUG]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
    esac
}

# Función de alerta
send_alert() {
    local message="$1"
    log_message "ERROR" "🚨 ALERTA: $message"
    
    # Enviar notificación por webhook (opcional - configurar después)
    # curl -X POST -H "Content-Type: application/json" -d "{\"text\":\"$message\"}" $WEBHOOK_URL
    
    # Log de alerta para revisión manual
    echo "ALERTA: $message" >> "/tmp/watoolx-alerts.log"
}

# Función de recuperación automática
auto_recovery() {
    local issue="$1"
    
    case "$issue" in
        "high_cpu")
            log_message "INFO" "🔄 Iniciando recuperación automática para CPU alto..."
            
            # Reiniciar backend si es necesario
            if pm2 show watoolx-backend 2>/dev/null | grep -q "errored\|stopped"; then
                log_message "INFO" "🔄 Reiniciando backend..."
                pm2 restart watoolx-backend
            fi
            
            # Limpiar logs si son muy grandes
            if [ -f "$LOG_FILE" ] && [ $(stat -c%s "$LOG_FILE" 2>/dev/null || echo "0") -gt 104857600 ]; then
                log_message "INFO" "🧹 Limpiando logs antiguos..."
                echo "" > "$LOG_FILE"
            fi
            ;;
            
        "high_memory")
            log_message "INFO" "🔄 Iniciando recuperación automática para memoria alta..."
            
            # Limpiar cache de MySQL si es necesario (solo si está disponible)
if command -v mysql &> /dev/null; then
    log_message "INFO" "🔄 Limpiando cache de MySQL..."
    mysql_connect -e "FLUSH PRIVILEGES; FLUSH TABLES; FLUSH LOGS;" 2>/dev/null || true
fi
            
            # Reiniciar servicios si es crítico
            local mem_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
            if [ "$mem_usage" -gt 95 ]; then
                log_message "ERROR" "🚨 Memoria crítica, reiniciando servicios..."
                pm2 restart all
            fi
            ;;
            
        "high_load")
            log_message "INFO" "🔄 Iniciando recuperación automática para load alto..."
            
            # Identificar y matar procesos problemáticos
            local high_cpu_pids=$(ps aux | awk '$3 > 90 {print $2}' | head -5)
            if [ ! -z "$high_cpu_pids" ]; then
                log_message "WARN" "🔍 Procesos con CPU > 90%: $high_cpu_pids"
                
                # Solo matar si son procesos de usuario (no del sistema)
                for pid in $high_cpu_pids; do
                    local user=$(ps -o user= -p $pid 2>/dev/null)
                    if [ ! -z "$user" ] && [ "$user" != "root" ] && [ "$user" != "mysql" ] && [ "$user" != "systemd" ]; then
                        log_message "INFO" "🔄 Matando proceso problemático: $pid (usuario: $user)"
                        kill -9 $pid 2>/dev/null || true
                    fi
                done
            fi
            ;;
    esac
}

# Función principal de monitoreo
monitor_system() {
    # 1. CPU Usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    local cpu_usage_int=${cpu_usage%.*}
    
    if [ "$cpu_usage_int" -gt "$THRESHOLD_CPU" ]; then
        send_alert "CPU usage alto: ${cpu_usage}%"
        auto_recovery "high_cpu"
    fi
    
    # 2. Load Average
    local load_1min=$(uptime | awk '{print $10}' | sed 's/,//')
    local load_5min=$(uptime | awk '{print $11}' | sed 's/,//')
    
    if (( $(echo "$load_1min > $THRESHOLD_LOAD" | bc -l 2>/dev/null || echo "0") )); then
        send_alert "Load average alto: 1min=$load_1min, 5min=$load_5min"
        auto_recovery "high_load"
    fi
    
    # 3. Memory Usage
    local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [ "$memory_usage" -gt "$THRESHOLD_MEMORY" ]; then
        send_alert "Memoria usage alto: ${memory_usage}%"
        auto_recovery "high_memory"
    fi
    
    # 4. Procesos específicos problemáticos
    local high_cpu_processes=$(ps aux | awk '$3 > 90 {print $2, $3, $11}' | head -3)
    if [ ! -z "$high_cpu_processes" ]; then
        log_message "WARN" "⚠️ Procesos con CPU > 90%: $high_cpu_processes"
    fi
    
    # 5. Estado de servicios PM2
    if command -v pm2 &> /dev/null; then
        local pm2_status=$(pm2 jlist 2>/dev/null | grep -o '"status":"[^"]*"' | sed 's/"status":"//g' | sed 's/"//g')
        if echo "$pm2_status" | grep -q "errored\|stopped"; then
            send_alert "Servicios PM2 con problemas: $pm2_status"
        fi
    fi
    
    # 6. Log del sistema
    log_message "INFO" "✅ Sistema OK - CPU: ${cpu_usage}%, Load: $load_1min, Memory: ${memory_usage}%"
}

# Función de monitoreo continuo
monitor_continuous() {
    log_message "INFO" "🚀 Iniciando monitoreo continuo de performance..."
    log_message "INFO" "📊 Thresholds: CPU: ${THRESHOLD_CPU}%, Load: ${THRESHOLD_LOAD}, Memory: ${THRESHOLD_MEMORY}%"
    
    local counter=0
    while true; do
        counter=$((counter + 1))
        echo "--- Monitoreo #$counter ---"
        monitor_system
        echo "--- Esperando 30 segundos ---"
        sleep 30
    done
}

# Función de monitoreo de una sola vez
monitor_once() {
    log_message "INFO" "🔍 Ejecutando monitoreo único..."
    monitor_system
}

# Función de análisis profundo
deep_analysis() {
    log_message "INFO" "🔬 Iniciando análisis profundo del sistema..."
    
    # 1. Top procesos por CPU
    echo -e "${BLUE}=== TOP 10 PROCESOS POR CPU ===${NC}" | tee -a "$LOG_FILE"
    ps aux --sort=-%cpu | head -11 | tee -a "$LOG_FILE"
    
    # 2. Top procesos por memoria
    echo -e "${BLUE}=== TOP 10 PROCESOS POR MEMORIA ===${NC}" | tee -a "$LOG_FILE"
    ps aux --sort=-%mem | head -11 | tee -a "$LOG_FILE"
    
    # 3. Conexiones de red activas
    echo -e "${BLUE}=== CONEXIONES DE RED ACTIVAS ===${NC}" | tee -a "$LOG_FILE"
    netstat -tuln 2>/dev/null | grep -E ":80|:443|:3000|:3435" | tee -a "$LOG_FILE"
    
    # 4. Estado de la base de datos
    echo -e "${BLUE}=== ESTADO DE MYSQL ===${NC}" | tee -a "$LOG_FILE"
if command -v mysql &> /dev/null; then
    mysql_connect -e "SHOW PROCESSLIST;" 2>/dev/null | tee -a "$LOG_FILE"
else
    echo "MySQL no disponible" | tee -a "$LOG_FILE"
fi
    
    # 5. Logs del sistema recientes
    echo -e "${BLUE}=== LOGS DEL SISTEMA RECIENTES ===${NC}" | tee -a "$LOG_FILE"
    journalctl -n 50 --no-pager 2>/dev/null | tee -a "$LOG_FILE"
    
    # 6. Estado de PM2
    echo -e "${BLUE}=== ESTADO DE PM2 ===${NC}" | tee -a "$LOG_FILE"
    if command -v pm2 &> /dev/null; then
        pm2 list | tee -a "$LOG_FILE"
    else
        echo "PM2 no disponible" | tee -a "$LOG_FILE"
    fi
    
    # 7. Uso de disco
    echo -e "${BLUE}=== USO DE DISCO ===${NC}" | tee -a "$LOG_FILE"
    df -h | tee -a "$LOG_FILE"
    
    # 8. Procesos con mayor uso de CPU actual
    echo -e "${BLUE}=== PROCESOS CON MAYOR CPU ACTUAL ===${NC}" | tee -a "$LOG_FILE"
    ps aux --sort=-%cpu | head -6 | tee -a "$LOG_FILE"
    
    log_message "INFO" "✅ Análisis profundo completado"
}

# Función de instalación como servicio
install_service() {
    log_message "INFO" "🔧 Instalando script como servicio systemd..."
    
    # Crear directorio de scripts si no existe
    mkdir -p /home/watoolxoficial/scripts
    
    # Crear servicio systemd
    cat > /etc/systemd/system/watoolx-monitor.service << EOF
[Unit]
Description=WATOOLX Performance Monitor
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/home/watoolxoficial
ExecStart=/home/watoolxoficial/scripts/monitor-performance.sh continuous
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    
    # Recargar systemd y habilitar servicio
    systemctl daemon-reload
    systemctl enable watoolx-monitor
    systemctl start watoolx-monitor
    
    # Verificar estado
    if systemctl is-active --quiet watoolx-monitor; then
        log_message "INFO" "✅ Servicio de monitoreo instalado y activado correctamente"
        systemctl status watoolx-monitor --no-pager
    else
        log_message "ERROR" "❌ Error al iniciar el servicio de monitoreo"
        systemctl status watoolx-monitor --no-pager
    fi
}

# Función de desinstalación
uninstall_service() {
    log_message "INFO" "🗑️ Desinstalando servicio de monitoreo..."
    
    systemctl stop watoolx-monitor 2>/dev/null || true
    systemctl disable watoolx-monitor 2>/dev/null || true
    rm -f /etc/systemd/system/watoolx-monitor.service
    systemctl daemon-reload
    
    log_message "INFO" "✅ Servicio de monitoreo desinstalado"
}

# Función de estado del servicio
service_status() {
    if systemctl is-active --quiet watoolx-monitor; then
        log_message "INFO" "✅ Servicio de monitoreo está ACTIVO"
        systemctl status watoolx-monitor --no-pager
    else
        log_message "WARN" "⚠️ Servicio de monitoreo NO está activo"
    fi
}

# Banner de inicio
show_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    WATOOLX PERFORMANCE MONITOR               ║"
    echo "║                        v1.0 - 2025                          ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Menú principal
case "${1:-}" in
    "once")
        show_banner
        monitor_once
        ;;
    "continuous")
        show_banner
        monitor_continuous
        ;;
    "deep")
        show_banner
        deep_analysis
        ;;
    "install")
        show_banner
        install_service
        ;;
    "uninstall")
        show_banner
        uninstall_service
        ;;
    "status")
        show_banner
        service_status
        ;;
    "test")
        show_banner
        log_message "INFO" "🧪 Ejecutando prueba del sistema de logging..."
        log_message "WARN" "⚠️ Este es un mensaje de advertencia de prueba"
        log_message "ERROR" "🚨 Este es un mensaje de error de prueba"
        log_message "DEBUG" "🔍 Este es un mensaje de debug de prueba"
        echo "✅ Prueba completada - revisa el archivo de log: $LOG_FILE"
        ;;
    *)
        show_banner
        echo "Uso: $0 {once|continuous|deep|install|uninstall|status|test}"
        echo ""
        echo "Comandos disponibles:"
        echo "  once       - Monitoreo único del sistema"
        echo "  continuous - Monitoreo continuo (cada 30 segundos)"
        echo "  deep       - Análisis profundo del sistema"
        echo "  install    - Instalar como servicio systemd"
        echo "  uninstall  - Desinstalar servicio"
        echo "  status     - Ver estado del servicio"
        echo "  test       - Probar sistema de logging"
        echo ""
        echo "Ejemplos:"
        echo "  $0 deep           # Análisis profundo inmediato"
        echo "  $0 continuous     # Monitoreo continuo en primer plano"
        echo "  $0 install        # Instalar como servicio automático"
        echo ""
        exit 1
        ;;
esac
