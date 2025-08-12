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

const GetTicketWbot = async (ticket: Ticket): Promise<Session> => {
  // ✅ SOLUCIÓN CORREGIDA: Como en la versión anterior que funcionaba
  if (!ticket.whatsappId) {
    // Para tickets de NotificaMe, asignar WhatsApp por defecto
    const defaultWhatsapp = await GetDefaultWhatsApp(ticket.companyId);
    
    if (defaultWhatsapp) {
      // ✅ ACTUALIZAR EL TICKET CON EL WHATSAPP POR DEFECTO
      await ticket.update({ whatsappId: defaultWhatsapp.id });
      logger.info(`Ticket ${ticket.id} de NotificaMe asignado a WhatsApp por defecto: ${defaultWhatsapp.id}`);
    } else {
      throw new Error("No se encontró WhatsApp por defecto para la empresa");
    }
  }

  const wbot = getWbot(ticket.whatsappId);
  if (!wbot) {
    throw new Error(`Wbot no encontrado para whatsappId: ${ticket.whatsappId}`);
  }

  return wbot;
};

export default GetTicketWbot;
