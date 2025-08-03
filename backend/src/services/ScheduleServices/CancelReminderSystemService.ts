import Schedule from "../../models/Schedule";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import { SendMessage } from "../../helpers/SendMessage";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import GetTimezone from "../../helpers/GetTimezone";
import moment from "moment-timezone";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";
import { Op } from "sequelize";

interface CancelReminderSystemRequest {
  scheduleId: number;
  companyId: number;
  userId: number;
}

const CancelReminderSystemService = async ({
  scheduleId,
  companyId,
  userId
}: CancelReminderSystemRequest): Promise<void> => {
  
  try {
    // Buscar el agendamiento principal
    const mainSchedule = await Schedule.findOne({
      where: {
        id: scheduleId,
        companyId,
        isReminderSystem: true,
        reminderType: 'start'
      },
      include: [{ model: Contact, as: "contact" }]
    });

    if (!mainSchedule) {
      throw new Error("Agendamiento no encontrado o no es parte del sistema de recordatorios");
    }

    // Buscar todos los agendamientos relacionados (recordatorios)
    const relatedSchedules = await Schedule.findAll({
      where: {
        [Op.or]: [
          { id: scheduleId },
          { parentScheduleId: scheduleId.toString() }
        ],
        companyId,
        isReminderSystem: true
      }
    });

    

    // Cambiar estado de todos los agendamientos relacionados a CANCELADO
    for (const schedule of relatedSchedules) {
      await schedule.update({
        status: "CANCELADO"
      });
    }

    // Enviar mensaje de cancelación
    const cancelMessage = await formatCancelMessage(mainSchedule.contact, mainSchedule.body, mainSchedule.sendAt, companyId);
    const sentMessage = await sendCancelMessage(mainSchedule.contact, cancelMessage, companyId);
    
    // Guardar mensaje en la base de datos
    if (sentMessage) {
      // Buscar o crear ticket para el contacto
      let ticket = await Ticket.findOne({
        where: { contactId: mainSchedule.contactId, companyId },
        order: [["createdAt", "DESC"]]
      });

      // Si no existe ticket, crear uno nuevo
      if (!ticket) {
        const whatsapp = await GetDefaultWhatsApp(companyId);
        if (!whatsapp) {
          throw new Error("WhatsApp no configurado para crear ticket");
        }

        ticket = await Ticket.create({
          contactId: mainSchedule.contactId,
          companyId,
          whatsappId: whatsapp.id,
          status: "open",
          unreadMessages: 0,
          lastMessage: cancelMessage
        });
      }

      const messageId = `cancel_reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await Message.create({
        id: messageId,
        body: cancelMessage,
        fromMe: true,
        read: true,
        mediaUrl: null,
        mediaType: null,
        contactId: mainSchedule.contactId,
        companyId: companyId,
        ticketId: ticket.id, // Usar el ticket correcto
        ack: 1,
        reactions: []
      });

      // Actualizar lastMessage del ticket
      await ticket.update({ lastMessage: cancelMessage });
    }

    // Notificar por socket
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit("schedule", {
      action: "update",
      schedule: mainSchedule
    });

    

  } catch (error) {
    logger.error(`[CancelReminderSystem] ❌ Error cancelando reunión:`, error);
    throw error;
  }
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

const sendCancelMessage = async (contact: Contact, message: string, companyId: number): Promise<boolean> => {
  try {
    const whatsapp = await GetDefaultWhatsApp(companyId);
    if (!whatsapp) {
      throw new Error("WhatsApp no configurado");
    }

    await SendMessage(whatsapp, {
      number: contact.number,
      body: message
    });

    
    return true;
  } catch (error) {
    logger.error(`[CancelReminderSystem] ❌ Error enviando mensaje de cancelación a ${contact.name}:`, error);
    throw error;
  }
};

export { CancelReminderSystemService, formatCancelMessage, sendCancelMessage }; 