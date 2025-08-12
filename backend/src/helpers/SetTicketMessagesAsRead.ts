import { getIO } from "../libs/socket";
import Message from "../models/Message";
import Ticket from "../models/Ticket";
import GetTicketWbot from "./GetTicketWbot";
import { logger } from "../utils/logger";

const SetTicketMessagesAsRead = async (ticket: Ticket): Promise<void> => {
  try {
    // ✅ SOLUCIÓN CORREGIDA: Ahora GetTicketWbot siempre retorna un wbot válido
    const wbot = await GetTicketWbot(ticket);

    if (!wbot) {
      logger.warn(`No se pudo obtener wbot para ticket ${ticket.id}`);
      return;
    }

    // ✅ MARCAR MENSAJES COMO LEÍDOS VÍA WHATSAPP
    // Usar la sintaxis correcta de Baileys para marcar como leído
    const getJsonMessage = await Message.findAll({
      where: {
        ticketId: ticket.id,
        fromMe: false,
        read: false
      },
      order: [["createdAt", "DESC"]]
    });

    if (getJsonMessage.length > 0) {
      const lastMessages = JSON.parse(getJsonMessage[0].dataJson);
      
      if (lastMessages.key && lastMessages.key.fromMe === false) {
        await wbot.chatModify(
          { markRead: true, lastMessages: [lastMessages] },
          `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`
        );
      }
    }

    // ✅ MARCAR MENSAJES COMO LEÍDOS EN BASE DE DATOS
    await Message.update(
      { read: true },
      {
        where: {
          ticketId: ticket.id,
          read: false
        }
      }
    );

    // ✅ EMITIR EVENTO DE SOCKET
    const io = getIO();
    io.to(`company-${ticket.companyId}-mainchannel`).emit(`company-${ticket.companyId}-ticket`, {
      action: "updateUnread",
      ticketId: ticket.id
    });

  } catch (err) {
    logger.warn(
      `Could not mark messages as read. Maybe whatsapp session disconnected? Err: ${err}`
    );
  }
};

export default SetTicketMessagesAsRead;
