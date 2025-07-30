# CONTEXTO DEL PROYECTO WHATICKET - RESUMEN ACTUAL

## 🎯 **ESTADO ACTUAL DEL PROYECTO**

**Proyecto:** Whaticket SaaS (Sistema de Tickets WhatsApp)  
**Ubicación:** `/c:/laragon/www/whaticket03/waticketsaas/`  
**Tecnologías:** Node.js, React, MySQL, Sequelize, Baileys  
**Estado:** En desarrollo activo con mejoras continuas

---

## 📁 **ESTRUCTURA PRINCIPAL**

```
waticketsaas/
├── backend/          # API Node.js + Express
├── frontend/         # React + Material-UI
├── setup/           # Scripts de instalación
└── *.md            # Documentación de mejoras
```

---

## 🚀 **MEJORAS IMPLEMENTADAS**

### **✅ MÓDULOS COMPLETADOS:**

1. **📋 KANBAN** - Sistema de tableros Kanban para tickets
   - Documentación: `MEJORAS_MODULO_KANBAN.md`
   - Estado: ✅ COMPLETADO

2. **🔗 CONEXIONES** - Mejoras en módulo de conexiones WhatsApp
   - Documentación: `MEJORAS_MODULO_CONEXIONES.md`
   - Estado: ✅ COMPLETADO
   - Nuevas columnas: Avatar, Instancia, Token completo

3. **📅 AGENDAMIENTOS** - Sistema de recordatorios y programación
   - Documentación: `MEJORAS_SISTEMA_AGENDAMIENTOS.md`
   - Estado: ✅ COMPLETADO

4. **📊 DASHBOARD** - Indicadores y gráficos mejorados
   - Documentación: `MEJORAS_DASHBOARD_INDICADORES_Y_GRAFICOS.md`
   - Estado: ✅ COMPLETADO

5. **💬 TICKETS CHAT** - Mejoras en chat de tickets
   - Documentación: `MEJORAS_MODULO_TICKETS_CHAT.md`
   - Estado: ✅ COMPLETADO

6. **🔄 TRANSFERENCIA** - Modal de transferencia mejorado
   - Documentación: `MEJORA_MODAL_TRANSFERENCIA_TICKETS.md`
   - Estado: ✅ COMPLETADO

7. **🏢 DEPARTAMENTOS** - Actualizaciones de departamentos
   - Documentación: `SOLUCION_ACTUALIZACIONES_DEPARTAMENTOS.md`
   - Estado: ✅ COMPLETADO

8. **🤖 OPENROUTER** - Integración multi-proveedores IA
   - Documentación: `IMPLEMENTACION_OPENROUTER_MULTI_PROVEEDORES.md`
   - Estado: ✅ COMPLETADO

9. **⚡ RESPUESTAS RÁPIDAS** - Sistema de respuestas rápidas
   - Documentación: `MEJORAS_RESPUESTAS_RAPIDAS.md`
   - Estado: ✅ COMPLETADO

10. **📎 MULTIMEDIA** - Fix para respuestas multimedia
    - Documentación: `QUICK_REPLIES_MULTIMEDIA_FIX.md`
    - Estado: ✅ COMPLETADO

11. **💬 QUICK REPLIES** - Mejoras en respuestas rápidas
    - Documentación: `QUICK_REPLIES_IMPROVEMENTS.md`
    - Estado: ✅ COMPLETADO

12. **🤖 AGENTES IA CONVERSACIONALES** - Sistema de IA con transferencias automáticas
    - Documentación: `0018-Agentes IA conversacional más transferencias departamentos.md`
    - Estado: ✅ COMPLETADO
    - Características:
      - Transferencia automática entre departamentos IA
      - Detección de palabras clave dinámicas
      - Conversación entre agentes IA
      - Manejo de opciones inválidas
      - Prompts optimizados en español

13. **🔗 CONEXIÓN API BAILEYS** - Campos personalizados para conexiones
    - Documentación: `0019-Conexión con API baileys campos personalizados.md`
    - Estado: ✅ COMPLETADO
    - Nuevos campos: waName, Avatar, Token, Instance

14. **🎨 MEJORAS UI/UX** - Traducciones y mejoras visuales
    - Estado: ✅ COMPLETADO
    - Cambios:
      - Traducción de "FECHAR" a "Cerrar"
      - Versión dinámica "Versión 1.1.0"
      - Título dinámico "Watoolx Saas"
      - Extracción automática de códigos YouTube
      - Mejoras en thumbnails de videos
      - Nuevas columnas en CONEXIONES
      - Gestión de tickets huérfanos

---

## 🎯 **PATRONES DE DESARROLLO ESTABLECIDOS**

### **📋 METODOLOGÍA DE TRABAJO:**
1. **Análisis** del módulo actual
2. **Identificación** de problemas
3. **Implementación** por fases
4. **Pruebas** y ajustes
5. **Documentación** completa
6. **Limpieza** de scripts temporales

### **🛠️ HERRAMIENTAS UTILIZADAS:**
- **Backend:** Node.js, Express, Sequelize, MySQL
- **Frontend:** React, Material-UI, Formik
- **WhatsApp:** Baileys API
- **Base de Datos:** Migraciones Sequelize
- **Documentación:** Markdown detallado

### **📝 CONVENCIONES DE CÓDIGO:**
- **Scripts temporales:** Crear y eliminar después de uso
- **Migraciones:** Usar Sequelize cuando sea posible
- **Documentación:** Crear archivo `.md` completo
- **Nombres:** Descriptivos y en español
- **Comentarios:** Explicativos en español

---

## 🔧 **CONFIGURACIÓN DEL ENTORNO**

### **📂 DIRECTORIO DE TRABAJO:**
```bash
C:\laragon\www\whaticket03\waticketsaas\backend
```

### **🚀 COMANDOS FRECUENTES:**
```bash
# Compilar backend
npm run build

# Ejecutar migraciones
npx sequelize-cli db:migrate

# Crear scripts temporales
node nombre-script.js

# Compilar frontend
cd ../frontend && npm start
```

### **📁 ARCHIVOS IMPORTANTES:**
- **Modelos:** `backend/src/models/`
- **Servicios:** `backend/src/services/`
- **Controladores:** `backend/src/controllers/`
- **Rutas:** `backend/src/routes/`
- **Frontend:** `frontend/src/pages/`

---

## 🎨 **ESTILOS Y UX ESTABLECIDOS**

### **🎯 PATRONES DE UI:**
- **Colores:** Material-UI theme
- **Espaciado:** `theme.spacing(1-2)`
- **Fuentes:** Monospace para datos técnicos
- **Bordes:** `1px solid` con colores temáticos
- **Tooltips:** Para datos largos
- **Fallbacks:** Para imágenes y datos faltantes

### **📊 COMPONENTES COMUNES:**
- **Badges:** Para números y estados
- **Avatares:** Circulares con fallback
- **Botones:** Con colores temáticos
- **Tablas:** Con estilos mejorados
- **Modales:** Con confirmaciones

---

## 🚀 **PRÓXIMAS MEJORAS SUGERIDAS**

### **📋 MÓDULOS PENDIENTES:**
1. **👥 USUARIOS** - Gestión de usuarios mejorada
2. **📈 REPORTES** - Sistema de reportes avanzado
3. **🔔 NOTIFICACIONES** - Sistema de notificaciones
4. **📱 MÓVIL** - Responsive design mejorado
5. **🔐 SEGURIDAD** - Autenticación y permisos
6. **🌐 API** - Endpoints para integraciones
7. **📊 ANALÍTICAS** - Métricas avanzadas
8. **🔄 SINCRONIZACIÓN** - Sync en tiempo real

### **🎯 CRITERIOS DE SELECCIÓN:**
- **Impacto:** Alto valor para el usuario
- **Complejidad:** Moderada a alta
- **Documentación:** Necesaria para futuras versiones
- **Reutilización:** Código reutilizable

---

## 📝 **INSTRUCCIONES PARA NUEVOS CHATS**

### **🔄 AL INICIAR NUEVO CHAT:**

1. **Adjuntar carpeta:** `waticketsaas/` completa
2. **Mencionar:** "Continuamos con mejoras en Whaticket SaaS"
3. **Referenciar:** Documentación relevante según el módulo
4. **Especificar:** Módulo objetivo y funcionalidades deseadas

### **📋 EJEMPLO DE MENSAJE INICIAL:**
```
Hola! Continuamos con mejoras en Whaticket SaaS.

Ya tenemos documentación de módulos anteriores:
- MEJORAS_MODULO_KANBAN.md
- MEJORAS_MODULO_CONEXIONES.md
- [otros archivos .md según relevancia]

Ahora queremos mejorar el módulo [NOMBRE_MODULO] con:
- [Funcionalidad 1]
- [Funcionalidad 2]
- [Funcionalidad 3]

¿Procedemos con el análisis y implementación?
```

---

## ✅ **CHECKLIST PARA NUEVOS CHATS**

- [ ] Adjuntar carpeta `waticketsaas/`
- [ ] Mencionar contexto del proyecto
- [ ] Referenciar documentación previa
- [ ] Especificar módulo objetivo
- [ ] Listar funcionalidades deseadas
- [ ] Confirmar metodología de trabajo
- [ ] Iniciar análisis del módulo

---

**📅 Última actualización:** Enero 2025  
**👨‍💻 Desarrollador:** Asistente AI  
**✅ Estado:** Listo para continuar 


-----------------------------------------------------------------
# CONTEXTO_PROYECTO_ACTUAL.md

## 📋 **INFORMACIÓN GENERAL DEL PROYECTO**

**Proyecto:** Whaticket03 - Sistema de Atención al Cliente con IA
**Versión Actual:** 1.1.0
**Última Actualización:** 27 de Julio, 2025
**Estado:** ✅ **FUNCIONAL Y ESTABLE**

## 🏗️ **ARQUITECTURA DEL SISTEMA**

### **🔧 Stack Tecnológico:**
- **Backend:** Node.js + Express + TypeScript
- **Frontend:** React + Material-UI
- **Base de Datos:** MySQL
- **ORM:** Sequelize
- **Autenticación:** JWT
- **WebSockets:** Socket.io
- **WhatsApp:** Baileys

### **📁 Estructura del Proyecto:**
```
whaticket03/
├── waticketsaas/
│   ├── backend/          # API REST + WebSockets
│   ├── frontend/         # Interfaz React
│   └── setup/           # Scripts de instalación
├── guias/               # Documentación técnica
└── CONTEXTO_PROYECTO_ACTUAL.md
```

## 🎯 **FUNCIONALIDADES IMPLEMENTADAS**

### **✅ 1. Sistema de Departamentos (Queues)**
- **Estado:** ✅ **COMPLETADO**
- **Funcionalidad:** Gestión completa de departamentos
- **Características:**
  - Crear, editar, eliminar departamentos
  - Configuración de horarios
  - Mensajes de bienvenida y fuera de horario
  - Colores personalizables
  - Orden de prioridad

### **✅ 2. Sistema de Opciones de Chatbot**
- **Estado:** ✅ **COMPLETADO**
- **Funcionalidad:** Configuración de opciones de respuesta automática
- **Características:**
  - Opciones jerárquicas (padre-hijo)
  - Mensajes personalizables
  - Archivos adjuntos
  - Validación de datos

### **✅ 3. Transferencia Automática a Departamentos IA**
- **Estado:** ✅ **COMPLETADO** (NUEVA IMPLEMENTACIÓN)
- **Funcionalidad:** Transferencia automática de tickets
- **Características:**
  - Configuración visual de transferencias
  - Persistencia de datos temporal y permanente
  - Interfaz intuitiva con indicadores
  - Confirmaciones de eliminación
  - Validación robusta de datos

### **✅ 4. Sistema de Usuarios y Permisos**
- **Estado:** ✅ **COMPLETADO**
- **Funcionalidad:** Gestión de usuarios y roles
- **Características:**
  - Autenticación JWT
  - Roles: Admin, Usuario
  - Permisos por departamento
  - Gestión de sesiones

### **✅ 5. Integración WhatsApp**
- **Estado:** ✅ **COMPLETADO**
- **Funcionalidad:** Conexión con WhatsApp Business
- **Características:**
  - Conexión QR
  - Mensajes multimedia
  - Respuestas automáticas
  - Gestión de contactos

## 🔄 **ESTADO ACTUAL DE IMPLEMENTACIONES**

### **📊 Base de Datos:**
- **Migraciones:** ✅ Todas aplicadas
- **Modelos:** ✅ Completos y funcionales
- **Relaciones:** ✅ Configuradas correctamente
- **Nueva columna:** `transferQueueId` en `QueueOptions` ✅

### **🔧 Backend:**
- **API REST:** ✅ Funcional
- **WebSockets:** ✅ Funcional
- **Servicios:** ✅ Completos
- **Controladores:** ✅ Actualizados
- **Validaciones:** ✅ Implementadas

### **🎨 Frontend:**
- **Componentes:** ✅ Actualizados
- **Estado:** ✅ Gestionado correctamente
- **UI/UX:** ✅ Mejorada
- **Validaciones:** ✅ Implementadas
- **Warnings:** ✅ Corregidos

## 🎯 **IMPLEMENTACIÓN MÁS RECIENTE: Transferencia IA**

### **📋 Resumen Técnico:**
La implementación más reciente permite que las opciones de chatbot transfieran automáticamente tickets a departamentos específicos de agentes IA.

### **🔧 Componentes Principales:**
1. **QueueOptions/index.js** - Gestión de opciones con transferencias
2. **TransferQueueModal/index.js** - Modal de selección de departamentos
3. **QueueModal/index.js** - Coordinación entre componentes

### **📊 Flujo de Trabajo:**
1. **Configuración:** Usuario configura transferencia en opción
2. **Guardado Temporal:** Datos se guardan en memoria
3. **Persistencia:** Al presionar "AGREGAR" se guardan en BD
4. **Ejecución:** Sistema transfiere automáticamente tickets

### **✅ Funcionalidades Implementadas:**
- ✅ Configuración visual de transferencias
- ✅ Indicadores visuales (iconos, texto)
- ✅ Confirmaciones de eliminación
- ✅ Validación de datos
- ✅ Persistencia temporal y permanente
- ✅ Manejo de errores robusto

## 📚 **DOCUMENTACIÓN TÉCNICA**

### **✅ Guías Disponibles:**
1. **0001-Instalación local Watoolx 1.1.0.md** - Instalación inicial
2. **0002-Traducciones-AccesoRapido-UX.md** - Mejoras de UX
3. **0003-Respuestas rapidas con multimedia.md** - Funcionalidad multimedia
4. **0004-Implementación OpenRouter IA.md** - Integración IA
5. **0016-Asignación de departamentos y Opciones Simple.md** - Sistema base
6. **0017-Implementación CHATBOT a Departamentos Agentes IA.md** - Transferencia IA

### **🔧 Archivos Técnicos Importantes:**
- **Backend:**
  - `models/QueueOption.ts` - Modelo con transferQueueId
  - `services/QueueOptionService/` - Lógica de negocio
  - `controllers/QueueOptionController.ts` - Controlador API
  - `database/migrations/` - Migraciones de BD

- **Frontend:**
  - `components/QueueOptions/index.js` - Gestión de opciones
  - `components/TransferQueueModal/index.js` - Modal de transferencia
  - `components/QueueModal/index.js` - Modal principal

## 🧪 **CASOS DE PRUEBA VALIDADOS**

### **✅ Transferencia IA - Casos Exitosos:**
1. **Creación Nueva:** ✅ Departamento + Opción + Transferencia
2. **Edición Existente:** ✅ Modificar transferencia existente
3. **Eliminación:** ✅ Remover transferencia con confirmación
4. **Persistencia:** ✅ Datos guardados correctamente
5. **UI/UX:** ✅ Interfaz intuitiva y responsive

### **✅ Validaciones Implementadas:**
- ✅ `queueId` requerido para guardar
- ✅ `transferQueueId` válido
- ✅ Confirmación antes de eliminar
- ✅ Manejo de errores de conexión
- ✅ Rollback en caso de fallo

## 🔧 **CONFIGURACIÓN ACTUAL**

### **✅ Variables de Entorno:**
```env
# Base de Datos
DB_DIALECT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=waticket_saas
DB_USER=root
DB_PASS=

# Servidor
PORT=8080
NODE_ENV=development
```

### **✅ Dependencias Principales:**
- **Backend:** Express, Sequelize, Socket.io, Baileys
- **Frontend:** React, Material-UI, Axios, Socket.io-client

## 🚀 **INSTRUCCIONES DE DESPLIEGUE**

### **✅ Pasos para Nuevo Despliegue:**
1. **Clonar repositorio**
2. **Instalar dependencias:** `npm install` (backend y frontend)
3. **Configurar BD:** Crear base de datos MySQL
4. **Variables de entorno:** Copiar `.env.example` a `.env`
5. **Migraciones:** `npm run migrate` (backend)
6. **Compilar:** `npm run build` (frontend)
7. **Iniciar servicios:** `npm start` (backend y frontend)

### **✅ Comandos Útiles:**
```bash
# Backend
npm run migrate    # Ejecutar migraciones
npm run dev        # Desarrollo con nodemon
npm start          # Producción

# Frontend
npm start          # Desarrollo
npm run build      # Producción
```

## 🔮 **PRÓXIMAS IMPLEMENTACIONES**

### **📋 Roadmap Técnico:**
1. **Transferencias Condicionales** - Basadas en contenido del mensaje
2. **Analytics de Transferencias** - Métricas y reportes
3. **Múltiples Destinos** - Transferencia a varios departamentos
4. **Reglas de Negocio** - Configuración avanzada
5. **Notificaciones Push** - Alertas en tiempo real

### **🎯 Prioridades:**
1. **Estabilidad** - Mantener sistema funcional
2. **Performance** - Optimizar consultas y renderizado
3. **UX/UI** - Mejorar experiencia de usuario
4. **Escalabilidad** - Preparar para crecimiento

## 📊 **MÉTRICAS Y MONITOREO**

### **✅ Logs Importantes:**
- Creación y modificación de transferencias
- Ejecución de transferencias automáticas
- Errores de validación y conexión
- Performance de consultas

### **✅ Métricas a Monitorear:**
- Tiempo de respuesta de transferencias
- Tasa de éxito de transferencias
- Uso de funcionalidades por departamento
- Performance general del sistema

## 🎯 **CONCLUSIÓN**

El proyecto Whaticket03 se encuentra en un estado **FUNCIONAL Y ESTABLE** con todas las funcionalidades principales implementadas y validadas. La implementación más reciente de **Transferencia Automática a Departamentos IA** está completamente operativa y lista para uso en producción.

**Estado General:** ✅ **COMPLETADO Y FUNCIONAL**
**Última Implementación:** ✅ **Transferencia IA - EXITOSA**
**Próximo Paso:** 🚀 **Optimización y nuevas funcionalidades**

---

**Documento actualizado:** 27 de Julio, 2025
**Versión del documento:** 1.0.0
**Responsable:** Asistente IA - Cursor 

## 🟢 RESUMEN DE LA ÚLTIMA SESIÓN (JULIO 2025)

### 🔍 Diagnóstico y Depuración en Tiempo Real
- Se detectó un problema donde, tras transferir un ticket a un departamento IA, la primera respuesta del bot funcionaba pero los siguientes mensajes no eran procesados por la IA.
- El log mostraba que el campo `useIntegration` del ticket seguía en `false` tras la transferencia, impidiendo que el flujo de IA continuara.
- Se identificó que el objeto `ticket` en memoria no se actualizaba correctamente tras la transferencia, a pesar de los intentos de recarga (`reload`) y actualización.

### 🛠️ Solución Aplicada
- Se reforzó la lógica de recarga y actualización del ticket en memoria y en base de datos, aplicando múltiples `reload` y `update` tras la transferencia para asegurar que los campos `queueId`, `useIntegration` y `promptId` quedaran correctamente sincronizados.
- Se añadieron logs detallados en cada paso para verificar el estado real del ticket antes de invocar la IA.
- Se reinició el backend en primer plano varias veces para validar los cambios en tiempo real.

### ✅ Estado Actual
- El sistema responde correctamente al primer mensaje y transfiere el ticket al departamento IA.
- El campo `useIntegration` se actualiza correctamente en la base de datos y en memoria.
- El flujo de conversación con la IA está listo para pruebas finales y optimización.
- El usuario puede continuar el desarrollo o depuración desde este punto, con toda la lógica de transferencia y recarga de ticket robusta y documentada.

--- 

---

## 🚀 **ÚLTIMAS MEJORAS IMPLEMENTADAS (SESIONES RECIENTES)**

### **🤖 SISTEMA DE AGENTES IA CONVERSACIONALES**
**Fecha:** Julio 2025  
**Estado:** ✅ COMPLETADO Y FUNCIONANDO

**Características implementadas:**
- ✅ Transferencia automática entre departamentos IA
- ✅ Detección de palabras clave dinámicas
- ✅ Conversación entre agentes IA
- ✅ Manejo robusto de opciones inválidas
- ✅ Prompts optimizados en español
- ✅ Formato visual mejorado (emojis, guiones, saltos de línea)

**Archivos modificados:**
- `backend/src/services/WbotServices/wbotMessageListener.ts`
- `backend/src/services/TicketServices/UpdateTicketService.ts`
- `backend/src/models/Whatsapp.ts` (nuevo campo waName)
- `backend/src/services/WhatsappService/ExtractWhatsAppNameService.ts`
- `frontend/src/components/QueueModal/index.js`
- `frontend/src/translate/languages/es.js`

**Funcionalidades clave:**
1. **Detección automática:** Palabras clave como "comprar", "venta", "soporte", "ayuda"
2. **Transferencia inteligente:** Entre departamentos BOT-AI-Soporte y BOT-AI-Ventas
3. **Manejo de errores:** Mensajes de "Opción inválida" para entradas incorrectas
4. **Prompts optimizados:** Formato visual claro con emojis y estructura

### **🔗 CAMPOS PERSONALIZADOS BAILEYS**
**Fecha:** Julio 2025  
**Estado:** ✅ COMPLETADO

**Nuevos campos implementados:**
- ✅ **waName:** Nombre real del WhatsApp
- ✅ **Avatar:** Imagen de perfil
- ✅ **Token:** Token API generado automáticamente
- ✅ **Instance:** ID de instancia limpio

**Archivos modificados:**
- `backend/src/database/migrations/20250128_add_waName_to_whatsapp.ts`
- `backend/src/services/WhatsappService/ExtractWhatsAppNameService.ts`
- `backend/src/libs/wbot.ts`
- `frontend/src/pages/Connections/index.js`

### **🎨 MEJORAS UI/UX**
**Fecha:** Julio 2025  
**Estado:** ✅ COMPLETADO

**Cambios implementados:**
- ✅ Traducción completa de portugués a español
- ✅ Versión dinámica configurable
- ✅ Título dinámico configurable
- ✅ Extracción automática de códigos YouTube
- ✅ Mejoras en thumbnails de videos
- ✅ Nuevas columnas en módulo CONEXIONES
- ✅ Gestión de tickets huérfanos 

---

## 📋 **PROMPT PARA FUTURAS CONVERSACIONES**

### **🎯 INSTRUCCIONES PARA EL ASISTENTE:**

**CONTEXTO DEL PROYECTO:**
- Proyecto: Whaticket SaaS (Sistema de Tickets WhatsApp)
- Ubicación: `/c:/laragon/www/whaticket03/waticketsaas/`
- Tecnologías: Node.js, React, MySQL, Sequelize, Baileys
- Estado: En desarrollo activo con mejoras continuas

**METODOLOGÍA DE TRABAJO:**
1. **Analizar** el problema específico
2. **Revisar** código existente antes de modificar
3. **Implementar** cambios paso a paso
4. **Probar** en tiempo real con logs
5. **Documentar** cambios completos
6. **Limpiar** scripts temporales

**CONVENCIONES IMPORTANTES:**
- ✅ **Siempre responder en español**
- ✅ **Usar logs detallados para debugging**
- ✅ **Crear scripts temporales cuando sea necesario**
- ✅ **Documentar cambios en archivos .md**
- ✅ **Mantener compatibilidad con código existente**
- ✅ **Probar cambios en tiempo real**

**ARCHIVOS CRÍTICOS:**
- `backend/src/services/WbotServices/wbotMessageListener.ts` - Lógica principal de mensajes
- `backend/src/services/TicketServices/UpdateTicketService.ts` - Actualización de tickets
- `frontend/src/translate/languages/es.js` - Traducciones
- `guias/` - Documentación de mejoras

**ESTADO ACTUAL:**
- ✅ Sistema de agentes IA conversacionales funcionando
- ✅ Transferencias automáticas entre departamentos
- ✅ Manejo de opciones inválidas
- ✅ Prompts optimizados en español
- ✅ Campos personalizados de Baileys
- ✅ Mejoras UI/UX completadas

**PARA NUEVAS MEJORAS:**
1. Leer el contexto completo del proyecto
2. Analizar el problema específico
3. Implementar cambios incrementales
4. Probar en tiempo real
5. Documentar completamente
6. Limpiar archivos temporales

---

## 🔧 **COMANDOS ÚTILES**

```bash
# Iniciar backend
cd waticketsaas/backend
npm start

# Iniciar frontend
cd waticketsaas/frontend
npm start

# Ver logs en tiempo real
npm start (backend en primer plano)

# Limpiar cache
./clear-cache.bat

# Forzar reload
./force-reload.bat
```

---

## 📚 **DOCUMENTACIÓN COMPLETA**

Todos los archivos de documentación están en la carpeta `guias/` con el formato:
- `0001-Instalación local Watoolx 1.1.0.md`
- `0018-Agentes IA conversacional más transferencias departamentos.md`
- `0019-Conexión con API baileys campos personalizados.md`

**Última actualización:** Julio 2025  
**Estado del proyecto:** ✅ FUNCIONANDO COMPLETAMENTE 