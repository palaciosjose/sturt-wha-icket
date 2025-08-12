import { WAMessage } from "@whiskeysockets/baileys";
import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import SendNotificaMeMessageService from "../NotificaMeServices/SendNotificaMeMessageService";
import { logger } from "../../utils/logger";

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
  isForwarded?: boolean;
}

const SendMessageService = async ({
  body,
  ticket,
  quotedMsg,
  isForwarded = false
}: Request): Promise<WAMessage | any> => {
  try {
    logger.info(`📤 [SendMessageService] Enviando mensaje a ticket ${ticket.id} en canal ${ticket.channel}`);

    // ✅ DETECTAR CANAL Y ENVIAR POR LA RUTA CORRECTA
    if (ticket.channel === "whatsapp") {
      // ✅ ENVIAR POR WHATSAPP
      logger.info(`📱 [SendMessageService] Enviando por WhatsApp`);
      return await SendWhatsAppMessage({
        body,
        ticket,
        quotedMsg,
        isForwarded
      });
    } else {
      // ✅ ENVIAR POR NOTIFICAME
      logger.info(`📡 [SendMessageService] Enviando por NotificaMe (${ticket.channel})`);
      
      // ✅ CARGAR CONTACTO COMPLETO
      const contact = await Contact.findByPk(ticket.contactId);
      if (!contact) {
        throw new Error("Contacto no encontrado");
      }

      return await SendNotificaMeMessageService({
        message: body,
        ticketId: ticket.id,
        contact,
        companyId: ticket.companyId
      });
    }

  } catch (error) {
    logger.error(`❌ [SendMessageService] Error enviando mensaje: ${error}`);
    throw new AppError("ERR_SENDING_MESSAGE");
  }
};

export default SendMessageService;
