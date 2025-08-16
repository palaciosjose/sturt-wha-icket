#!/bin/bash
# /home/watoolxoficial/scripts/send-email-alert.sh
# Script para enviar alertas por email usando Gmail SMTP
# Autor: Asistente AI + Equipo de Desarrollo
# Fecha: 16 de Agosto 2025
# Versión: 1.0

# Configuración
ALERT_FILE="/tmp/watoolx-alerts.log"
LOG_FILE="/var/log/watoolx-email-alerts.log"
CONFIG_FILE="/home/watoolxoficial/.email-config"

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
        "WARN") echo -e "${YELLOW}[WARN]${NC} $timestamp - $message" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $timestamp - $message" | tee -a $LOG_FILE ;;
        "DEBUG") echo -e "${BLUE}[DEBUG]${NC} $timestamp - $message" | tee -a $LOG_FILE ;;
    esac
}

# Función para cargar configuración
load_config() {
    if [ ! -f "$CONFIG_FILE" ]; then
        log_message "ERROR" "❌ Archivo de configuración no encontrado: $CONFIG_FILE"
        return 1
    fi
    
    source "$CONFIG_FILE"
    
    # Verificar variables requeridas
    if [ -z "$GMAIL_USER" ] || [ -z "$GMAIL_PASS" ] || [ -z "$ADMIN_EMAIL" ]; then
        log_message "ERROR" "❌ Configuración incompleta en $CONFIG_FILE"
        return 1
    fi
    
    return 0
}

# Función para enviar email usando Gmail SMTP
send_email_alert() {
    local subject="$1"
    local message="$2"
    
    if ! load_config; then
        return 1
    fi
    
    # Crear archivo temporal para el email
    local temp_email="/tmp/watoolx-alert-$(date +%s).eml"
    
    # Crear contenido del email
    cat > "$temp_email" << EOF
From: WATOOLX Monitor <$GMAIL_USER@gmail.com>
To: $ADMIN_EMAIL
Subject: $subject
Content-Type: text/html; charset=UTF-8
MIME-Version: 1.0

<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .alert { background: #ff4444; color: white; padding: 15px; border-radius: 5px; }
        .info { background: #f0f0f0; padding: 10px; border-radius: 3px; margin: 10px 0; }
        .success { background: #44ff44; color: black; padding: 10px; border-radius: 3px; }
        .timestamp { color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="alert">
        <h2>🚨 ALERTA WATOOLX 🚨</h2>
        <h3>$subject</h3>
    </div>
    
    <div class="info">
        <pre style="white-space: pre-wrap; font-family: monospace;">$message</pre>
    </div>
    
    <div class="info">
        <strong>⏰ Fecha:</strong> $(date '+%Y-%m-%d %H:%M:%S')<br>
        <strong>🖥️ Servidor:</strong> $(hostname)<br>
        <strong>🌐 IP:</strong> $(curl -s ifconfig.me 2>/dev/null || echo 'N/A')<br>
        <strong>🔧 Sistema:</strong> WATOOLX v2.0
    </div>
    
    <div class="success">
        <strong>✅ Esta alerta fue generada automáticamente por el sistema de monitoreo WATOOLX</strong>
    </div>
    
    <div class="timestamp">
        Enviado automáticamente el $(date '+%Y-%m-%d %H:%M:%S UTC')
    </div>
</body>
</html>
EOF

    # Enviar email usando curl con Gmail SMTP
    local response=$(curl -s --mail-from "$GMAIL_USER@gmail.com" \
        --mail-rcpt "$ADMIN_EMAIL" \
        --upload-file "$temp_email" \
        --ssl-reqd \
        --user "$GMAIL_USER@gmail.com:$GMAIL_PASS" \
        smtps://smtp.gmail.com:465 2>&1)
    
    # Limpiar archivo temporal
    rm -f "$temp_email"
    
    if [ $? -eq 0 ]; then
        log_message "INFO" "✅ Alerta enviada por email exitosamente a $ADMIN_EMAIL"
        return 0
    else
        log_message "ERROR" "❌ Error al enviar email: $response"
        return 1
    fi
}

# Función para procesar alertas pendientes
process_pending_alerts() {
    if [ ! -f "$ALERT_FILE" ] || [ ! -s "$ALERT_FILE" ]; then
        log_message "DEBUG" "ℹ️ No hay alertas pendientes"
        return 0
    fi
    
    log_message "INFO" "📧 Procesando alertas pendientes por email..."
    
    # Leer y procesar cada alerta
    while IFS= read -r line; do
        if [ ! -z "$line" ]; then
            # Extraer información de la alerta
            local timestamp=$(echo "$line" | cut -d' ' -f1-3)
            local alert_type=$(echo "$line" | cut -d' ' -f6-)
            
            # Enviar alerta por email
            send_email_alert "ALERTA DEL SISTEMA WATOOLX" "$alert_type"
            
            if [ $? -eq 0 ]; then
                log_message "INFO" "✅ Alerta procesada por email: $alert_type"
            else
                log_message "ERROR" "❌ Error procesando alerta: $alert_type"
            fi
        fi
    done < "$ALERT_FILE"
    
    # Limpiar archivo de alertas
    > "$ALERT_FILE"
    log_message "INFO" "🧹 Archivo de alertas limpiado"
}

# Función para enviar alerta inmediata
send_immediate_alert() {
    local subject="$1"
    local message="$2"
    
    log_message "INFO" "🚨 Enviando alerta inmediata por email..."
    send_email_alert "$subject" "$message"
}

# Función para configurar Gmail
setup_gmail() {
    log_message "INFO" "🔧 Configurando Gmail para alertas..."
    
    echo "=== CONFIGURACIÓN DE GMAIL PARA ALERTAS ==="
    echo ""
    echo "IMPORTANTE: Para usar Gmail necesitas:"
    echo "1. Activar verificación en 2 pasos"
    echo "2. Generar contraseña de aplicación"
    echo "3. Usar esa contraseña aquí (NO tu contraseña normal)"
    echo ""
    echo "📧 Gmail (ejemplo: tuemail@gmail.com):"
    read -p "Email: " gmail_user
    
    echo ""
    echo "🔑 Contraseña de aplicación (NO tu contraseña normal):"
    read -s -p "Contraseña: " gmail_pass
    echo ""
    
    echo ""
    echo "📬 Email del administrador (donde recibir alertas):"
    read -p "Email admin: " admin_email
    
    if [ ! -z "$gmail_user" ] && [ ! -z "$gmail_pass" ] && [ ! -z "$admin_email" ]; then
        # Crear archivo de configuración
        cat > "$CONFIG_FILE" << EOF
# Configuración de Gmail para alertas WATOOLX
GMAIL_USER="$gmail_user"
GMAIL_PASS="$gmail_pass"
ADMIN_EMAIL="$admin_email"
EOF
        
        chmod 600 "$CONFIG_FILE"
        log_message "INFO" "✅ Configuración de Gmail guardada exitosamente"
        echo "✅ Configuración guardada en: $CONFIG_FILE"
        
        # Probar envío
        echo ""
        echo "🧪 Probando envío de email..."
        send_email_alert "PRUEBA DEL SISTEMA" "Este es un mensaje de prueba del sistema de monitoreo WATOOLX. Si lo recibes, la configuración está correcta."
        
        if [ $? -eq 0 ]; then
            echo "🎉 ¡Prueba exitosa! Revisa tu email"
        else
            echo "❌ Prueba fallida. Revisa la configuración"
        fi
    else
        log_message "ERROR" "❌ Todos los campos son obligatorios"
        echo "❌ Todos los campos son obligatorios"
        return 1
    fi
}

# Función para probar envío
test_email() {
    log_message "INFO" "🧪 Probando envío de email..."
    
    if ! load_config; then
        echo "❌ Configuración no encontrada. Ejecuta: $0 setup"
        return 1
    fi
    
    local test_message="🧪 PRUEBA DEL SISTEMA DE ALERTAS

Este es un mensaje de prueba del sistema de monitoreo WATOOLX.

✅ Si recibes este mensaje, el sistema está funcionando correctamente.

⏰ Fecha: $(date '+%Y-%m-%d %H:%M:%S')
🖥️ Servidor: $(hostname)"

    send_email_alert "PRUEBA DEL SISTEMA WATOOLX" "$test_message"
    
    if [ $? -eq 0 ]; then
        log_message "INFO" "🎉 ¡Prueba exitosa! Revisa tu email"
        echo "🎉 ¡Prueba exitosa! Revisa tu email"
    else
        log_message "ERROR" "❌ Prueba fallida. Revisa los logs"
        echo "❌ Prueba fallida. Revisa los logs"
    fi
}

# Función para mostrar estado
show_status() {
    echo "=== ESTADO DEL SISTEMA DE ALERTAS EMAIL ==="
    echo "📁 Configuración: $(if [ -f "$CONFIG_FILE" ]; then echo "✅ Configurado"; else echo "❌ No configurado"; fi)"
    
    if [ -f "$CONFIG_FILE" ]; then
        source "$CONFIG_FILE"
        echo "📧 Gmail: $GMAIL_USER@gmail.com"
        echo "📬 Admin: $ADMIN_EMAIL"
    fi
    
    echo "📝 Log: $LOG_FILE"
    echo "🚨 Alertas pendientes: $(if [ -f "$ALERT_FILE" ] && [ -s "$ALERT_FILE" ]; then echo "SÍ"; else echo "NO"; fi)"
    echo ""
    
    if [ -f "$CONFIG_FILE" ]; then
        echo "✅ Sistema listo para enviar alertas por email"
    else
        echo "❌ Sistema no configurado. Ejecuta: $0 setup"
    fi
}

# Función principal
main() {
    local action=$1
    
    case $action in
        "setup")
            setup_gmail
            ;;
        "test")
            test_email
            ;;
        "status")
            show_status
            ;;
        "send")
            if [ -z "$2" ] || [ -z "$3" ]; then
                echo "Uso: $0 send 'Asunto' 'Mensaje'"
                exit 1
            fi
            send_immediate_alert "$2" "$3"
            ;;
        "process")
            process_pending_alerts
            ;;
        "monitor")
            log_message "INFO" "🚀 Iniciando monitoreo de alertas por email..."
            while true; do
                process_pending_alerts
                sleep 300  # 5 minutos
            done
            ;;
        *)
            echo "Uso: $0 {setup|test|status|send|process|monitor}"
            echo ""
            echo "Acciones disponibles:"
            echo "  setup     - Configurar Gmail para alertas"
            echo "  test      - Probar envío de email"
            echo "  status    - Mostrar estado del sistema"
            echo "  send      - Enviar alerta inmediata"
            echo "  process   - Procesar alertas pendientes"
            echo "  monitor   - Monitoreo continuo de alertas"
            echo ""
            echo "Ejemplos:"
            echo "  $0 setup                    # Configuración inicial"
            echo "  $0 test                     # Probar sistema"
            echo "  $0 send 'ALERTA' 'Mensaje' # Enviar alerta manual"
            echo "  $0 monitor                  # Monitoreo automático"
            exit 1
            ;;
    esac
    
    log_message "INFO" "✅ Operación '$action' completada exitosamente"
}

# Banner
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                WATOOLX EMAIL ALERTS                         ║"
echo "║                        v1.0 - 2025                          ║"
echo "║                    Sistema de Alertas                        ║"
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
