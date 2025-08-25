#!/bin/bash
# /home/sturt-wha-icket/scripts/send-whatsapp-alert.sh
# Script para enviar alertas por WhatsApp usando el API del sistema WATOOLX
# Autor: Asistente AI + Equipo de Desarrollo
# Fecha: 16 de Agosto 2025
# Versión: 1.0

# Configuración
ALERT_FILE="/tmp/watoolx-alerts.log"
LOG_FILE="/var/log/watoolx-whatsapp-alerts.log"
API_ENDPOINT="https://waapi.powerwapp.net/api/messages/send"
TOKEN_FILE="/home/sturt-wha-icket/.whatsapp-token"
ADMIN_NUMBER="51959858768"  # Cambiar por tu número

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

# Función para obtener token de WhatsApp
get_whatsapp_token() {
    if [ -f "$TOKEN_FILE" ]; then
        cat "$TOKEN_FILE"
    else
        log_message "ERROR" "❌ Archivo de token no encontrado: $TOKEN_FILE"
        log_message "INFO" "💡 Ve a Conexiones en WATOOLX y copia el token"
        return 1
    fi
}

# Función para enviar alerta por WhatsApp
send_whatsapp_alert() {
    local subject=$1
    local message=$2
    
    local token=$(get_whatsapp_token)
    if [ $? -ne 0 ]; then
        return 1
    fi
    
    # Preparar mensaje completo
    local full_message="🚨 ALERTA WATOOLX 🚨

$subject

$message

⏰ Fecha: $(date '+%Y-%m-%d %H:%M:%S')
🖥️ Servidor: $(hostname)
🌐 IP: $(curl -s ifconfig.me 2>/dev/null || echo 'N/A')

🔧 Sistema de Monitoreo Automático
WATOOLX v2.0"
    
    # Enviar por API de WhatsApp
    local response=$(curl -s -X POST "$API_ENDPOINT" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "{
            \"number\": \"$ADMIN_NUMBER\",
            \"body\": \"$full_message\"
        }" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ ! -z "$response" ]; then
        log_message "INFO" "✅ Alerta enviada por WhatsApp exitosamente"
        log_message "DEBUG" "📱 Respuesta API: $response"
        return 0
    else
        log_message "ERROR" "❌ Error al enviar alerta por WhatsApp"
        log_message "DEBUG" "🔍 Respuesta: $response"
        return 1
    fi
}

# Función para procesar alertas pendientes
process_pending_alerts() {
    if [ ! -f "$ALERT_FILE" ] || [ ! -s "$ALERT_FILE" ]; then
        log_message "DEBUG" "ℹ️ No hay alertas pendientes"
        return 0
    fi
    
    log_message "INFO" "📱 Procesando alertas pendientes..."
    
    # Leer y procesar cada alerta
    while IFS= read -r line; do
        if [ ! -z "$line" ]; then
            # Extraer información de la alerta
            local timestamp=$(echo "$line" | cut -d' ' -f1-3)
            local alert_type=$(echo "$line" | cut -d' ' -f6-)
            
            # Enviar alerta por WhatsApp
            send_whatsapp_alert "ALERTA DEL SISTEMA" "$alert_type"
            
            if [ $? -eq 0 ]; then
                log_message "INFO" "✅ Alerta procesada: $alert_type"
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
    local subject=$1
    local message=$2
    
    log_message "INFO" "🚨 Enviando alerta inmediata por WhatsApp..."
    send_whatsapp_alert "$subject" "$message"
}

# Función para configurar token
setup_token() {
    log_message "INFO" "🔧 Configurando token de WhatsApp..."
    
    echo "=== CONFIGURACIÓN DE TOKEN WHATSAPP ==="
    echo "1. Ve a WATOOLX > Conexiones"
    echo "2. Copia el token de tu conexión"
    echo "3. Pégalo aquí:"
    echo ""
    read -p "Token: " token
    
    if [ ! -z "$token" ]; then
        echo "$token" > "$TOKEN_FILE"
        chmod 600 "$TOKEN_FILE"
        log_message "INFO" "✅ Token configurado exitosamente"
        echo "✅ Token guardado en: $TOKEN_FILE"
    else
        log_message "ERROR" "❌ Token no puede estar vacío"
        return 1
    fi
}

# Función para configurar número de administrador
setup_admin_number() {
    log_message "INFO" "📱 Configurando número de administrador..."
    
    echo "=== CONFIGURACIÓN DE NÚMERO ADMINISTRADOR ==="
    echo "Formato: Código país + DDD + Número"
    echo "Ejemplo: 51959858768 (Perú)"
    echo ""
    read -p "Número: " number
    
    if [ ! -z "$number" ]; then
        # Actualizar variable en el script
        sed -i "s/ADMIN_NUMBER=\"[^\"]*\"/ADMIN_NUMBER=\"$number\"/" "$0"
        log_message "INFO" "✅ Número de administrador configurado: $number"
        echo "✅ Número actualizado: $number"
    else
        log_message "ERROR" "❌ Número no puede estar vacío"
        return 1
    fi
}

# Función para probar envío
test_whatsapp() {
    log_message "INFO" "🧪 Probando envío de WhatsApp..."
    
    local token=$(get_whatsapp_token)
    if [ $? -ne 0 ]; then
        return 1
    fi
    
    local test_message="🧪 PRUEBA DEL SISTEMA DE ALERTAS

Este es un mensaje de prueba del sistema de monitoreo WATOOLX.

✅ Si recibes este mensaje, el sistema está funcionando correctamente.

⏰ Fecha: $(date '+%Y-%m-%d %H:%M:%S')
🖥️ Servidor: $(hostname)"

    send_whatsapp_alert "PRUEBA DEL SISTEMA" "$test_message"
    
    if [ $? -eq 0 ]; then
        log_message "INFO" "🎉 ¡Prueba exitosa! Revisa tu WhatsApp"
        echo "🎉 ¡Prueba exitosa! Revisa tu WhatsApp"
    else
        log_message "ERROR" "❌ Prueba fallida. Revisa los logs"
        echo "❌ Prueba fallida. Revisa los logs"
    fi
}

# Función para mostrar estado
show_status() {
    echo "=== ESTADO DEL SISTEMA DE ALERTAS WHATSAPP ==="
    echo "📁 Token: $(if [ -f "$TOKEN_FILE" ]; then echo "✅ Configurado"; else echo "❌ No configurado"; fi)"
    echo "📱 Número admin: $ADMIN_NUMBER"
    echo "🌐 API Endpoint: $API_ENDPOINT"
    echo "📝 Log: $LOG_FILE"
    echo "🚨 Alertas pendientes: $(if [ -f "$ALERT_FILE" ] && [ -s "$ALERT_FILE" ]; then echo "SÍ"; else echo "NO"; fi)"
    echo ""
    
    if [ -f "$TOKEN_FILE" ]; then
        echo "✅ Sistema listo para enviar alertas"
    else
        echo "❌ Sistema no configurado. Ejecuta: $0 setup"
    fi
}

# Función principal
main() {
    local action=$1
    
    case $action in
        "setup")
            setup_token
            setup_admin_number
            ;;
        "test")
            test_whatsapp
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
            log_message "INFO" "🚀 Iniciando monitoreo de alertas..."
            while true; do
                process_pending_alerts
                sleep 300  # 5 minutos
            done
            ;;
        *)
            echo "Uso: $0 {setup|test|status|send|process|monitor}"
            echo ""
            echo "Acciones disponibles:"
            echo "  setup     - Configurar token y número de administrador"
            echo "  test      - Probar envío de WhatsApp"
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
echo "║                WATOOLX WHATSAPP ALERTS                      ║"
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
