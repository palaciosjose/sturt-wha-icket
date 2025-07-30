# WATICKET SAAS - DESARROLLO LOCAL

## 📋 Requisitos Previos

### Software Necesario
- **Laragon** (con MySQL y Redis)
- **Node.js** (versión 16 o superior)
- **npm** (incluido con Node.js)

### Configuración de Laragon
1. Descargar e instalar [Laragon](https://laragon.org/)
2. Iniciar Laragon
3. Activar MySQL y Redis desde el panel de Laragon
4. Verificar que MySQL esté en puerto 3306 y Redis en puerto 6379

## 🚀 Instalación Rápida

### Opción 1: Script Automático (Recomendado)
```bash
# Ejecutar el script de instalación
install-local.bat
```

### Opción 2: Instalación Manual

#### 1. Configurar Variables de Entorno
```bash
# Backend
cp backend/env.example backend/.env

# Frontend  
cp frontend/env.example frontend/.env
```

#### 2. Crear Base de Datos
1. Abrir phpMyAdmin: http://localhost/phpmyadmin
2. Crear nueva base de datos: `waticket_saas`
3. Usuario: `root`
4. Password: (vacío)

#### 3. Instalar Dependencias
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

#### 4. Ejecutar Migraciones
```bash
cd backend
npm run db:migrate
```

## 🏃‍♂️ Iniciar el Proyecto

### Opción 1: Script Automático
```bash
start-local.bat
```

### Opción 2: Manual
```bash
# Terminal 1 - Backend
cd backend
npm run dev:server

# Terminal 2 - Frontend
cd frontend
npm start
```

## 🌐 URLs de Acceso

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **phpMyAdmin**: http://localhost/phpmyadmin

## 🔑 Credenciales por Defecto

- **Usuario**: admin@admin.com
- **Password**: 123456

## 📁 Estructura del Proyecto

```
waticketsaas/
├── backend/          # API Node.js + TypeScript
├── frontend/         # React + Material-UI
├── install-local.bat # Script de instalación
├── start-local.bat   # Script de inicio
└── README-LOCAL.md   # Esta documentación
```

## 🔧 Configuración de Variables de Entorno

### Backend (.env)
```env
NODE_ENV=development
PORT=8080
FRONTEND_URL=http://localhost:3000

# MySQL (Laragon)
DB_DIALECT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=waticket_saas
DB_USER=root
DB_PASS=
DB_DEBUG=true

# Redis (Laragon)
REDIS_URI=redis://localhost:6379

# JWT
JWT_SECRET=waticket_saas_jwt_secret_2024
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=http://localhost:8080
```

## 🐛 Solución de Problemas

### Error: "Cannot connect to MySQL"
- Verificar que Laragon esté ejecutándose
- Verificar que MySQL esté activo en Laragon
- Verificar credenciales en .env

### Error: "Cannot connect to Redis"
- Verificar que Redis esté activo en Laragon
- Verificar URL de Redis en .env

### Error: "Port already in use"
- Verificar que no haya otros servicios en puertos 3000 o 8080
- Cambiar puertos en .env si es necesario

### Error: "Module not found"
- Ejecutar `npm install` en backend y frontend
- Verificar que Node.js esté actualizado

## 📝 Notas Importantes

- **Siempre iniciar Laragon antes del proyecto**
- **Verificar que MySQL y Redis estén activos**
- **El backend debe iniciarse antes que el frontend**
- **Las migraciones se ejecutan automáticamente en la primera instalación**

## 🆘 Soporte

Si encuentras problemas:
1. Verificar que Laragon esté ejecutándose
2. Verificar conexión a MySQL y Redis
3. Revisar logs en las terminales
4. Verificar archivos .env 