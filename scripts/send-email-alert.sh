#!/bin/bash
# /home/watoolxoficial/scripts/send-email-alert.sh
# Script para enviar alertas por email usando Gmail SMTP
# Autor: Asistente AI + Equipo de Desarrollo
# Fecha: 17 de Agosto 2025
# Versión: 2.0 - Sistema de Alertas Híbridas

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
Subject: 🚨 ALERTA WATOOLX - $subject
Content-Type: text/html; charset=UTF-8
MIME-Version: 1.0

<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
        .header h2 { margin: 10px 0 0 0; font-size: 18px; font-weight: 300; opacity: 0.9; }
        .alert-section { background: linear-gradient(135deg, #ff4444, #cc0000); color: white; padding: 25px; text-align: center; }
        .alert-section h3 { margin: 0; font-size: 24px; font-weight: 400; }
        .content { padding: 30px; }
        .info-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff; }
        .info-box h4 { margin: 0 0 15px 0; color: #007bff; font-size: 18px; }
        .message-box { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .message-box pre { white-space: pre-wrap; font-family: 'Courier New', monospace; background: #f8f9fa; padding: 15px; border-radius: 5px; border: 1px solid #e9ecef; margin: 0; overflow-x: auto; }
        .system-info { background: #e8f5e8; border: 1px solid #c3e6c3; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .system-info h4 { margin: 0 0 15px 0; color: #28a745; font-size: 18px; }
        .footer { background: #343a40; color: white; padding: 20px; text-align: center; font-size: 12px; }
        .badge { background: #6f42c1; color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; display: inline-block; margin-bottom: 20px; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; padding: 10px 15px; background: white; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .metric strong { color: #007bff; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="badge">🔔 SISTEMA DE ALERTAS WATOOLX</div>
            <h1>🚨 ALERTA DEL SISTEMA</h1>
            <h2>Monitoreo Automático v2.0</h2>
        </div>
        
        <div class="alert-section">
            <h3>$subject</h3>
        </div>
        
        <div class="content">
            <div class="info-box">
                <h4>📋 Detalles del Incidente</h4>
                <div class="message-box">
                    <pre>$message</pre>
                </div>
            </div>
            
            <div class="system-info">
                <h4>🖥️ Información del Sistema</h4>
                <div class="metric">
                    <strong>⏰ Fecha:</strong><br>
                    $(date '+%Y-%m-%d %H:%M:%S')
                </div>
                <div class="metric">
                    <strong>🖥️ Servidor:</strong><br>
                    $(hostname)
                </div>
                <div class="metric">
                    <strong>🌐 IP:</strong><br>
                    $(curl -s ifconfig.me 2>/dev/null || echo 'N/A')
                </div>
                <div class="metric">
                    <strong>🔧 Sistema:</strong><br>
                    WATOOLX v2.0
                </div>
            </div>
            
            <div class="info-box">
                <h4>📊 Métricas del Sistema</h4>
                <div class="metric">
                    <strong>💾 Disco:</strong><br>
                    $(df / | awk 'NR==2 {print $5 " usado"}')
                </div>
                <div class="metric">
                    <strong>🧠 Memoria:</strong><br>
                    $(free -h | awk 'NR==2 {print $3 "/" $2}')
                </div>
                <div class="metric">
                    <strong>⚡ CPU:</strong><br>
                    $(uptime | awk '{print $10}' | sed 's/,//')
                </div>
                <div class="metric">
                    <strong>🗄️ MySQL:</strong><br>
                    $(du -sh /var/lib/mysql 2>/dev/null | awk '{print $1}' || echo 'N/A')
                </div>
            </div>
        </div>
        
        <div class="footer">
            <strong>✅ Alerta generada automáticamente por el sistema de monitoreo WATOOLX</strong><br>
            <small>Enviado el $(date '+%Y-%m-%d %H:%M:%S UTC') - Sistema de Alertas Híbridas</small>
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
    
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║              CONFIGURACIÓN DE GMAIL PARA ALERTAS              ║${NC}"
    echo -e "${BLUE}║                        WATOOLX v2.0                          ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANTE: Para usar Gmail necesitas:${NC}"
    echo -e "${YELLOW}   1. Activar verificación en 2 pasos en tu cuenta de Google${NC}"
    echo -e "${YELLOW}   2. Generar contraseña de aplicación${NC}"
    echo -e "${YELLOW}   3. Usar esa contraseña aquí (NO tu contraseña normal)${NC}"
    echo ""
    echo -e "${BLUE}📋 Pasos para generar App Password:${NC}"
    echo -e "${BLUE}   1. Ve a https://myaccount.google.com/security${NC}"
    echo -e "${BLUE}   2. Activa 'Verificación en 2 pasos' si no está activada${NC}"
    echo -e "${BLUE}   3. Ve a 'Contraseñas de aplicación'${NC}"
    echo -e "${BLUE}   4. Selecciona 'Otra' y escribe 'WATOOLX'${NC}"
    echo -e "${BLUE}   5. Copia la contraseña generada${NC}"
    echo ""
    
    echo -e "${GREEN}📧 Gmail (ejemplo: tuemail@gmail.com):${NC}"
    read -p "Email: " gmail_user
    
    echo ""
    echo -e "${GREEN}🔑 Contraseña de aplicación (NO tu contraseña normal):${NC}"
    read -s -p "Contraseña: " gmail_pass
    echo ""
    
    echo ""
    echo -e "${GREEN}📬 Email del administrador (donde recibir alertas):${NC}"
    read -p "Email admin: " admin_email
    
    if [ ! -z "$gmail_user" ] && [ ! -z "$gmail_pass" ] && [ ! -z "$admin_email" ]; then
        # Crear archivo de configuración
        cat > "$CONFIG_FILE" << EOF
# Configuración de Gmail para alertas WATOOLX
# Archivo: .email-config
# Última actualización: $(date '+%Y-%m-%d %H:%M:%S')

# Credenciales de Gmail (App Password)
GMAIL_USER="$gmail_user"
GMAIL_PASS="$gmail_pass"

# Email del administrador que recibirá las alertas
ADMIN_EMAIL="$admin_email"

# Nota: Para GMAIL, necesitas usar "App Password" no tu contraseña normal
# 1. Activa 2FA en tu cuenta de Google
# 2. Ve a "Contraseñas de aplicación"
# 3. Genera una contraseña para "WATOOLX"
# 4. Usa esa contraseña en GMAIL_PASS
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
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                ESTADO DEL SISTEMA DE ALERTAS                 ║${NC}"
    echo -e "${BLUE}║                        WATOOLX v2.0                          ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Estado de configuración
    if [ -f "$CONFIG_FILE" ]; then
        echo -e "${GREEN}✅ CONFIGURACIÓN: Configurado${NC}"
        source "$CONFIG_FILE"
        echo -e "${BLUE}   📧 Gmail: $GMAIL_USER@gmail.com${NC}"
        echo -e "${BLUE}   📬 Admin: $ADMIN_EMAIL${NC}"
    else
        echo -e "${RED}❌ CONFIGURACIÓN: No configurado${NC}"
        echo -e "${YELLOW}   💡 Ejecuta: $0 setup${NC}"
    fi
    
    echo ""
    
    # Estado de logs
    echo -e "${BLUE}📝 LOGS: $LOG_FILE${NC}"
    if [ -f "$LOG_FILE" ]; then
        local log_size=$(du -h "$LOG_FILE" 2>/dev/null | awk '{print $1}' || echo "0B")
        echo -e "${BLUE}   📊 Tamaño: $log_size${NC}"
    fi
    
    echo ""
    
    # Estado de alertas pendientes
    if [ -f "$ALERT_FILE" ] && [ -s "$ALERT_FILE" ]; then
        local alert_count=$(wc -l < "$ALERT_FILE")
        echo -e "${YELLOW}🚨 ALERTAS PENDIENTES: SÍ ($alert_count alertas)${NC}"
        echo -e "${YELLOW}   💡 Ejecuta: $0 process para procesarlas${NC}"
    else
        echo -e "${GREEN}🚨 ALERTAS PENDIENTES: NO${NC}"
    fi
    
    echo ""
    
    # Estado del sistema
    if [ -f "$CONFIG_FILE" ]; then
        echo -e "${GREEN}🎉 SISTEMA: Listo para enviar alertas por email${NC}"
        echo -e "${GREEN}   💡 Prueba con: $0 test${NC}"
        echo -e "${GREEN}   💡 Monitoreo: $0 monitor${NC}"
    else
        echo -e "${RED}❌ SISTEMA: No configurado${NC}"
        echo -e "${RED}   💡 Configura con: $0 setup${NC}"
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
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                WATOOLX EMAIL ALERTS                         ║${NC}"
echo -e "${BLUE}║                        v2.0 - 2025                          ║${NC}"
echo -e "${BLUE}║                    Sistema de Alertas Híbridas               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"

# Verificar si se ejecuta como root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Este script debe ejecutarse como root"
    exit 1
fi

# Crear directorio de logs si no existe
mkdir -p $(dirname $LOG_FILE)

# Ejecutar función principal
main "$@"
