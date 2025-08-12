import { WASocket } from "@whiskeysockets/baileys";
import { getWbot } from "../libs/wbot";
import GetDefaultWhatsApp from "./GetDefaultWhatsApp";
import Ticket from "../models/Ticket";
import { Store } from "../libs/store";
import { logger } from "../utils/logger";

type Session = WASocket & {
  id?: number;
  store?: Store;
};

const GetTicketWbot = async (ticket: Ticket): Promise<Session | null> => {
  try {
    // ✅ VALIDAR SI EL TICKET TIENE WHATSAPP ID
    if (!ticket.whatsappId) {
      // Para tickets de NotificaMe (sin whatsappId), retornar null
      logger.info(`Ticket ${ticket.id} sin whatsappId - Es un ticket de NotificaMe`);
      return null;
    }

    // ✅ VALIDAR SI EL WBOT EXISTE
    const wbot = getWbot(ticket.whatsappId);
    if (!wbot) {
      logger.warn(`Wbot no encontrado para whatsappId: ${ticket.whatsappId}`);
      return null;
    }

    return wbot;
  } catch (err) {
    logger.error(`Error en GetTicketWbot para ticket ${ticket.id}:`, err);
    return null;
  }
};

export default GetTicketWbot;
