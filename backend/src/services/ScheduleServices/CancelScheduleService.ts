import Schedule from "../../models/Schedule";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import GetTimezone from "../../helpers/GetTimezone";
import { SendMessage } from "../../helpers/SendMessage";
import { logger } from "../../utils/logger";
import moment from "moment-timezone";

interface CancelScheduleData {
  scheduleId: number;
  companyId: number;
  userId: number;
}

const CancelScheduleService = async ({
  scheduleId,
  companyId,
  userId
}: CancelScheduleData): Promise<Schedule> => {
  
  const schedule = await Schedule.findOne({
    where: { id: scheduleId, companyId },
    include: [{ model: Contact, as: "contact" }]
  });

  if (!schedule) {
    throw new Error("Agendamiento no encontrado");
  }

  if (schedule.status === "CANCELADO") {
    throw new Error("El agendamiento ya está cancelado");
  }

  if (schedule.status === "ENVIADO") {
    throw new Error("No se puede cancelar un agendamiento ya enviado");
  }

  // Enviar mensaje de cancelación
  const cancelMessage = await formatCancelMessage(schedule.contact, schedule.body, schedule.sendAt, companyId);
  const sentMessage = await sendCancelMessage(schedule.contact, cancelMessage, companyId);

  // Guardar mensaje en la base de datos
  if (sentMessage) {
    // Buscar o crear ticket para el contacto
    let ticket = await Ticket.findOne({
      where: { contactId: schedule.contactId, companyId },
      order: [["createdAt", "DESC"]]
    });

    // Si no existe ticket, crear uno nuevo
    if (!ticket) {
      const whatsapp = await GetDefaultWhatsApp(companyId);
      if (!whatsapp) {
        throw new Error("WhatsApp no configurado para crear ticket");
      }

      ticket = await Ticket.create({
        contactId: schedule.contactId,
        companyId,
        whatsappId: whatsapp.id,
        status: "open",
        unreadMessages: 0,
        lastMessage: cancelMessage
      });
    }

    const messageId = `cancel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await Message.create({
      id: messageId,
      body: cancelMessage,
      fromMe: true,
      read: true,
      mediaUrl: null,
      mediaType: null,
      contactId: schedule.contactId,
      companyId: companyId,
      ticketId: ticket.id, // Usar el ticket correcto
      ack: 1,
      reactions: []
    });

    // Actualizar lastMessage del ticket
    await ticket.update({ lastMessage: cancelMessage });
  }

  // Actualizar estado a CANCELADO
  await schedule.update({
    status: "CANCELADO"
  });

  

  return schedule;
};

const formatCancelMessage = async (contact: Contact, body: string, scheduledTime: Date, companyId: number): Promise<string> => {
  // Obtener zona horaria y convertir a hora local
  const timezone = await GetTimezone(companyId);
  const localTime = moment(scheduledTime).tz(timezone);
  
  return `❎ Hemos cancelado la reunión programada para:\n\n` +
         `📆 Fecha: ${localTime.format('DD/MM/YYYY')}\n` +
         `⏰ Hora: ${localTime.format('HH:mm')}\n` +
         `🎯 Tema: ${body}\n\n` +
         `📞 Contáctanos para reprogramar si es necesario`;
};

const sendCancelMessage = async (contact: Contact, message: string, companyId: number, whatsappId?: number): Promise<boolean> => {
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
    logger.error(`[CancelSchedule] ❌ Error enviando mensaje de cancelación a ${contact.name}:`, error);
    throw error;
  }
};

export { CancelScheduleService, formatCancelMessage, sendCancelMessage }; 