import Schedule from "../../models/Schedule";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import { SendMessage } from "../../helpers/SendMessage";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import GetTimezone from "../../helpers/GetTimezone";
import formatBody from "../../helpers/Mustache";
import moment from "moment-timezone";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";

interface CreateReminderSystemRequest {
  body: string;
  sendAt: string;
  contactId: number;
  companyId: number;
  userId: number;
  whatsappId?: number; // Nueva opción para especificar WhatsApp
  contactListId?: number;
}

const CreateReminderSystemService = async ({
  body,
  sendAt,
  contactId,
  companyId,
  userId,
  whatsappId,
  contactListId
}: CreateReminderSystemRequest): Promise<Schedule> => {
  
  const contact = await Contact.findByPk(contactId);
  if (!contact) {
    throw new Error("Contacto no encontrado");
  }

  // Obtener zona horaria de la empresa
  const timezone = await GetTimezone(companyId);
  
  // Guardar la hora ORIGINAL del usuario (sin convertir a UTC)
  const scheduledTime = moment.tz(sendAt, timezone);
  const reminderTime = moment.tz(sendAt, timezone).subtract(10, 'minutes');

  // 1. Crear el agendamiento principal
  const mainSchedule = await Schedule.create({
    body,
    sendAt: scheduledTime.toDate(), // Guardar hora original
    contactId,
    companyId,
    userId,
    whatsappId,
    contactListId,
    status: 'PENDENTE',
    isReminderSystem: true,
    reminderType: 'start',
    reminderStatus: 'pending'
  });

  // 2. Enviar mensaje inmediato de confirmación
  logger.info(`[ReminderSystem] 📤 Enviando mensaje inmediato a ${contact.name}`);
  const immediateMessage = formatImmediateMessage(contact, body, sendAt, timezone);
  logger.info(`[ReminderSystem] 📄 Mensaje inmediato: ${immediateMessage.substring(0, 100)}...`);
  const sentMessage = await sendImmediateMessage(contact, immediateMessage, companyId, whatsappId);
  logger.info(`[ReminderSystem] ✅ Mensaje inmediato enviado exitosamente`);
  
  // Guardar mensaje en la base de datos
  if (sentMessage) {
    // Buscar o crear ticket para el contacto
    let ticket = await Ticket.findOne({
      where: { contactId, companyId },
      order: [["createdAt", "DESC"]]
    });

    // Si no existe ticket, crear uno nuevo
    if (!ticket) {
      const whatsapp = whatsappId ? 
        await Whatsapp.findByPk(whatsappId) : 
        await GetDefaultWhatsApp(companyId);
      
      if (!whatsapp) {
        throw new Error("WhatsApp no configurado para crear ticket");
      }

      ticket = await Ticket.create({
        contactId,
        companyId,
        whatsappId: whatsapp.id,
        status: "open",
        unreadMessages: 0,
        lastMessage: immediateMessage
      });
    }

    const messageId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await Message.create({
      id: messageId,
      body: immediateMessage,
      fromMe: true,
      read: true,
      mediaUrl: null,
      mediaType: null,
      contactId: contactId,
      companyId: companyId,
      ticketId: ticket.id, // Usar el ticket correcto
      ack: 1,
      reactions: []
    });

    // Actualizar lastMessage del ticket
    await ticket.update({ lastMessage: immediateMessage });

    // Emitir mensaje por socket para actualización en tiempo real
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit("ticket", {
      action: "update",
      ticket: {
        id: ticket.id,
        contactId: contactId,
        companyId: companyId,
        lastMessage: immediateMessage
      }
    });

    // Emitir mensaje específico para el chat
    io.to(`company-${companyId}-ticket-${ticket.id}`).emit("appMessage", {
      action: "create",
      message: {
        id: messageId,
        body: immediateMessage,
        fromMe: true,
        read: true,
        mediaUrl: null,
        mediaType: null,
        contactId: contactId,
        companyId: companyId,
        ticketId: ticket.id,
        ack: 1,
        reactions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  // 3. Crear recordatorio 10 minutos antes
  const now = moment().tz(timezone);
  const timeUntilReminder = reminderTime.diff(now, 'minutes');
  
  if (timeUntilReminder > 0) {
    logger.info(`[ReminderSystem] 📅 Creando recordatorio 10min antes para ${contact.name}`);
    logger.info(`[ReminderSystem] ⏰ Hora del recordatorio: ${reminderTime.format('YYYY-MM-DD HH:mm:ss')}`);
    logger.info(`[ReminderSystem] ⏱️ Tiempo hasta recordatorio: ${timeUntilReminder} minutos`);
    
    const reminderSchedule = await Schedule.create({
      body: formatReminderMessage(contact),
      sendAt: reminderTime.toDate(),
      contactId,
      companyId,
      userId,
      whatsappId,
      contactListId,
      status: 'PENDENTE',
      isReminderSystem: true,
      reminderType: 'reminder',
      parentScheduleId: mainSchedule.id.toString(),
      reminderStatus: 'pending'
    });

    logger.info(`[ReminderSystem] ✅ Recordatorio creado con ID: ${reminderSchedule.id}`);
  } else {
    logger.warn(`[ReminderSystem] ⚠️ No se crea recordatorio 10min - ya pasó la hora: ${reminderTime.format('YYYY-MM-DD HH:mm:ss')} (hace ${Math.abs(timeUntilReminder)} minutos)`);
  }

  // 4. Actualizar el agendamiento principal con su ID como parentScheduleId
  await mainSchedule.update({
    parentScheduleId: mainSchedule.id.toString()
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit("schedule", {
    action: "create",
    schedule: mainSchedule
  });

  

  return mainSchedule;
};

const formatImmediateMessage = (contact: Contact, body: string, sendAt: string, timezone: string): string => {
  // Usar la hora original (local) en lugar de UTC
  const localTime = moment.tz(sendAt, timezone);
  
  return `🔔 ${contact.name} hemos agendado una reunión para el:\n\n` +
         `📆Fecha: ${localTime.format('DD/MM/YYYY')}\n` +
         `⏰Hora: ${localTime.format('HH:mm')}\n` +
         `🎯Tema: ${body}\n\n` +
         `🔔10 minutos antes estaré notificándote nuevamente\n` +
         `👋Hasta ese tiempo, nos vemos`;
};

const formatReminderMessage = (contact: Contact): string => {
  return `🚨${contact.name} en 10 minutos inicia nuestra cita\n\n` +
         `👋Nos vemos en minutos`;
};

const formatStartMessage = (contact: Contact, body: string): string => {
  return `🔔Es hora iniciemos nuestra reunión sobre:\n\n` +
         `${body}\n\n` +
         `👋Gracias por su espera`;
};

const sendImmediateMessage = async (contact: Contact, message: string, companyId: number, whatsappId?: number): Promise<boolean> => {
  try {
    let whatsapp;
    
    if (whatsappId) {
      // Usar WhatsApp específico si se proporciona
      whatsapp = await Whatsapp.findByPk(whatsappId);
      if (!whatsapp) {
        throw new Error(`WhatsApp ID ${whatsappId} no encontrado`);
      }
      
    } else {
      // Fallback al WhatsApp por defecto
      whatsapp = await GetDefaultWhatsApp(companyId);
      if (!whatsapp) {
        throw new Error("WhatsApp no configurado");
      }
      
    }

    await SendMessage(whatsapp, {
      number: contact.number,
      body: message
    });

    
    return true;
  } catch (error) {
    logger.error(`[ReminderSystem] ❌ Error enviando mensaje inmediato a ${contact.name}:`, error);
    throw error;
  }
};

export { CreateReminderSystemService, formatImmediateMessage, formatReminderMessage, formatStartMessage }; 