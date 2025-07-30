#!/bin/bash

# ========================================
# CONFIGURADOR DE PRODUCCIÓN - WHATICKET SAAS
# ========================================
# Script para configurar el proyecto para VPS
# Autor: Asistente IA
# Fecha: $(date)
# ========================================

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "========================================"
echo "  CONFIGURADOR DE PRODUCCIÓN"
echo "  WHATICKET SAAS v10.9.0"
echo "========================================"
echo -e "${NC}"

# ========================================
# 1. CONFIGURAR VARIABLES DE ENTORNO
# ========================================
echo -e "\n${BLUE}⚙️  CONFIGURANDO VARIABLES DE ENTORNO${NC}"

# Solicitar información del usuario
echo -e "${YELLOW}Ingresa la información para producción:${NC}"

read -p "Dominio principal (ej: miempresa.com): " DOMAIN
read -p "Subdominio API (ej: api.miempresa.com): " API_DOMAIN
read -p "Usuario de base de datos: " DB_USER
read -p "Password de base de datos: " DB_PASS
read -p "JWT Secret (mínimo 32 caracteres): " JWT_SECRET

# Validar JWT_SECRET
if [ ${#JWT_SECRET} -lt 32 ]; then
    echo -e "${RED}❌ JWT_SECRET debe tener al menos 32 caracteres${NC}"
    exit 1
fi

# Generar JWT_SECRET si está vacío
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    echo -e "${GREEN}✅ JWT_SECRET generado automáticamente${NC}"
fi

# ========================================
# 2. CONFIGURAR BACKEND
# ========================================
echo -e "\n${BLUE}🔧 CONFIGURANDO BACKEND${NC}"

# Crear archivo .env del backend
cat > backend/.env << EOF
NODE_ENV=production
PORT=8080
FRONTEND_URL=https://$DOMAIN

# Base de datos MySQL
DB_DIALECT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=waticket_saas
DB_USER=$DB_USER
DB_PASS=$DB_PASS

# Configuración de logging
DB_DEBUG=false
LOG_LEVEL=info

# Redis
REDIS_URI=redis://localhost:6379
REDIS_OPT_LIMITER_MAX=1
REDIS_OPT_LIMITER_DURATION=3000

# JWT
JWT_SECRET=$JWT_SECRET

# Sentry (opcional)
SENTRY_DSN=

# Upload
UPLOAD_DIR=./public/uploads
EOF

echo -e "${GREEN}✅ Archivo backend/.env configurado${NC}"

# ========================================
# 3. CONFIGURAR FRONTEND
# ========================================
echo -e "\n${BLUE}🎨 CONFIGURANDO FRONTEND${NC}"

# Crear archivo .env del frontend
cat > frontend/.env << EOF
REACT_APP_BACKEND_URL=https://$API_DOMAIN
EOF

echo -e "${GREEN}✅ Archivo frontend/.env configurado${NC}"

# ========================================
# 4. OPTIMIZAR ECOSYSTEM.CONFIG.JS
# ========================================
echo -e "\n${BLUE}⚡ OPTIMIZANDO CONFIGURACIÓN PM2${NC}"

# Crear ecosystem.config.js optimizado
cat > backend/ecosystem.config.js << EOF
module.exports = [{
  script: 'dist/server.js',
  name: 'waticket-backend',
  exec_mode: 'cluster',
  instances: 'max',
  max_memory_restart: '1G',
  node_args: '--max-old-space-size=1024',
  watch: false,
  cron_restart: '05 00 * * *',
  env: {
    NODE_ENV: 'production',
    PORT: 8080
  },
  error_file: './logs/err.log',
  out_file: './logs/out.log',
  log_file: './logs/combined.log',
  time: true
}]
EOF

echo -e "${GREEN}✅ Archivo ecosystem.config.js optimizado${NC}"

# ========================================
# 5. CREAR DIRECTORIOS DE LOGS
# ========================================
echo -e "\n${BLUE}📝 CREANDO DIRECTORIOS DE LOGS${NC}"

mkdir -p backend/logs
mkdir -p frontend/logs

echo -e "${GREEN}✅ Directorios de logs creados${NC}"

# ========================================
# 6. CONFIGURAR NGINX
# ========================================
echo -e "\n${BLUE}🌐 CONFIGURANDO NGINX${NC}"

# Crear configuración de Nginx para backend
sudo tee /etc/nginx/sites-available/waticket-backend << EOF
server {
    server_name $API_DOMAIN;
    
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # Configuración para WebSocket
    location /socket.io/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Crear configuración de Nginx para frontend
sudo tee /etc/nginx/sites-available/waticket-frontend << EOF
server {
    server_name $DOMAIN;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Configuración para archivos estáticos
    location /static/ {
        alias /home/deploy/waticketsaas/frontend/build/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Habilitar sitios
sudo ln -sf /etc/nginx/sites-available/waticket-backend /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/waticket-frontend /etc/nginx/sites-enabled/

# Verificar configuración de Nginx
sudo nginx -t

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Configuración de Nginx válida${NC}"
    sudo systemctl reload nginx
else
    echo -e "${RED}❌ Error en configuración de Nginx${NC}"
    exit 1
fi

# ========================================
# 7. CONFIGURAR SSL CON LET'S ENCRYPT
# ========================================
echo -e "\n${BLUE}🔒 CONFIGURANDO SSL${NC}"

# Verificar si Certbot está instalado
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}⚠️  Instalando Certbot...${NC}"
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
fi

# Obtener certificados SSL
echo -e "${YELLOW}⚠️  Obteniendo certificados SSL...${NC}"
sudo certbot --nginx -d $DOMAIN -d $API_DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Certificados SSL configurados${NC}"
else
    echo -e "${YELLOW}⚠️  No se pudieron obtener certificados SSL automáticamente${NC}"
    echo -e "${YELLOW}⚠️  Configura manualmente con: sudo certbot --nginx -d $DOMAIN -d $API_DOMAIN${NC}"
fi

# ========================================
# 8. CONFIGURAR FIREWALL
# ========================================
echo -e "\n${BLUE}🛡️  CONFIGURANDO FIREWALL${NC}"

# Configurar UFW
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3306/tcp
sudo ufw allow 6379/tcp

# Habilitar firewall
echo -e "${YELLOW}⚠️  Habilitando firewall...${NC}"
sudo ufw --force enable

echo -e "${GREEN}✅ Firewall configurado${NC}"

# ========================================
# 9. CONFIGURAR BACKUPS
# ========================================
echo -e "\n${BLUE}💾 CONFIGURANDO BACKUPS${NC}"

# Crear script de backup
cat > backup_waticket.sh << EOF
#!/bin/bash

# Script de backup para Whaticket SaaS
BACKUP_DIR="/home/deploy/backups"
DATE=\$(date +%Y%m%d_%H%M%S)
DB_NAME="waticket_saas"

# Crear directorio de backups
mkdir -p \$BACKUP_DIR

# Backup de base de datos
mysqldump -u $DB_USER -p$DB_PASS \$DB_NAME > \$BACKUP_DIR/waticket_db_\$DATE.sql

# Backup de archivos
tar -czf \$BACKUP_DIR/waticket_files_\$DATE.tar.gz /home/deploy/waticketsaas/public/uploads

# Mantener solo los últimos 7 backups
find \$BACKUP_DIR -name "waticket_*" -mtime +7 -delete

echo "Backup completado: \$DATE"
EOF

chmod +x backup_waticket.sh

# Agregar a crontab (backup diario a las 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /home/deploy/waticketsaas/backup_waticket.sh") | crontab -

echo -e "${GREEN}✅ Sistema de backups configurado${NC}"

# ========================================
# 10. CONFIGURAR MONITOREO
# ========================================
echo -e "\n${BLUE}📊 CONFIGURANDO MONITOREO${NC}"

# Crear script de monitoreo
cat > monitor_waticket.sh << EOF
#!/bin/bash

# Script de monitoreo para Whaticket SaaS
LOG_FILE="/home/deploy/waticketsaas/logs/monitor.log"

# Verificar servicios
check_service() {
    local service=\$1
    local port=\$2
    
    if netstat -tuln | grep -q ":\$port"; then
        echo "\$(date): ✅ \$service está funcionando (puerto \$port)" >> \$LOG_FILE
    else
        echo "\$(date): ❌ \$service NO está funcionando (puerto \$port)" >> \$LOG_FILE
    fi
}

# Verificar servicios
check_service "Backend" 8080
check_service "Frontend" 3000
check_service "MySQL" 3306
check_service "Redis" 6379

# Verificar uso de memoria
MEMORY_USAGE=\$(free -m | awk 'NR==2{printf "%.2f%%", \$3*100/\$2 }')
echo "\$(date): 💾 Uso de memoria: \$MEMORY_USAGE" >> \$LOG_FILE

# Verificar uso de disco
DISK_USAGE=\$(df -h | awk '\$NF=="/"{printf "%s", \$5}')
echo "\$(date): 💿 Uso de disco: \$DISK_USAGE" >> \$LOG_FILE
EOF

chmod +x monitor_waticket.sh

# Agregar a crontab (monitoreo cada 5 minutos)
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/deploy/waticketsaas/monitor_waticket.sh") | crontab -

echo -e "${GREEN}✅ Sistema de monitoreo configurado${NC}"

# ========================================
# 11. COMPILAR Y EJECUTAR
# ========================================
echo -e "\n${BLUE}🚀 COMPILANDO Y EJECUTANDO${NC}"

# Instalar dependencias
echo -e "${YELLOW}⚠️  Instalando dependencias del backend...${NC}"
cd backend
npm install

echo -e "${YELLOW}⚠️  Compilando backend...${NC}"
npm run build

echo -e "${YELLOW}⚠️  Ejecutando migraciones...${NC}"
npx sequelize db:migrate

echo -e "${YELLOW}⚠️  Ejecutando seeders...${NC}"
npx sequelize db:seed:all

echo -e "${YELLOW}⚠️  Iniciando backend con PM2...${NC}"
pm2 start ecosystem.config.js
pm2 save

cd ../frontend

echo -e "${YELLOW}⚠️  Instalando dependencias del frontend...${NC}"
npm install

echo -e "${YELLOW}⚠️  Compilando frontend...${NC}"
npm run build

echo -e "${YELLOW}⚠️  Iniciando frontend con PM2...${NC}"
pm2 start server.js --name waticket-frontend
pm2 save

# ========================================
# 12. RESUMEN FINAL
# ========================================
echo -e "\n${BLUE}📋 RESUMEN DE CONFIGURACIÓN${NC}"

echo -e "${GREEN}✅ Configuración completada exitosamente${NC}"
echo -e "\n${YELLOW}📊 INFORMACIÓN IMPORTANTE:${NC}"
echo "• Backend: https://$API_DOMAIN"
echo "• Frontend: https://$DOMAIN"
echo "• Base de datos: waticket_saas"
echo "• Usuario admin: admin@admin.com"
echo "• Password admin: 123456"

echo -e "\n${YELLOW}🔧 COMANDOS ÚTILES:${NC}"
echo "• Ver logs: pm2 logs"
echo "• Reiniciar: pm2 restart all"
echo "• Estado: pm2 status"
echo "• Monitoreo: tail -f logs/monitor.log"
echo "• Backup: ./backup_waticket.sh"

echo -e "\n${YELLOW}⚠️  PRÓXIMOS PASOS:${NC}"
echo "1. Configurar WhatsApp en el panel"
echo "2. Crear usuarios adicionales"
echo "3. Configurar departamentos"
echo "4. Probar funcionalidades"
echo "5. Configurar notificaciones"

echo -e "\n${BLUE}========================================"
echo "  CONFIGURACIÓN COMPLETADA"
echo "========================================"
echo -e "${NC}"