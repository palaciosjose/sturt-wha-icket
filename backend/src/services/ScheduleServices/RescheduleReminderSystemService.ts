import Schedule from "../../models/Schedule";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import { SendMessage } from "../../helpers/SendMessage";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import moment from "moment";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";
import { Op } from "sequelize";
import { CreateReminderSystemService } from "./ReminderSystemService";

interface RescheduleReminderSystemRequest {
  scheduleId: number;
  newSendAt: string;
  companyId: number;
  userId: number;
}

const RescheduleReminderSystemService = async ({
  scheduleId,
  newSendAt,
  companyId,
  userId
}: RescheduleReminderSystemRequest): Promise<Schedule> => {
  
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

    // Buscar todos los agendamientos relacionados para eliminar
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

    

    // Eliminar todos los agendamientos relacionados
    for (const schedule of relatedSchedules) {
      await schedule.destroy();
    }

    // Enviar mensaje de reprogramación
    const rescheduleMessage = formatRescheduleMessage(mainSchedule.contact, mainSchedule.body, newSendAt);
    const sentMessage = await sendRescheduleMessage(mainSchedule.contact, rescheduleMessage, companyId);
    
    // Guardar mensaje en la base de datos
    if (sentMessage) {
      // Buscar ticket existente para el contacto
      const ticket = await Ticket.findOne({
        where: { contactId: mainSchedule.contactId, companyId },
        order: [["createdAt", "DESC"]]
      });

      if (!ticket) {
        throw new Error("No se encontró ticket para el contacto");
      }

      const messageId = `reschedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await Message.create({
        id: messageId,
        body: rescheduleMessage,
        fromMe: true,
        read: true,
        mediaUrl: null,
        mediaType: null,
        contactId: mainSchedule.contactId,
        companyId: companyId,
        ticketId: ticket.id, // ✅ Usar el ticket correcto
        ack: 1,
        reactions: []
      });

      // Actualizar lastMessage del ticket
      await ticket.update({ lastMessage: rescheduleMessage });
    }

    // Crear nuevo sistema de recordatorios con la nueva fecha (sin mensaje inmediato)
    const newSchedule = await createRescheduledReminderSystem({
      body: mainSchedule.body,
      sendAt: newSendAt,
      contactId: mainSchedule.contactId,
      companyId,
      userId
    });

    // Notificar por socket
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit("schedule", {
      action: "update",
      schedule: newSchedule
    });

    

    return newSchedule;

  } catch (error) {
    logger.error(`[RescheduleReminderSystem] ❌ Error reprogramando reunión:`, error);
    throw error;
  }
};

const formatRescheduleMessage = (contact: Contact, body: string, newSendAt: string): string => {
  const newScheduledMoment = moment(newSendAt);
  return `🔄 ${contact.name} hemos reprogramado la reunión para:\n\n` +
         `📆 Fecha: ${newScheduledMoment.format('DD/MM/YYYY')}\n` +
         `⏰ Hora: ${newScheduledMoment.format('HH:mm')}\n` +
         `🎯 Tema: ${body}\n\n` +
         `👋 Nos vemos en ese tiempo, Saludos`;
};

const createRescheduledReminderSystem = async ({
  body,
  sendAt,
  contactId,
  companyId,
  userId
}: {
  body: string;
  sendAt: string;
  contactId: number;
  companyId: number;
  userId: number;
}): Promise<Schedule> => {
  
  const contact = await Contact.findByPk(contactId);
  if (!contact) {
    throw new Error("Contacto no encontrado");
  }

  const scheduledTime = moment(sendAt);
  const reminderTime = moment(sendAt).subtract(10, 'minutes');

  // 1. Crear el agendamiento principal (sin mensaje inmediato)
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

  // 2. Crear recordatorio 10 minutos antes (sin mensaje inmediato)
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

  // 3. Actualizar el agendamiento principal con su ID como parentScheduleId
  await mainSchedule.update({
    parentScheduleId: mainSchedule.id.toString()
  });

  return mainSchedule;
};

const formatReminderMessage = (contact: Contact): string => {
  return `🚨${contact.name} en 10 minutos inicia nuestra cita\n\n` +
         `👋Nos vemos en minutos`;
};

const sendRescheduleMessage = async (contact: Contact, message: string, companyId: number): Promise<boolean> => {
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
    logger.error(`[RescheduleReminderSystem] ❌ Error enviando mensaje de reprogramación a ${contact.name}:`, error);
    throw error;
  }
};

export { RescheduleReminderSystemService, formatRescheduleMessage, sendRescheduleMessage }; 