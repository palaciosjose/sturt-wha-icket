[1mdiff --git a/backend/src/libs/socket.ts b/backend/src/libs/socket.ts[m
[1mindex a66f94891..a3595d5b6 100644[m
[1m--- a/backend/src/libs/socket.ts[m
[1m+++ b/backend/src/libs/socket.ts[m
[36m@@ -15,6 +15,21 @@[m [mexport const initIO = (httpServer: Server): SocketIO => {[m
   io = new SocketIO(httpServer, {[m
     cors: {[m
       origin: process.env.FRONTEND_URL[m
[32m+[m[32m    },[m
[32m+[m[32m    // ✅ CONFIGURACIÓN MEJORADA PARA CONEXIÓN ESTABLE[m
[32m+[m[32m    pingTimeout: 60000, // 60 segundos para producción[m
[32m+[m[32m    pingInterval: 25000, // 25 segundos para producción[m
[32m+[m[32m    upgradeTimeout: 10000, // 10 segundos[m
[32m+[m[32m    allowEIO3: true, // Compatibilidad con versiones anteriores[m
[32m+[m[32m    transports: ['websocket', 'polling'], // Fallback a polling[m
[32m+[m[32m    maxHttpBufferSize: 1e8, // 100MB para archivos grandes[m
[32m+[m[32m    allowRequest: (req, callback) => {[m
[32m+[m[32m      // ✅ VERIFICACIÓN ADICIONAL DE SEGURIDAD[m
[32m+[m[32m      const origin = req.headers.origin;[m
[32m+[m[32m      if (origin && origin !== process.env.FRONTEND_URL) {[m
[32m+[m[32m        return callback('Origin not allowed', false);[m
[32m+[m[32m      }[m
[32m+[m[32m      callback(null, true);[m
     }[m
   });[m
 [m
[36m@@ -54,6 +69,31 @@[m [mexport const initIO = (httpServer: Server): SocketIO => {[m
     socket.join(`company-${user.companyId}-mainchannel`);[m
     socket.join(`user-${user.id}`);[m
 [m
[32m+[m[32m    // ✅ HEARTBEAT PARA MANTENER CONEXIÓN ACTIVA[m
[32m+[m[32m    let heartbeatInterval: NodeJS.Timeout;[m
[32m+[m[41m    [m
[32m+[m[32m    // Función para enviar heartbeat[m
[32m+[m[32m    const sendHeartbeat = () => {[m
[32m+[m[32m      if (socket.connected) {[m
[32m+[m[32m        socket.emit("heartbeat");[m
[32m+[m[32m        logger.debug(`💓 Heartbeat enviado a usuario ${user.id}`);[m
[32m+[m[32m      }[m
[32m+[m[32m    };[m
[32m+[m[41m    [m
[32m+[m[32m    // Iniciar heartbeat cada 30 segundos[m
[32m+[m[32m    heartbeatInterval = setInterval(sendHeartbeat, 30000);[m
[32m+[m[41m    [m
[32m+[m[32m    // Listener para ping del cliente[m
[32m+[m[32m    socket.on("ping", () => {[m
[32m+[m[32m      socket.emit("pong");[m
[32m+[m[32m      logger.debug(`🏓 Pong enviado a usuario ${user.id}`);[m
[32m+[m[32m    });[m
[32m+[m[41m    [m
[32m+[m[32m    // Listener para heartbeat del cliente[m
[32m+[m[32m    socket.on("heartbeat", () => {[m
[32m+[m[32m      logger.debug(`💓 Heartbeat recibido de usuario ${user.id}`);[m
[32m+[m[32m    });[m
[32m+[m
     socket.on("joinChatBox", async (ticketId: string) => {[m
       if (!ticketId || ticketId === "undefined") {[m
         return;[m
[36m@@ -165,6 +205,25 @@[m [mexport const initIO = (httpServer: Server): SocketIO => {[m
     });[m
     [m
     socket.emit("ready");[m
[32m+[m[41m    [m
[32m+[m[32m    // ✅ LIMPIAR HEARTBEAT AL DESCONECTAR[m
[32m+[m[32m    socket.on("disconnect", (reason) => {[m
[32m+[m[32m      logger.info(`🔌 Usuario ${user.id} desconectado: ${reason}`);[m
[32m+[m[41m      [m
[32m+[m[32m      // Limpiar heartbeat[m
[32m+[m[32m      if (heartbeatInterval) {[m
[32m+[m[32m        clearInterval(heartbeatInterval);[m
[32m+[m[32m        logger.debug(`🧹 Heartbeat limpiado para usuario ${user.id}`);[m
[32m+[m[32m      }[m
[32m+[m[41m      [m
[32m+[m[32m      // Marcar usuario como offline[m
[32m+[m[32m      if (user) {[m
[32m+[m[32m        user.online = false;[m
[32m+[m[32m        user.save().catch(err => {[m
[32m+[m[32m          logger.error(`Error marcando usuario ${user.id} como offline: ${err.message}`);[m
[32m+[m[32m        });[m
[32m+[m[32m      }[m
[32m+[m[32m    });[m
   });[m
   return io;[m
 };[m
[1mdiff --git a/backend/src/queues.ts b/backend/src/queues.ts[m
[1mindex a6c675293..450c4defb 100644[m
[1m--- a/backend/src/queues.ts[m
[1m+++ b/backend/src/queues.ts[m
[36m@@ -31,6 +31,7 @@[m [mimport { logger } from "./utils/logger";[m
 import GetTimezone from "./helpers/GetTimezone";[m
 import SendWhatsAppMessage from "./services/WbotServices/SendWhatsAppMessage";[m
 import FindOrCreateTicketService from "./services/TicketServices/FindOrCreateTicketService";[m
[32m+[m[32mimport { formatStartMessage, formatReminderMessage, formatImmediateMessage } from "./services/ScheduleServices/ReminderSystemService";[m
 [m
 [m
 const nodemailer = require('nodemailer');[m
[36m@@ -256,12 +257,32 @@[m [masync function handleVerifySchedules(job) {[m
           const nowInCompanyTimezone = moment().tz(timezone);[m
           const scheduledTimeInCompanyTimezone = moment(schedule.sendAt).tz(timezone);[m
           [m
[31m-          // Verificar si realmente es hora de enviar[m
[32m+[m[32m          // ✅ VERIFICAR SI REALMENTE ES HORA DE ENVIAR[m
[32m+[m[32m          // Para agendamientos que ya pasaron su hora, procesarlos inmediatamente[m
           if (scheduledTimeInCompanyTimezone.isAfter(nowInCompanyTimezone)) {[m
[31m-            logger.info(`[Schedules] Agendamiento ${schedule.id} aún no es hora de enviar`);[m
[32m+[m[32m            logger.info(`[Schedules] ⏰ Agendamiento ${schedule.id} aún no es hora de enviar - Programado para: ${scheduledTimeInCompanyTimezone.format('YYYY-MM-DD HH:mm:ss')} - Actual: ${nowInCompanyTimezone.format('YYYY-MM-DD HH:mm:ss')}`);[m
             continue;[m
           }[m
           [m
[32m+[m[32m          logger.info(`[Schedules] ✅ Es hora de procesar agendamiento ${schedule.id} - Programado para: ${scheduledTimeInCompanyTimezone.format('YYYY-MM-DD HH:mm:ss')} - Actual: ${nowInCompanyTimezone.format('YYYY-MM-DD HH:mm:ss')} - Diferencia: ${nowInCompanyTimezone.diff(scheduledTimeInCompanyTimezone, 'minutes')} minutos`);[m
[32m+[m[41m          [m
[32m+[m[32m          // ✅ VERIFICAR SI YA EXISTE UN JOB PARA ESTE AGENDAMIENTO[m
[32m+[m[32m          const existingJobs = await sendScheduledMessages.getJobs(['waiting', 'delayed', 'active']);[m
[32m+[m[32m          const hasExistingJob = existingJobs.some(job =>[m[41m [m
[32m+[m[32m            job.data.schedule && job.data.schedule.id === schedule.id[m
[32m+[m[32m          );[m
[32m+[m
[32m+[m[32m          if (hasExistingJob) {[m
[32m+[m[32m            logger.warn(`[Schedules] ⚠️ Agendamiento ${schedule.id} ya está en cola, saltando...`);[m
[32m+[m[32m            continue;[m
[32m+[m[32m          }[m
[32m+[m
[32m+[m[32m          // ✅ VERIFICAR SI YA SE ENVIÓ O ESTÁ EN PROCESO[m
[32m+[m[32m          if (schedule.status !== "PENDENTE") {[m
[32m+[m[32m            logger.warn(`[Schedules] ⚠️ Agendamiento ${schedule.id} ya no está pendiente (status: ${schedule.status}), saltando...`);[m
[32m+[m[32m            continue;[m
[32m+[m[32m          }[m
[32m+[m
           await schedule.update({[m
             status: "AGENDADA"[m
           });[m
[36m@@ -275,7 +296,7 @@[m [masync function handleVerifySchedules(job) {[m
             { delay: delay + 1000 } // Agregar 1 segundo para asegurar que se ejecute[m
           );[m
           [m
[31m-          logger.info(`[Schedules] Programado: ${schedule.contact.name} - Hora programada: ${scheduledTimeInCompanyTimezone.format('YYYY-MM-DD HH:mm:ss')} - Delay: ${delay}ms`);[m
[32m+[m[32m          logger.info(`[Schedules] ✅ Programado: ${schedule.contact.name} - Hora programada: ${scheduledTimeInCompanyTimezone.format('YYYY-MM-DD HH:mm:ss')} - Delay: ${delay}ms`);[m
         } catch (error) {[m
           logger.error(`[Schedules] Error al procesar agendamiento ${schedule.id}:`, error.message);[m
         }[m
[36m@@ -308,9 +329,35 @@[m [masync function handleSendScheduledMessage(job) {[m
       return;[m
     }[m
     [m
[31m-    // Verificar que el agendamiento aún esté pendiente[m
[32m+[m[32m    // ✅ VERIFICACIONES DE ESTADO MEJORADAS[m
[32m+[m[32m    logger.info(`[Schedules] 🔍 Verificando estado del agendamiento ${schedule.id}: ${scheduleRecord.status}`);[m
[32m+[m[41m    [m
     if (scheduleRecord.status !== "PENDENTE" && scheduleRecord.status !== "AGENDADA") {[m
[31m-      logger.warn(`[Schedules] Agendamiento ${schedule.id} ya no está pendiente (actual: ${scheduleRecord.status})`);[m
[32m+[m[32m      logger.warn(`[Schedules] ⚠️ Agendamiento ${schedule.id} ya no está pendiente (actual: ${scheduleRecord.status})`);[m
[32m+[m[32m      return;[m
[32m+[m[32m    }[m
[32m+[m[41m    [m
[32m+[m[32m    // ✅ VERIFICAR QUE NO SE HAYA ENVIADO YA[m
[32m+[m[32m    if (scheduleRecord.sentAt) {[m
[32m+[m[32m      logger.warn(`[Schedules] ⚠️ Agendamiento ${schedule.id} ya fue enviado en ${scheduleRecord.sentAt}`);[m
[32m+[m[32m      return;[m
[32m+[m[32m    }[m
[32m+[m[41m    [m
[32m+[m[32m    // ✅ VERIFICAR QUE NO SE ESTÉ PROCESANDO ACTUALMENTE[m
[32m+[m[32m    if (scheduleRecord.status === "AGENDADA") {[m
[32m+[m[32m      logger.info(`[Schedules] 🔄 Agendamiento ${schedule.id} ya está siendo procesado (status: AGENDADA) - Saltando...`);[m
[32m+[m[32m      return;[m
[32m+[m[32m    }[m
[32m+[m[41m    [m
[32m+[m[32m    // ✅ MARCAR COMO EN PROCESO INMEDIATAMENTE PARA EVITAR DUPLICACIÓN[m
[32m+[m[32m    await scheduleRecord.update({[m
[32m+[m[32m      status: "AGENDADA"[m
[32m+[m[32m    });[m
[32m+[m[32m    logger.info(`[Schedules] 🔒 Agendamiento ${schedule.id} marcado como AGENDADA para evitar duplicación`);[m
[32m+[m[41m    [m
[32m+[m[32m    // ✅ VERIFICAR QUE EL CONTACTO EXISTA[m
[32m+[m[32m    if (!scheduleRecord.contact) {[m
[32m+[m[32m      logger.error(`[Schedules] ❌ Agendamiento ${schedule.id} no tiene contacto asociado`);[m
       return;[m
     }[m
     [m
[36m@@ -341,37 +388,38 @@[m [masync function handleSendScheduledMessage(job) {[m
     let messageBody = schedule.body;[m
 [m
     if (scheduleRecord.isReminderSystem) {[m
[31m-      // Importar función de formateo si es necesario[m
[31m-      let formatStartMessage = null;[m
[31m-      if (scheduleRecord.reminderType === 'start') {[m
[31m-        const reminderService = require("../services/ScheduleServices/ReminderSystemService");[m
[31m-        formatStartMessage = reminderService.formatStartMessage;[m
[31m-      }[m
[31m-[m
[32m+[m[32m      // ✅ USAR FUNCIONES IMPORTADAS CORRECTAMENTE[m
       switch (scheduleRecord.reminderType) {[m
         case 'reminder':[m
           logPrefix = "[ReminderSystem] Recordatorio 10min antes";[m
           break;[m
         case 'start':[m
           logPrefix = "[ReminderSystem] Mensaje de inicio";[m
[31m-          // Si es el mensaje de inicio, usar el formato especial[m
[31m-          if (formatStartMessage) {[m
[31m-            messageBody = formatStartMessage(scheduleRecord.contact, scheduleRecord.body);[m
[31m-          }[m
[32m+[m[32m          // ✅ USAR FUNCIÓN DE FORMATO CORRECTA[m
[32m+[m[32m          messageBody = formatStartMessage(scheduleRecord.contact, scheduleRecord.body);[m
           break;[m
         default:[m
           logPrefix = "[Schedules]";[m
       }[m
     }[m
 [m
[31m-    logger.info(`${logPrefix} Enviando mensaje programado a ${scheduleRecord.contact.name} (${scheduleRecord.contact.number})`);[m
[32m+[m[32m    logger.info(`${logPrefix} 📤 Enviando mensaje programado a ${scheduleRecord.contact.name} (${scheduleRecord.contact.number})`);[m
[32m+[m[32m    logger.info(`${logPrefix} 📝 Tipo de mensaje: ${scheduleRecord.reminderType || 'normal'}`);[m
[32m+[m[32m    logger.info(`${logPrefix} 📅 Hora programada: ${moment(scheduleRecord.sendAt).format('YYYY-MM-DD HH:mm:ss')}`);[m
[32m+[m[32m    logger.info(`${logPrefix} 📱 WhatsApp ID: ${whatsapp.id}`);[m
[32m+[m[32m    logger.info(`${logPrefix} 📄 Mensaje a enviar: ${messageBody.substring(0, 100)}...`);[m
     [m
     // ✅ ENVIAR MENSAJE USANDO LA FUNCIÓN CORRECTA[m
[32m+[m[32m    logger.info(`${logPrefix} 🔄 Creando/buscando ticket...`);[m
     const scheduleTicket = await FindOrCreateTicketService(scheduleRecord.contact, whatsapp.id!, 0, schedule.companyId);[m
[32m+[m[32m    logger.info(`${logPrefix} ✅ Ticket creado/encontrado: ${scheduleTicket.id}`);[m
[32m+[m[41m    [m
[32m+[m[32m    logger.info(`${logPrefix} 📤 Enviando mensaje por WhatsApp...`);[m
     const sentMessage = await SendWhatsAppMessage({[m
       body: formatBody(messageBody, scheduleRecord.contact),[m
       ticket: scheduleTicket[m
     });[m
[32m+[m[32m    logger.info(`${logPrefix} ✅ Mensaje enviado exitosamente`);[m
 [m
     // ✅ GUARDAR MENSAJE EN LA BASE DE DATOS[m
     if (sentMessage) {[m
[36m@@ -407,6 +455,7 @@[m [masync function handleSendScheduledMessage(job) {[m
       status: "ENVIADO",[m
       reminderStatus: "sent"[m
     });[m
[32m+[m[32m    logger.info(`[Schedules] ✅ Agendamiento ${schedule.id} marcado como ENVIADO`);[m
 [m
     logger.info(`${logPrefix} ✅ Mensaje enviado exitosamente: ${scheduleRecord.contact.name} - ${moment().format('YYYY-MM-DD HH:mm:ss')}`);[m
     [m
[36m@@ -421,10 +470,26 @@[m [masync function handleSendScheduledMessage(job) {[m
       });[m
     }[m
     [m
[31m-    // ✅ LOG SIN CARACTERES EXTRAÑOS[m
[32m+[m[32m    // ✅ LOG DETALLADO CON INFORMACIÓN COMPLETA[m
     const contactName = scheduleRecord?.contact?.name || "Contacto desconocido";[m
[31m-    logger.error(`${logPrefix} ❌ Error enviando mensaje programado: ${contactName}`, e.message);[m
[31m-    throw e;[m
[32m+[m[32m    const scheduleId = scheduleRecord?.id || "ID desconocido";[m
[32m+[m[32m    const reminderType = scheduleRecord?.reminderType || "normal";[m
[32m+[m[41m    [m
[32m+[m[32m    logger.error(`${logPrefix} ❌ Error enviando mensaje programado:`, {[m
[32m+[m[32m      scheduleId: scheduleId,[m
[32m+[m[32m      contactName: contactName,[m
[32m+[m[32m      reminderType: reminderType,[m
[32m+[m[32m      error: e.message,[m
[32m+[m[32m      stack: e.stack,[m
[32m+[m[32m      timestamp: moment().format('YYYY-MM-DD HH:mm:ss')[m
[32m+[m[32m    });[m
[32m+[m[41m    [m
[32m+[m[32m    // ✅ LOG ADICIONAL PARA DEBUGGING[m
[32m+[m[32m    console.error(`[DEBUG] Error completo:`, e);[m
[32m+[m[32m    console.error(`[DEBUG] Stack trace:`, e.stack);[m
[32m+[m[41m    [m
[32m+[m[32m    // ✅ NO RELANZAR EL ERROR PARA EVITAR CRASH DEL SISTEMA[m
[32m+[m[32m    // throw e;[m
   }[m
 }[m
 [m
[1mdiff --git a/backend/src/services/ScheduleServices/ReminderSystemService.ts b/backend/src/services/ScheduleServices/ReminderSystemService.ts[m
[1mindex da416917e..eb6a2ccfa 100644[m
[1m--- a/backend/src/services/ScheduleServices/ReminderSystemService.ts[m
[1m+++ b/backend/src/services/ScheduleServices/ReminderSystemService.ts[m
[36m@@ -55,8 +55,11 @@[m [mconst CreateReminderSystemService = async ({[m
   });[m
 [m
   // 2. Enviar mensaje inmediato de confirmación[m
[32m+[m[32m  logger.info(`[ReminderSystem] 📤 Enviando mensaje inmediato a ${contact.name}`);[m
   const immediateMessage = formatImmediateMessage(contact, body, sendAt, timezone);[m
[32m+[m[32m  logger.info(`[ReminderSystem] 📄 Mensaje inmediato: ${immediateMessage.substring(0, 100)}...`);[m
   const sentMessage = await sendImmediateMessage(contact, immediateMessage, companyId, whatsappId);[m
[32m+[m[32m  logger.info(`[ReminderSystem] ✅ Mensaje inmediato enviado exitosamente`);[m
   [m
   // Guardar mensaje en la base de datos[m
   if (sentMessage) {[m
[36m@@ -138,7 +141,14 @@[m [mconst CreateReminderSystemService = async ({[m
   }[m
 [m
   // 3. Crear recordatorio 10 minutos antes[m
[31m-  if (reminderTime.isAfter(moment())) {[m
[32m+[m[32m  const now = moment().tz(timezone);[m
[32m+[m[32m  const timeUntilReminder = reminderTime.diff(now, 'minutes');[m
[32m+[m[41m  [m
[32m+[m[32m  if (timeUntilReminder > 0) {[m
[32m+[m[32m    logger.info(`[ReminderSystem] 📅 Creando recordatorio 10min antes para ${contact.name}`);[m
[32m+[m[32m    logger.info(`[ReminderSystem] ⏰ Hora del recordatorio: ${reminderTime.format('YYYY-MM-DD HH:mm:ss')}`);[m
[32m+[m[32m    logger.info(`[ReminderSystem] ⏱️ Tiempo hasta recordatorio: ${timeUntilReminder} minutos`);[m
[32m+[m[41m    [m
     const reminderSchedule = await Schedule.create({[m
       body: formatReminderMessage(contact),[m
       sendAt: reminderTime.toDate(),[m
[36m@@ -152,7 +162,9 @@[m [mconst CreateReminderSystemService = async ({[m
       reminderStatus: 'pending'[m
     });[m
 [m
[31m-    [m
[32m+[m[32m    logger.info(`[ReminderSystem] ✅ Recordatorio creado con ID: ${reminderSchedule.id}`);[m
[32m+[m[32m  } else {[m
[32m+[m[32m    logger.warn(`[ReminderSystem] ⚠️ No se crea recordatorio 10min - ya pasó la hora: ${reminderTime.format('YYYY-MM-DD HH:mm:ss')} (hace ${Math.abs(timeUntilReminder)} minutos)`);[m
   }[m
 [m
   // 4. Actualizar el agendamiento principal con su ID como parentScheduleId[m
[1mdiff --git a/frontend/src/context/Socket/SocketContext.js b/frontend/src/context/Socket/SocketContext.js[m
[1mindex ca779058d..f24c25d7c 100644[m
[1m--- a/frontend/src/context/Socket/SocketContext.js[m
[1m+++ b/frontend/src/context/Socket/SocketContext.js[m
[36m@@ -8,10 +8,18 @@[m [mclass ManagedSocket {[m
     this.socket = socketManager.currentSocket;[m
     this.pendingJoins = [];[m
     this.pendingEmits = [];[m
[32m+[m[32m    this.registeredListeners = new Map(); // ✅ TRACKING DE LISTENERS REGISTRADOS[m
     [m
     const refreshJoinsOnReady = () => {[m
[32m+[m[32m      // ✅ RE-REGISTRAR TODOS LOS LISTENERS DESPUÉS DE RECONEXIÓN[m
[32m+[m[32m      this.registeredListeners.forEach((callback, event) => {[m
[32m+[m[32m        this.socket.on(event, callback);[m
[32m+[m[32m        console.debug(`🔄 Re-registrando listener: ${event}`);[m
[32m+[m[32m      });[m
[32m+[m[41m      [m
       this.pendingJoins.forEach(({ event, callback }) => {[m
         this.socket.on(event, callback);[m
[32m+[m[32m        this.registeredListeners.set(event, callback); // ✅ GUARDAR PARA RE-REGISTRO[m
       });[m
       this.pendingEmits.forEach(({ event, params }) => {[m
         this.socket.emit(event, ...params);[m
[36m@@ -29,10 +37,14 @@[m [mclass ManagedSocket {[m
   on(event, callback) {[m
     // ✅ CONFIGURAR LISTENERS INMEDIATAMENTE, NO ESPERAR A SOCKET READY[m
     this.socket.on(event, callback);[m
[32m+[m[32m    // ✅ GUARDAR PARA RE-REGISTRO DESPUÉS DE RECONEXIÓN[m
[32m+[m[32m    this.registeredListeners.set(event, callback);[m
   }[m
 [m
   off(event, callback) {[m
     this.socket.off(event, callback);[m
[32m+[m[32m    // ✅ REMOVER DEL TRACKING[m
[32m+[m[32m    this.registeredListeners.delete(event);[m
   }[m
 [m
   emit(event, ...params) {[m
[36m@@ -176,12 +188,29 @@[m [mconst SocketManager = {[m
       [m
       this.currentSocket.on("connect", (...params) => {[m
         console.debug("socket connected", params);[m
[32m+[m[32m        // ✅ RE-REGISTRAR LISTENERS DESPUÉS DE RECONEXIÓN[m
[32m+[m[32m        this.socketReady = false;[m
[32m+[m[32m        this.onReady(() => {[m
[32m+[m[32m          this.socketReady = true;[m
[32m+[m[32m          console.log("✅ Socket reconectado y listeners re-registrados");[m
[32m+[m[32m        });[m
       });[m
 [m
       this.currentSocket.on("connect_error", (error) => {[m
         console.error("Socket connection error:", error);[m
       });[m
       [m
[32m+[m[32m      // ✅ LISTENERS PARA HEARTBEAT[m
[32m+[m[32m      this.currentSocket.on("heartbeat", () => {[m
[32m+[m[32m        console.debug("💓 Heartbeat recibido del servidor");[m
[32m+[m[32m        // Responder al heartbeat[m
[32m+[m[32m        this.currentSocket.emit("heartbeat");[m
[32m+[m[32m      });[m
[32m+[m[41m      [m
[32m+[m[32m      this.currentSocket.on("pong", () => {[m
[32m+[m[32m        console.debug("🏓 Pong recibido del servidor");[m
[32m+[m[32m      });[m
[32m+[m[41m      [m
       this.currentSocket.onAny((event, ...args) => {[m
         console.debug("Event: ", { socket: this.currentSocket, event, args });[m
       });[m
