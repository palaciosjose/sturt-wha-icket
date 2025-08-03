import Schedule from "../../models/Schedule";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import { SendMessage } from "../../helpers/SendMessage";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import formatBody from "../../helpers/Mustache";
import moment from "moment";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";

interface CreateReminderSystemRequest {
  body: string;
  sendAt: string;
  contactId: number;
  companyId: number;
  userId: number;
  whatsappId?: number; // Nueva opción para especificar WhatsApp
}

const CreateReminderSystemService = async ({
  body,
  sendAt,
  contactId,
  companyId,
  userId,
  whatsappId
}: CreateReminderSystemRequest): Promise<Schedule> => {
  
  const contact = await Contact.findByPk(contactId);
  if (!contact) {
    throw new Error("Contacto no encontrado");
  }

  const scheduledTime = moment(sendAt);
  const reminderTime = moment(sendAt).subtract(10, 'minutes');

  // 1. Crear el agendamiento principal
  const mainSchedule = await Schedule.create({
    body,
    sendAt: scheduledTime.toDate(),
    contactId,
    companyId,
    userId,
    status: 'PENDENTE',
    isReminderSystem: true,
    reminderType: 'start',
    reminderStatus: 'pending'
  });

  // 2. Enviar mensaje inmediato de confirmación
  const immediateMessage = formatImmediateMessage(contact, body, scheduledTime);
  const sentMessage = await sendImmediateMessage(contact, immediateMessage, companyId, whatsappId);
  
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
  }

  // 3. Crear recordatorio 10 minutos antes
  if (reminderTime.isAfter(moment())) {
    const reminderSchedule = await Schedule.create({
      body: formatReminderMessage(contact),
      sendAt: reminderTime.toDate(),
      contactId,
      companyId,
      userId,
      status: 'PENDENTE',
      isReminderSystem: true,
      reminderType: 'reminder',
      parentScheduleId: mainSchedule.id.toString(),
      reminderStatus: 'pending'
    });

    
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

const formatImmediateMessage = (contact: Contact, body: string, scheduledTime: moment.Moment): string => {
  return `🔔 ${contact.name} hemos agendado una reunión para el:\n\n` +
         `📆Fecha: ${scheduledTime.format('DD/MM/YYYY')}\n` +
         `⏰Hora: ${scheduledTime.format('HH:mm')}\n` +
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