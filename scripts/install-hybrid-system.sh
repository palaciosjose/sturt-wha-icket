#!/bin/bash
# /home/watoolxoficial/scripts/install-hybrid-system.sh
# Script de instalación del sistema híbrido de alertas WATOOLX
# Autor: Asistente AI + Equipo de Desarrollo
# Fecha: 16 de Agosto 2025
# Versión: 1.0

# Configuración
SCRIPTS_DIR="/home/watoolxoficial/scripts"
LOG_FILE="/var/log/watoolx-hybrid-install.log"

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

# Banner
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           INSTALADOR DEL SISTEMA HÍBRIDO                    ║"
echo "║                    WATOOLX v2.0                             ║"
echo "║                WhatsApp + Email                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# Verificar si se ejecuta como root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Este script debe ejecutarse como root"
    exit 1
fi

# Crear directorio de logs
mkdir -p $(dirname $LOG_FILE)

log_message "HYBRID" "🚀 Iniciando instalación del sistema híbrido de alertas..."

# Verificar que existan los scripts necesarios
log_message "INFO" "🔍 Verificando scripts necesarios..."

required_scripts=(
    "send-hybrid-alert.sh"
    "send-whatsapp-alert.sh"
    "send-email-alert.sh"
)

for script in "${required_scripts[@]}"; do
    if [ ! -f "$SCRIPTS_DIR/$script" ]; then
        log_message "ERROR" "❌ Script no encontrado: $script"
        echo "❌ Script no encontrado: $script"
        echo "💡 Asegúrate de que todos los scripts estén en $SCRIPTS_DIR"
        exit 1
    else
        log_message "DEBUG" "✅ Script encontrado: $script"
    fi
done

# Dar permisos de ejecución
log_message "INFO" "🔐 Configurando permisos de ejecución..."
chmod +x "$SCRIPTS_DIR"/*.sh

# Crear enlaces simbólicos para compatibilidad
log_message "INFO" "🔗 Creando enlaces simbólicos..."
ln -sf "$SCRIPTS_DIR/send-hybrid-alert.sh" "$SCRIPTS_DIR/send-alert.sh"

# Verificar configuración de WhatsApp
log_message "INFO" "📱 Verificando configuración de WhatsApp..."
if [ -f "/home/watoolxoficial/.whatsapp-token" ]; then
    log_message "INFO" "✅ Token de WhatsApp encontrado"
else
    log_message "WARN" "⚠️ Token de WhatsApp no encontrado"
    echo "⚠️ Token de WhatsApp no encontrado"
    echo "💡 Ejecuta: ./send-whatsapp-alert.sh setup"
fi

# Verificar configuración de Email
log_message "INFO" "📧 Verificando configuración de Email..."
if [ -f "/home/watoolxoficial/.email-config" ]; then
    log_message "INFO" "✅ Configuración de Email encontrada"
else
    log_message "WARN" "⚠️ Configuración de Email no encontrada"
    echo "⚠️ Configuración de Email no encontrada"
    echo "💡 Ejecuta: ./send-email-alert.sh setup"
fi

# Actualizar cron para usar sistema híbrido
log_message "INFO" "⏰ Actualizando configuración de cron..."
if [ -f "/etc/cron.d/watoolx-monitoring" ]; then
    # Remover línea antigua de WhatsApp si existe
    sed -i '/send-whatsapp-alert.sh process/d' /etc/cron.d/watoolx-monitoring
    
    # Agregar línea del sistema híbrido si no existe
    if ! grep -q "send-hybrid-alert.sh process" /etc/cron.d/watoolx-monitoring; then
        echo "# Sistema de alertas híbrido (WhatsApp + Email) cada 5 minutos" >> /etc/cron.d/watoolx-monitoring
        echo "*/5 * * * * root $SCRIPTS_DIR/send-hybrid-alert.sh process >/dev/null 2>&1" >> /etc/cron.d/watoolx-monitoring
        log_message "INFO" "✅ Línea de cron híbrida agregada"
    else
        log_message "DEBUG" "ℹ️ Línea de cron híbrida ya existe"
    fi
else
    log_message "WARN" "⚠️ Archivo de cron no encontrado, creando nuevo..."
    cat > /etc/cron.d/watoolx-monitoring << EOF
# WATOOLX Monitoring System - Cron Jobs
# Sistema de alertas híbrido (WhatsApp + Email) cada 5 minutos
*/5 * * * * root $SCRIPTS_DIR/send-hybrid-alert.sh process >/dev/null 2>&1
EOF
    chmod 644 /etc/cron.d/watoolx-monitoring
fi

# Crear servicio systemd para el sistema híbrido
log_message "INFO" "⚙️ Configurando servicio systemd híbrido..."
cat > /etc/systemd/system/watoolx-hybrid-alerts.service << EOF
[Unit]
Description=WATOOLX Hybrid Alerts System
After=network.target
Wants=network.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=$SCRIPTS_DIR
ExecStart=$SCRIPTS_DIR/send-hybrid-alert.sh monitor
Restart=always
RestartSec=30
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Recargar systemd y habilitar servicio
systemctl daemon-reload
systemctl enable watoolx-hybrid-alerts.service

# Probar sistema híbrido
log_message "INFO" "🧪 Probando sistema híbrido..."
echo ""
echo "🧪 Probando sistema híbrido..."
cd "$SCRIPTS_DIR"

if [ -f ".whatsapp-token" ] && [ -f ".email-config" ]; then
    echo "✅ Ambos sistemas configurados, probando envío híbrido..."
    ./send-hybrid-alert.sh test
else
    echo "⚠️ Sistema parcialmente configurado, probando configuración..."
    ./send-hybrid-alert.sh status
fi

# Mostrar estado final
echo ""
echo "=== ESTADO FINAL DEL SISTEMA HÍBRIDO ==="
./send-hybrid-alert.sh status

# Resumen de instalación
echo ""
echo "🎉 ¡INSTALACIÓN DEL SISTEMA HÍBRIDO COMPLETADA!"
echo ""
echo "📋 RESUMEN:"
echo "  ✅ Scripts instalados y configurados"
echo "  ✅ Permisos configurados"
echo "  ✅ Enlaces simbólicos creados"
echo "  ✅ Cron actualizado para sistema híbrido"
echo "  ✅ Servicio systemd configurado"
echo ""
echo "🚀 PRÓXIMOS PASOS:"
echo "  1. Configura WhatsApp: ./send-whatsapp-alert.sh setup"
echo "  2. Configura Email: ./send-email-alert.sh setup"
echo "  3. Prueba el sistema: ./send-hybrid-alert.sh test"
echo "  4. Monitorea estado: ./send-hybrid-alert.sh status"
echo ""
echo "📚 COMANDOS ÚTILES:"
echo "  ./send-hybrid-alert.sh setup     # Configuración completa"
echo "  ./send-hybrid-alert.sh test      # Prueba del sistema"
echo "  ./send-hybrid-alert.sh monitor   # Monitoreo continuo"
echo "  ./send-hybrid-alert.sh status    # Estado del sistema"
echo ""
echo "🔧 SERVICIOS:"
echo "  systemctl start watoolx-hybrid-alerts    # Iniciar servicio"
echo "  systemctl stop watoolx-hybrid-alerts     # Detener servicio"
echo "  systemctl status watoolx-hybrid-alerts   # Estado del servicio"
echo ""

log_message "HYBRID" "🎉 Instalación del sistema híbrido completada exitosamente"
