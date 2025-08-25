# 🚀 SISTEMA DE MONITOREO WATOOLX v2.0

## 📋 **DESCRIPCIÓN**

Sistema de monitoreo y mantenimiento automático para WATOOLX, completamente reordenado con variables dinámicas y configuración personalizable.

## 🏗️ **ARQUITECTURA REORDENADA**

### **Archivos del Sistema:**

1. **`watoolx-monitoring.conf`** - Archivo de configuración principal con todas las variables
2. **`install-monitoring-system-v2.sh`** - Instalador principal reordenado
3. **`configure-monitoring.sh`** - Configurador interactivo rápido
4. **`monitor-performance.sh`** - Monitoreo de performance del sistema
5. **`mysql-disk-monitor.sh`** - Monitoreo y limpieza de MySQL
6. **`send-whatsapp-alert.sh`** - Sistema de alertas por WhatsApp

## 🚀 **INSTALACIÓN RÁPIDA**

### **PASO 1: Preparar el sistema**
```bash
cd /home/sturt-wha-icket/scripts
chmod +x *.sh
```

### **PASO 2: Configurar (opcional)**
```bash
./configure-monitoring.sh
```
- Configura directorios, MySQL, monitoreo, alertas y horarios
- Interfaz interactiva fácil de usar

### **PASO 3: Instalar**
```bash
./install-monitoring-system-v2.sh
```

## ⚙️ **CONFIGURACIÓN PERSONALIZABLE**

### **Variables Principales:**

```bash
# Directorios
WATOOLX_HOME="/home/sturt-wha-icket"
SCRIPTS_DIR="/home/sturt-wha-icket/scripts"
BACKUP_DIR="/home/sturt-wha-icket/backups/mysql"

# MySQL
BINARY_LOG_RETENTION_DAYS="14"           # ← RETENCIÓN DE 14 DÍAS
MAX_BINLOG_SIZE="100M"
MYSQL_USER="root"
MYSQL_PASSWORD="mysql1122"

# Monitoreo
THRESHOLD_CPU="80"
THRESHOLD_MEMORY="85"
THRESHOLD_DISK="80"

# Frecuencias
MYSQL_CLEANUP_FREQUENCY="6"             # Cada 6 horas
ALERT_FREQUENCY="5"                      # Cada 5 minutos
PERFORMANCE_CHECK_FREQUENCY="1"          # Cada hora

# Horarios
DAILY_REPORT_HOUR="6"                    # 6:00 AM
WEEKLY_MAINTENANCE_HOUR="3"              # 3:00 AM
WEEKLY_MAINTENANCE_DAY="0"               # Domingo
```

## 🔧 **FUNCIONALIDADES IMPLEMENTADAS**

### **✅ Sistema de Monitoreo:**
- Monitoreo de CPU, memoria, disco y MySQL
- Alertas automáticas por WhatsApp
- Limpieza automática de logs binarios (14 días)
- Reportes diarios y semanales

### **✅ Configuración MySQL:**
- Retención de logs binarios: **14 días** (configurable)
- Compresión de transacciones activada
- Buffer pool optimizado
- Logs de consultas lentas

### **✅ Automatización:**
- Servicios systemd para monitoreo continuo
- Cron jobs para tareas programadas
- Rotación automática de logs
- Mantenimiento semanal automático

## 📊 **MONITOREO AUTOMÁTICO**

### **Frecuencias Configuradas:**
- **Cada 5 minutos:** Verificación de alertas
- **Cada hora:** Verificación de performance
- **Cada 6 horas:** Limpieza de logs binarios MySQL
- **Diario (6:00 AM):** Reporte de estado
- **Semanal (Domingo 3:00 AM):** Mantenimiento completo

### **Umbrales de Alerta:**
- **CPU:** >80% (configurable)
- **Memoria:** >85% (configurable)
- **Disco:** >80% (configurable)
- **MySQL:** >50GB (configurable)

## 🚨 **SISTEMA DE ALERTAS**

### **Alertas por WhatsApp:**
- Notificaciones automáticas cuando se superan umbrales
- Incluye información del servidor y métricas
- Configurable por número de administrador

### **Logs de Alerta:**
- Todas las alertas se registran en `/var/log/watoolx/`
- Rotación automática cada 30 días
- Compresión automática de logs antiguos

## 🐬 **OPTIMIZACIÓN MYSQL**

### **Configuración Automática:**
```ini
[mysqld]
# Logs binarios (14 días)
expire_logs_days = 14
max_binlog_size = 100M
binlog_expire_logs_seconds = 1209600

# Performance
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_log_buffer_size = 64M

# Compresión
innodb_compression_pad_pct_max = 50
innodb_compression_level = 6
```

## 📁 **ESTRUCTURA DE DIRECTORIOS**

```
/home/sturt-wha-icket/
├── scripts/
│   ├── watoolx-monitoring.conf          # Configuración
│   ├── install-monitoring-system-v2.sh  # Instalador
│   ├── configure-monitoring.sh          # Configurador
│   ├── monitor-performance.sh           # Monitoreo
│   ├── mysql-disk-monitor.sh            # MySQL
│   └── send-whatsapp-alert.sh           # Alertas
├── backups/
│   └── mysql/                           # Backups MySQL
└── logs/
    └── watoolx/                         # Logs del sistema
```

## 🛠️ **COMANDOS ÚTILES**

### **Ver Estado del Sistema:**
```bash
# Estado de servicios
systemctl status watoolx-*

# Logs en tiempo real
journalctl -u watoolx-performance-monitor -f
journalctl -u watoolx-mysql-monitor -f

# Ver logs del sistema
tail -f /var/log/watoolx/watoolx-monitoring.log
```

### **Operaciones Manuales:**
```bash
# Limpieza manual de logs binarios
./mysql-disk-monitor.sh cleanup

# Reporte de estado
./mysql-disk-monitor.sh report

# Mantenimiento manual
./mysql-disk-monitor.sh maintenance
```

### **Configuración:**
```bash
# Editar configuración
nano watoolx-monitoring.conf

# Configurar interactivamente
./configure-monitoring.sh

# Ver configuración actual
source watoolx-monitoring.conf && show_config
```

## 🔍 **VERIFICACIÓN DE INSTALACIÓN**

### **Verificar Servicios:**
```bash
# Verificar que todos los servicios estén activos
systemctl is-active watoolx-performance-monitor
systemctl is-active watoolx-mysql-monitor
systemctl is-enabled watoolx-daily-maintenance.timer

# Verificar archivos de configuración
ls -la /etc/systemd/system/watoolx-*
ls -la /etc/cron.d/watoolx-monitoring
ls -la /etc/logrotate.d/watoolx
```

### **Verificar MySQL:**
```bash
# Conectar y verificar configuración
mysql -u root -p -e "SHOW VARIABLES LIKE 'log_bin%';"
mysql -u root -p -e "SHOW VARIABLES LIKE 'expire_logs_days';"
mysql -u root -p -e "SHOW VARIABLES LIKE 'innodb_compression%';"
```

## 📈 **MONITOREO Y MANTENIMIENTO**

### **Reportes Automáticos:**
- **Diario:** Estado del sistema, uso de recursos
- **Semanal:** Limpieza completa, optimización MySQL
- **Mensual:** Rotación de logs, compresión

### **Métricas Monitoreadas:**
- Uso de CPU y memoria
- Espacio en disco
- Tamaño de base de datos MySQL
- Estado de servicios
- Logs de errores

## 🚨 **SOLUCIÓN DE PROBLEMAS**

### **Servicio no inicia:**
```bash
# Ver logs del servicio
journalctl -u watoolx-performance-monitor --since "1 hour ago"

# Verificar permisos
ls -la /home/sturt-wha-icket/scripts/

# Reiniciar servicio
systemctl restart watoolx-performance-monitor
```

### **MySQL no responde:**
```bash
# Verificar estado
systemctl status mysql

# Ver logs
tail -f /var/log/mysql/error.log

# Reiniciar si es necesario
systemctl restart mysql
```

### **Alertas no funcionan:**
```bash
# Verificar token de WhatsApp
cat /home/sturt-wha-icket/.whatsapp-token

# Ver logs de alertas
tail -f /var/log/watoolx/watoolx-alerts.log

# Probar alerta manual
./send-whatsapp-alert.sh send "TEST" "Prueba de alerta"
```

## 🔄 **ACTUALIZACIONES**

### **Actualizar Configuración:**
```bash
# Editar archivo de configuración
nano watoolx-monitoring.conf

# Reconfigurar interactivamente
./configure-monitoring.sh

# Reiniciar servicios
systemctl restart watoolx-*
```

### **Actualizar Scripts:**
```bash
# Hacer backup de configuración
cp watoolx-monitoring.conf watoolx-monitoring.conf.backup

# Actualizar scripts
git pull origin main

# Restaurar configuración personalizada
cp watoolx-monitoring.conf.backup watoolx-monitoring.conf
```

## 📞 **SOPORTE**

### **Logs Importantes:**
- `/var/log/watoolx/watoolx-monitoring.log` - Log principal
- `/var/log/watoolx/watoolx-performance.log` - Performance
- `/var/log/watoolx/watoolx-mysql.log` - MySQL
- `/var/log/watoolx/watoolx-alerts.log` - Alertas

### **Archivos de Configuración:**
- `/etc/systemd/system/watoolx-*.service` - Servicios
- `/etc/cron.d/watoolx-monitoring` - Tareas cron
- `/etc/logrotate.d/watoolx` - Rotación de logs

## 🎯 **PRÓXIMAS MEJORAS**

### **Versión 2.1:**
- Dashboard web de monitoreo
- Alertas por email configuradas
- Métricas históricas y gráficos
- API REST para consultas

### **Versión 2.2:**
- Monitoreo de múltiples servidores
- Backup automático de configuraciones
- Integración con sistemas de tickets
- Reportes personalizables

---

## ✅ **RESUMEN DE CAMBIOS v2.0**

1. **✅ Variables dinámicas** - No más valores hardcodeados
2. **✅ Configuración 14 días** - Logs binarios MySQL
3. **✅ Compresión activada** - Transacciones MySQL
4. **✅ Scripts limpios** - Eliminados duplicados y problemáticos
5. **✅ Configurador interactivo** - Fácil personalización
6. **✅ Documentación completa** - Guía paso a paso
7. **✅ Validación automática** - Verificación de configuración
8. **✅ Reportes detallados** - Instalación y estado

**🎉 ¡Sistema completamente reordenado y listo para producción!**
