import { Op } from "sequelize";
import AppError from "../errors/AppError";
import Ticket from "../models/Ticket";

const CheckContactOpenTickets = async (contactId: number, whatsappId?: string | null, channel?: string): Promise<void> => {
  let ticket;

  // ✅ LÓGICA SIMPLIFICADA: Como en la versión anterior que funcionaba
  if (!whatsappId) {
    // Para tickets de NotificaMe (sin whatsappId), NO verificar duplicados
    // Esto permite múltiples tickets para el mismo contacto en diferentes canales
    return; // ✅ PERMITIR MÚLTIPLES TICKETS DE NOTIFICAME
  } else {
    // Para tickets de WhatsApp, verificar por whatsappId específico
    ticket = await Ticket.findOne({
      where: {
        contactId,
        status: { [Op.or]: ["open", "pending"] },
        whatsappId
      }
    });
  }

  if (ticket) {
    throw new AppError("ERR_OTHER_OPEN_TICKET");
  }
};

export default CheckContactOpenTickets;
