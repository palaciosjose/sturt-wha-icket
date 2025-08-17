#!/bin/bash

# ⚠️ SCRIPT DE EMERGENCIA - LIMPIEZA AGRESIVA MYSQL
# 🚨 SOLO USAR EN CASOS CRÍTICOS DE DISCO LLENO

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║                EMERGENCY MYSQL CLEANUP                      ║${NC}"
echo -e "${RED}║                        🚨 CRÍTICO                          ║${NC}"
echo -e "${RED}║                    LIMPIEZA AGRESIVA                        ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"

# Verificar espacio antes
echo -e "${YELLOW}📊 ESPACIO ANTES DE LA LIMPIEZA:${NC}"
df -h /

echo -e "${YELLOW}🗄️  MYSQL ANTES:${NC}"
du -sh /var/lib/mysql/

echo ""
echo -e "${RED}⚠️  INICIANDO LIMPIEZA AGRESIVA...${NC}"
echo ""

# 1. PARAR MYSQL TEMPORALMENTE
echo -e "${BLUE}🔄 Parando MySQL...${NC}"
systemctl stop mysql

# 2. ELIMINAR LOGS BINARIOS ANTIGUOS COMPLETAMENTE
echo -e "${BLUE}🗑️  Eliminando logs binarios antiguos...${NC}"
cd /var/lib/mysql/
rm -f binlog.*[0-9][0-9][0-9]
rm -f binlog.*[0-9][0-9][0-9][0-9]
rm -f binlog.*[0-9][0-9][0-9][0-9][0-9]

# 3. ELIMINAR ARCHIVOS TEMPORALES
echo -e "${BLUE}🧹 Limpiando archivos temporales...${NC}"
rm -f /var/lib/mysql/ib_logfile*
rm -f /var/lib/mysql/ibdata*
rm -f /var/lib/mysql/#innodb_temp/*
rm -f /var/lib/mysql/#innodb_redo/*

# 4. LIMPIAR LOGS DEL SISTEMA
echo -e "${BLUE}📝 Limpiando logs del sistema...${NC}"
find /var/log -name "*.log" -size +100M -delete 2>/dev/null || true
find /var/log -name "*.gz" -size +100M -delete 2>/dev/null || true

# 5. LIMPIAR CACHE Y TEMPORALES
echo -e "${BLUE}💾 Limpiando cache...${NC}"
apt clean
rm -rf /var/cache/apt/archives/*
rm -rf /tmp/*
rm -rf /var/tmp/*

# 6. REINICIAR MYSQL
echo -e "${BLUE}🔄 Reiniciando MySQL...${NC}"
systemctl start mysql

# 7. VERIFICAR ESPACIO DESPUÉS
echo ""
echo -e "${GREEN}📊 ESPACIO DESPUÉS DE LA LIMPIEZA:${NC}"
df -h /

echo -e "${GREEN}🗄️  MYSQL DESPUÉS:${NC}"
du -sh /var/lib/mysql/

# 8. CALCULAR ESPACIO LIBERADO
echo ""
echo -e "${GREEN}🎉 LIMPIEZA COMPLETADA${NC}"
echo -e "${GREEN}✅ Verifica el espacio liberado arriba${NC}"

# 9. RECOMENDACIONES
echo ""
echo -e "${YELLOW}💡 RECOMENDACIONES:${NC}"
echo -e "${YELLOW}   1. Configura rotación de logs en MySQL${NC}"
echo -e "${YELLOW}   2. Establece límites de tamaño para binlogs${NC}"
echo -e "${YELLOW}   3. Monitorea el espacio regularmente${NC}"
echo -e "${YELLOW}   4. Considera usar el script automático mejorado${NC}"
