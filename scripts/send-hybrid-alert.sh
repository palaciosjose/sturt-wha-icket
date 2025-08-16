#!/bin/bash
# /home/watoolxoficial/scripts/send-hybrid-alert.sh
# Script híbrido para enviar alertas por WhatsApp Y Email automáticamente
# Autor: Asistente AI + Equipo de Desarrollo
# Fecha: 16 de Agosto 2025
# Versión: 1.0 (Híbrida)

# Configuración
ALERT_FILE="/tmp/watoolx-alerts.log"
LOG_FILE="/var/log/watoolx-hybrid-alerts.log"
WHATSAPP_TOKEN_FILE="/home/watoolxoficial/.whatsapp-token"
EMAIL_CONFIG_FILE="/home/watoolxoficial/.email-config"
ADMIN_NUMBER="51959858768"  # WhatsApp del admin

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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
        "HYBRID") echo -e "${PURPLE}[HYBRID]${NC} $timestamp - $message" | tee -a $LOG_FILE ;;
    esac
}

# Función para obtener token de WhatsApp
get_whatsapp_token() {
    if [ -f "$WHATSAPP_TOKEN_FILE" ]; then
        cat "$WHATSAPP_TOKEN_FILE"
    else
        log_message "ERROR" "❌ Archivo de token WhatsApp no encontrado: $WHATSAPP_TOKEN_FILE"
        return 1
    fi
}

# Función para cargar configuración de email
load_email_config() {
    if [ ! -f "$EMAIL_CONFIG_FILE" ]; then
        log_message "ERROR" "❌ Archivo de configuración email no encontrado: $EMAIL_CONFIG_FILE"
        return 1
    fi
    
    source "$EMAIL_CONFIG_FILE"
    
    if [ -z "$GMAIL_USER" ] || [ -z "$GMAIL_PASS" ] || [ -z "$ADMIN_EMAIL" ]; then
        log_message "ERROR" "❌ Configuración email incompleta"
        return 1
    fi
    
    return 0
}

# Función para enviar alerta por WhatsApp
send_whatsapp_alert() {
    local subject="$1"
    local message="$2"
    
    local token=$(get_whatsapp_token)
    if [ $? -ne 0 ]; then
        return 1
    fi
    
    local full_message="🚨 ALERTA WATOOLX 🚨\n\n$subject\n\n$message\n\n⏰ Fecha: $(date '+%Y-%m-%d %H:%M:%S')\n🖥️ Servidor: $(hostname)\n🌐 IP: $(curl -s ifconfig.me 2>/dev/null || echo 'N/A')\n\n🔧 Sistema de Monitoreo Automático\nWATOOLX v2.0"
    
    local response=$(curl -s -X POST "https://waapi.powerwapp.net/api/messages/send" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "{
            \"number\": \"$ADMIN_NUMBER\",
            \"body\": \"$full_message\"
        }" 2>/dev/null)
    
    if [[ "$response" == *"error"* ]]; then
        log_message "ERROR" "❌ Error WhatsApp: $response"
        return 1
    else
        log_message "INFO" "✅ Alerta WhatsApp enviada exitosamente"
        return 0
    fi
}

# Función para enviar alerta por email
send_email_alert() {
    local subject="$1"
    local message="$2"
    
    if ! load_email_config; then
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
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .alert { background: linear-gradient(135deg, #ff4444, #cc0000); color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
        .info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #007bff; }
        .success { background: linear-gradient(135deg, #44ff44, #00cc00); color: black; padding: 15px; border-radius: 5px; text-align: center; margin: 15px 0; }
        .timestamp { color: #666; font-size: 12px; text-align: center; margin-top: 20px; }
        .hybrid-badge { background: #6f42c1; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; display: inline-block; margin-bottom: 10px; }
        pre { white-space: pre-wrap; font-family: 'Courier New', monospace; background: #f8f9fa; padding: 10px; border-radius: 3px; border: 1px solid #e9ecef; }
    </style>
</head>
<body>
    <div class="container">
        <div class="hybrid-badge">🔀 SISTEMA HÍBRIDO WATOOLX</div>
        
        <div class="alert">
            <h1>🚨 ALERTA WATOOLX 🚨</h1>
            <h2>$subject</h2>
        </div>
        
        <div class="info">
            <h3>📋 Detalles del Incidente:</h3>
            <pre>$message</pre>
        </div>
        
        <div class="info">
            <h3>🖥️ Información del Sistema:</h3>
            <strong>⏰ Fecha:</strong> $(date '+%Y-%m-%d %H:%M:%S')<br>
            <strong>🖥️ Servidor:</strong> $(hostname)<br>
            <strong>🌐 IP:</strong> $(curl -s ifconfig.me 2>/dev/null || echo 'N/A')<br>
            <strong>🔧 Sistema:</strong> WATOOLX v2.0<br>
            <strong>📱 Notificación:</strong> WhatsApp + Email
        </div>
        
        <div class="success">
            <strong>✅ Esta alerta fue enviada automáticamente por el sistema híbrido de monitoreo WATOOLX</strong><br>
            <small>Recibiste esta alerta por email. También se envió por WhatsApp para notificación inmediata.</small>
        </div>
        
        <div class="timestamp">
            Enviado automáticamente el $(date '+%Y-%m-%d %H:%M:%S UTC')<br>
            Sistema Híbrido WATOOLX - WhatsApp + Email
        </div>
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
        log_message "INFO" "✅ Alerta email enviada exitosamente a $ADMIN_EMAIL"
        return 0
    else
        log_message "ERROR" "❌ Error al enviar email: $response"
        return 1
    fi
}

# Función para enviar alerta híbrida (WhatsApp + Email)
send_hybrid_alert() {
    local subject="$1"
    local message="$2"
    
    log_message "HYBRID" "🚀 Enviando alerta híbrida (WhatsApp + Email)..."
    
    local whatsapp_success=false
    local email_success=false
    
    # Intentar WhatsApp primero (más rápido)
    log_message "DEBUG" "📱 Intentando envío por WhatsApp..."
    if send_whatsapp_alert "$subject" "$message"; then
        whatsapp_success=true
        log_message "INFO" "✅ WhatsApp: Enviado exitosamente"
    else
        log_message "WARN" "⚠️ WhatsApp: Falló, continuando con email"
    fi
    
    # Intentar Email
    log_message "DEBUG" "📧 Intentando envío por email..."
    if send_email_alert "$subject" "$message"; then
        email_success=true
        log_message "INFO" "✅ Email: Enviado exitosamente"
    else
        log_message "WARN" "⚠️ Email: Falló"
    fi
    
    # Resumen del envío híbrido
    if [ "$whatsapp_success" = true ] && [ "$email_success" = true ]; then
        log_message "HYBRID" "🎉 ¡Alerta híbrida enviada exitosamente por AMBOS canales!"
        return 0
    elif [ "$whatsapp_success" = true ] || [ "$email_success" = true ]; then
        log_message "HYBRID" "⚠️ Alerta enviada parcialmente (WhatsApp: $whatsapp_success, Email: $email_success)"
        return 0
    else
        log_message "ERROR" "❌ Alerta híbrida falló en ambos canales"
        return 1
    fi
}

# Función para procesar alertas pendientes
process_pending_alerts() {
    if [ ! -f "$ALERT_FILE" ] || [ ! -s "$ALERT_FILE" ]; then
        log_message "DEBUG" "ℹ️ No hay alertas pendientes"
        return 0
    fi
    
    log_message "HYBRID" "🔄 Procesando alertas pendientes con sistema híbrido..."
    
    # Leer y procesar cada alerta
    while IFS= read -r line; do
        if [ ! -z "$line" ]; then
            # Extraer información de la alerta
            local timestamp=$(echo "$line" | cut -d' ' -f1-3)
            local alert_type=$(echo "$line" | cut -d' ' -f6-)
            
            # Enviar alerta híbrida
            send_hybrid_alert "ALERTA DEL SISTEMA WATOOLX" "$alert_type"
            
            if [ $? -eq 0 ]; then
                log_message "HYBRID" "✅ Alerta híbrida procesada: $alert_type"
            else
                log_message "ERROR" "❌ Error procesando alerta híbrida: $alert_type"
            fi
            
            # Pequeña pausa entre alertas para evitar spam
            sleep 2
        fi
    done < "$ALERT_FILE"
    
    # Limpiar archivo de alertas
    > "$ALERT_FILE"
    log_message "HYBRID" "🧹 Archivo de alertas limpiado"
}

# Función para enviar alerta inmediata
send_immediate_hybrid_alert() {
    local subject="$1"
    local message="$2"
    
    log_message "HYBRID" "🚨 Enviando alerta híbrida inmediata..."
    send_hybrid_alert "$subject" "$message"
}

# Función para configurar sistema híbrido
setup_hybrid() {
    log_message "HYBRID" "🔧 Configurando sistema híbrido de alertas..."
    
    echo "=== CONFIGURACIÓN DEL SISTEMA HÍBRIDO WATOOLX ==="
    echo ""
    echo "🎯 Este sistema enviará alertas por WhatsApp Y Email automáticamente"
    echo ""
    
    # Verificar WhatsApp
    echo "📱 CONFIGURACIÓN WHATSAPP:"
    if [ -f "$WHATSAPP_TOKEN_FILE" ]; then
        echo "✅ Token WhatsApp encontrado"
    else
        echo "❌ Token WhatsApp no encontrado"
        echo "💡 Ejecuta: ./send-whatsapp-alert.sh setup"
        echo ""
    fi
    
    # Verificar Email
    echo "📧 CONFIGURACIÓN EMAIL:"
    if [ -f "$EMAIL_CONFIG_FILE" ]; then
        echo "✅ Configuración email encontrada"
    else
        echo "❌ Configuración email no encontrada"
        echo "💡 Ejecuta: ./send-email-alert.sh setup"
        echo ""
    fi
    
    echo ""
    echo "🔍 VERIFICANDO ESTADO COMPLETO..."
    
    local whatsapp_ok=false
    local email_ok=false
    
    # Probar WhatsApp
    if [ -f "$WHATSAPP_TOKEN_FILE" ]; then
        echo "🧪 Probando WhatsApp..."
        if send_whatsapp_alert "PRUEBA HÍBRIDA" "Prueba del sistema híbrido WATOOLX"; then
            whatsapp_ok=true
            echo "✅ WhatsApp: Funcionando"
        else
            echo "❌ WhatsApp: Falló"
        fi
    fi
    
    # Probar Email
    if [ -f "$EMAIL_CONFIG_FILE" ]; then
        echo "🧪 Probando Email..."
        if send_email_alert "PRUEBA HÍBRIDA" "Prueba del sistema híbrido WATOOLX"; then
            email_ok=true
            echo "✅ Email: Funcionando"
        else
            echo "❌ Email: Falló"
        fi
    fi
    
    echo ""
    echo "=== RESUMEN DE CONFIGURACIÓN ==="
    echo "📱 WhatsApp: $(if [ "$whatsapp_ok" = true ]; then echo "✅ FUNCIONANDO"; else echo "❌ NO FUNCIONA"; fi)"
    echo "📧 Email: $(if [ "$email_ok" = true ]; then echo "✅ FUNCIONANDO"; else echo "❌ NO FUNCIONA"; fi)"
    echo ""
    
    if [ "$whatsapp_ok" = true ] && [ "$email_ok" = true ]; then
        echo "🎉 ¡SISTEMA HÍBRIDO COMPLETAMENTE FUNCIONAL!"
        echo "✅ Las alertas se enviarán por ambos canales automáticamente"
    elif [ "$whatsapp_ok" = true ] || [ "$email_ok" = true ]; then
        echo "⚠️ SISTEMA PARCIALMENTE FUNCIONAL"
        echo "✅ Las alertas se enviarán por el canal que funcione"
    else
        echo "❌ SISTEMA NO FUNCIONAL"
        echo "🔧 Configura al menos un canal antes de continuar"
    fi
}

# Función para probar sistema híbrido
test_hybrid() {
    log_message "HYBRID" "🧪 Probando sistema híbrido completo..."
    
    local test_message="🧪 PRUEBA DEL SISTEMA HÍBRIDO

Este es un mensaje de prueba del sistema híbrido WATOOLX.

✅ Si recibes este mensaje por WhatsApp Y Email, el sistema está funcionando perfectamente.

🎯 Características del sistema híbrido:
• 📱 WhatsApp: Notificación inmediata
• 📧 Email: Documentación completa
• 🔄 Redundancia: Si falla uno, el otro funciona
• ⚡ Automático: Sin intervención manual

⏰ Fecha: $(date '+%Y-%m-%d %H:%M:%S')
🖥️ Servidor: $(hostname)"

    send_hybrid_alert "PRUEBA DEL SISTEMA HÍBRIDO WATOOLX" "$test_message"
    
    if [ $? -eq 0 ]; then
        log_message "HYBRID" "🎉 ¡Prueba híbrida exitosa! Revisa WhatsApp y Email"
        echo "🎉 ¡Prueba híbrida exitosa! Revisa WhatsApp y Email"
    else
        log_message "ERROR" "❌ Prueba híbrida fallida. Revisa los logs"
        echo "❌ Prueba híbrida fallida. Revisa los logs"
    fi
}

# Función para mostrar estado
show_status() {
    echo "=== ESTADO DEL SISTEMA HÍBRIDO WATOOLX ==="
    echo ""
    
    # Estado WhatsApp
    echo "📱 WHATSAPP:"
    if [ -f "$WHATSAPP_TOKEN_FILE" ]; then
        echo "  ✅ Token encontrado"
        echo "  📁 Archivo: $WHATSAPP_TOKEN_FILE"
    else
        echo "  ❌ Token no encontrado"
    fi
    
    # Estado Email
    echo "📧 EMAIL:"
    if [ -f "$EMAIL_CONFIG_FILE" ]; then
        echo "  ✅ Configuración encontrada"
        echo "  📁 Archivo: $EMAIL_CONFIG_FILE"
    else
        echo "  ❌ Configuración no encontrada"
    fi
    
    echo ""
    echo "📝 Log del sistema: $LOG_FILE"
    echo "🚨 Alertas pendientes: $(if [ -f "$ALERT_FILE" ] && [ -s "$ALERT_FILE" ]; then echo "SÍ"; else echo "NO"; fi)"
    echo ""
    
    # Verificar funcionalidad
    local whatsapp_working=false
    local email_working=false
    
    if [ -f "$WHATSAPP_TOKEN_FILE" ]; then
        whatsapp_working=true
    fi
    
    if [ -f "$EMAIL_CONFIG_FILE" ]; then
        email_working=true
    fi
    
    if [ "$whatsapp_working" = true ] && [ "$email_working" = true ]; then
        echo "🎉 SISTEMA HÍBRIDO COMPLETAMENTE CONFIGURADO"
        echo "✅ Listo para enviar alertas por ambos canales"
    elif [ "$whatsapp_working" = true ] || [ "$email_working" = true ]; then
        echo "⚠️ SISTEMA PARCIALMENTE CONFIGURADO"
        echo "✅ Funcionará con el canal disponible"
    else
        echo "❌ SISTEMA NO CONFIGURADO"
        echo "🔧 Ejecuta: $0 setup"
    fi
}

# Función principal
main() {
    local action=$1
    
    case $action in
        "setup")
            setup_hybrid
            ;;
        "test")
            test_hybrid
            ;;
        "status")
            show_status
            ;;
        "send")
            if [ -z "$2" ] || [ -z "$3" ]; then
                echo "Uso: $0 send 'Asunto' 'Mensaje'"
                exit 1
            fi
            send_immediate_hybrid_alert "$2" "$3"
            ;;
        "process")
            process_pending_alerts
            ;;
        "monitor")
            log_message "HYBRID" "🚀 Iniciando monitoreo híbrido de alertas..."
            while true; do
                process_pending_alerts
                sleep 300  # 5 minutos
            done
            ;;
        *)
            echo "Uso: $0 {setup|test|status|send|process|monitor}"
            echo ""
            echo "🎯 SISTEMA HÍBRIDO WATOOLX - WhatsApp + Email"
            echo ""
            echo "Acciones disponibles:"
            echo "  setup     - Configurar sistema híbrido completo"
            echo "  test      - Probar envío híbrido (WhatsApp + Email)"
            echo "  status    - Mostrar estado del sistema híbrido"
            echo "  send      - Enviar alerta híbrida inmediata"
            echo "  process   - Procesar alertas pendientes"
            echo "  monitor   - Monitoreo continuo de alertas"
            echo ""
            echo "🔀 VENTAJAS DEL SISTEMA HÍBRIDO:"
            echo "  • 📱 WhatsApp: Notificación inmediata"
            echo "  • 📧 Email: Documentación completa"
            echo "  • 🔄 Redundancia: Si falla uno, el otro funciona"
            echo "  • ⚡ Automático: Sin intervención manual"
            echo ""
            echo "Ejemplos:"
            echo "  $0 setup                    # Configuración inicial"
            echo "  $0 test                     # Probar sistema completo"
            echo "  $0 send 'ALERTA' 'Mensaje' # Enviar alerta híbrida"
            echo "  $0 monitor                  # Monitoreo automático"
            exit 1
            ;;
    esac
    
    log_message "HYBRID" "✅ Operación '$action' completada exitosamente"
}

# Banner
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              WATOOLX HYBRID ALERTS                          ║"
echo "║                        v1.0 - 2025                          ║"
echo "║                WhatsApp + Email                              ║"
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
