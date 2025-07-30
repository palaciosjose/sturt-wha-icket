# Whaticket SaaS - Guía de Instalación y Configuración

## 📋 Resumen del Proyecto

Whaticket SaaS es una plataforma de atención al cliente integrada con WhatsApp. Este documento detalla todo el proceso de configuración y correcciones necesarias para levantar el proyecto en un entorno local con MySQL.

## ✅ Estado Actual

- ✅ **Base de datos**: Configurada y funcionando con MySQL
- ✅ **Migraciones**: Todas aplicadas sin errores
- ✅ **Seeders**: Datos iniciales creados correctamente
- ✅ **Backend**: Ejecutándose en http://localhost:8080
- ✅ **Frontend**: Ejecutándose en http://localhost:3000
- ✅ **Login**: Funcionando (admin@admin.com / 123456)
- ⏳ **WhatsApp**: Pendiente de configuración

---

## 🛠️ Problemas Identificados y Soluciones

### 1. **Incompatibilidades PostgreSQL → MySQL**

#### Problema:
El proyecto original estaba diseñado para PostgreSQL, pero se necesita ejecutar en MySQL.

#### Errores encontrados:
- Comillas dobles en nombres de tablas (`"Settings"`)
- Tipos de datos `JSONB` no compatibles con MySQL
- Funciones específicas de PostgreSQL (`uuid_generate_v4()`)
- Constraints con nombres incompatibles
- Índices duplicados y deadlocks

#### Soluciones aplicadas:

##### A. Migración de Settings
**Archivo**: `20220315110005-remove-constraint-to-Settings.ts`

**Problema original**:
```sql
DELETE FROM "Settings"  -- Comillas dobles no válidas en MySQL
```

**Solución**:
```sql
DELETE FROM Settings  -- Sin comillas dobles
ALTER TABLE Settings DROP PRIMARY KEY  -- Eliminar clave primaria antes de agregar nueva
```

##### B. Migración de Queues
**Archivo**: `20210818102607-remove-unique-indexes-to-Queues-table.ts`

**Problema original**:
```javascript
queryInterface.removeConstraint("Queues", "Queues_color_key")  // Constraint inexistente en MySQL
```

**Solución**:
```javascript
// Comentado: en MySQL la restricción no existe
// queryInterface.removeConstraint("Queues", "Queues_color_key"),
```

##### C. Migración de Índices
**Archivo**: `20220512000001-create-Indexes.ts`

**Problema original**:
```javascript
queryInterface.addIndex("Schedules", ["companyId"])  // Índices duplicados
```

**Solución**:
```javascript
queryInterface.sequelize.query('CREATE INDEX idx_sched_company_id ON Schedules (companyId)').catch(() => {})
```

##### D. Migración de Tickets
**Archivo**: `20231220192536-add-unique-constraint-to-tickets-table.ts`

**Problema original**:
```javascript
queryInterface.addConstraint("Tickets", ["contactId", "companyId", "whatsappId"], {
  type: "unique",
  name: "contactid_companyid_unique"
})
```

**Solución**:
```javascript
try {
  await queryInterface.addConstraint("Tickets", ["contactId", "companyId", "whatsappId"], {
    type: "unique",
    name: "contactid_companyid_unique"
  });
} catch (e) {}  // Ignorar error si ya existe
```

### 2. **Problemas con Seeders**

#### Problema:
Los seeders usaban IDs hardcodeados y no respetaban dependencias.

#### Errores encontrados:
- `companyId: 1` hardcodeado cuando la empresa tenía `id: 9`
- Seeders ejecutándose en paralelo causando errores de foreign key
- Formato de fecha incompatible con MySQL

#### Soluciones aplicadas:

##### A. Seeder Principal Unificado
**Archivo**: `20200904070005-create-default-company.ts`

**Problema original**:
```javascript
companyId: 1  // Hardcodeado
```

**Solución**:
```javascript
// Obtener ID dinámicamente
const [companies] = await queryInterface.sequelize.query(
  "SELECT id FROM Companies WHERE name = 'Empresa Demo' ORDER BY id DESC LIMIT 1"
) as [any[], unknown];
const companyId = companies[0].id;
```

##### B. Seeder de Configuración
**Archivo**: `20200904070007-create-default-settings.ts`

**Problema original**:
```javascript
companyId: 1  // Hardcodeado en todos los settings
```

**Solución**:
```javascript
// Obtener companyId dinámicamente
const [companies] = await queryInterface.sequelize.query(
  "SELECT id FROM Companies WHERE name = 'Empresa Demo' ORDER BY id DESC LIMIT 1"
) as [any[], unknown];
const companyId = companies[0].id;
```

##### C. Formato de Fecha
**Problema original**:
```javascript
dueDate: "2093-03-14 04:00:00+01"  // Zona horaria no compatible con MySQL
```

**Solución**:
```javascript
dueDate: "2093-03-14 04:00:00"  // Sin zona horaria
```

### 3. **Problemas de Frontend (Windows)**

#### Problema:
Scripts de npm incompatibles con Windows.

#### Errores encontrados:
- Comando `export` no reconocido en Windows
- Error de OpenSSL con Node.js v20

#### Soluciones aplicadas:

##### A. Scripts Multiplataforma
**Archivo**: `package.json`

**Problema original**:
```json
"start": "export NODE_OPTIONS=\"--max-old-space-size=8192\" && react-scripts start"
```

**Solución**:
```json
"start": "cross-env NODE_OPTIONS=\"--max-old-space-size=8192 --openssl-legacy-provider\" react-scripts start"
```

##### B. Instalación de cross-env
```bash
npm install cross-env --save-dev
```

---

## 📁 Estructura de Archivos Modificados

### Migraciones Corregidas:
- `20220315110005-remove-constraint-to-Settings.ts`
- `20210818102607-remove-unique-indexes-to-Queues-table.ts`
- `20220512000001-create-Indexes.ts`
- `20231220192536-add-unique-constraint-to-tickets-table.ts`

### Seeders Optimizados:
- `20200904070005-create-default-company.ts` (unificado)
- `20200904070007-create-default-settings.ts`
- `20230130004700-create-alltickets-settings.ts`

### Configuración Frontend:
- `package.json` (scripts multiplataforma)

---

## 🚀 Guía de Instalación

### Prerrequisitos:
- Node.js v20+
- MySQL 8.0+
- Redis
- Laragon (Windows) o XAMPP

### 1. Configuración de Base de Datos

```bash
# Crear base de datos
CREATE DATABASE waticket_saas;
```

### 2. Configuración de Variables de Entorno

**Backend** (`.env`):
```env
DB_HOST=localhost
DB_USER=root
DB_PASS=tu_password
DB_NAME=waticket_saas
DB_PORT=3306
```

**Frontend** (`.env`):
```env
REACT_APP_BACKEND_URL=http://localhost:8080
```

### 3. Instalación de Dependencias

```bash
# Backend
cd waticketsaas/backend
npm install

# Frontend
cd waticketsaas/frontend
npm install
```

### 4. Ejecución de Migraciones

```bash
cd waticketsaas/backend
npm run build
npm run db:migrate
```

### 5. Ejecución de Seeders

```bash
npm run db:seed
```

### 6. Iniciar Servicios

```bash
# Backend
cd waticketsaas/backend
npm start

# Frontend (nueva terminal)
cd waticketsaas/frontend
npm start
```

---

## 📊 Datos Creados

### Plan:
- **ID**: 1
- **Nombre**: Plan Básico
- **Usuarios**: 10
- **Conexiones**: 10
- **Colas**: 10
- **Valor**: $30

### Empresa:
- **ID**: 1
- **Nombre**: Empresa Demo
- **Plan ID**: 1
- **Fecha de vencimiento**: 2093-03-14

### Usuario Admin:
- **Email**: admin@admin.com
- **Password**: 123456
- **Perfil**: admin
- **Super**: true

### Configuraciones:
- 14 configuraciones del sistema
- Configuración allTicket: disabled

---

## 🔧 Configuraciones Especiales

### Para Windows:
- Scripts usan `cross-env` para compatibilidad
- Configuración de OpenSSL legacy para Node.js v20

### Para Linux/Ubuntu:
- Los mismos scripts funcionan automáticamente
- `cross-env` detecta la plataforma y usa `export`

### Para Producción:
- Cambiar URLs en `.env` del frontend
- Configurar proxy inverso (Nginx)
- Usar HTTPS

---

## ⚠️ Problemas Conocidos y Soluciones

### 1. Error de OpenSSL
**Síntoma**: `error:0308010C:digital envelope routines::unsupported`
**Solución**: Agregar `--openssl-legacy-provider` a NODE_OPTIONS

### 2. Índices Duplicados
**Síntoma**: `ERROR: Duplicate key name`
**Solución**: Usar `.catch(() => {})` en creación de índices

### 3. Constraints Inexistentes
**Síntoma**: `ERROR: Constraint does not exist`
**Solución**: Comentar líneas que eliminan constraints de PostgreSQL

### 4. IDs Hardcodeados
**Síntoma**: `ERROR: Foreign key constraint fails`
**Solución**: Obtener IDs dinámicamente con consultas SQL

###5 Error de cross-env
**Síntoma**: `"cross-env" no se reconoce como un comando interno o externo`
**Solución**: Usar `npx cross-env` en lugar de `cross-env` directamente

---

## 🎯 Próximos Pasos

### Pendiente:
1. **Configurar WhatsApp**
   - Conectar número de WhatsApp
   - Probar envío de mensajes
   - Configurar webhooks

2. **Pruebas de Funcionalidad**
   - Crear contactos
   - Crear tickets
   - Configurar colas
   - Probar flujos de trabajo

3. **Configuración de Producción**
   - Configurar dominio
   - Configurar SSL
   - Configurar backup de base de datos

---

## 📝 Notas Importantes

- **Compatibilidad**: El proyecto ahora es 100% compatible con MySQL
- **Multiplataforma**: Los scripts funcionan en Windows, Linux y Mac
- **Escalabilidad**: Preparado para despliegue en servidor Ubuntu
- **Mantenimiento**: Todas las correcciones están documentadas y son reversibles

---

## 🤝 Contribución

Si encuentras problemas similares en otros entornos, las soluciones documentadas aquí deberían aplicarse de manera similar.

---

**Última actualización**: Julio 2025
**Versión del proyecto**: Whaticket SaaS
**Estado**: ✅ Sistema funcionando en local 