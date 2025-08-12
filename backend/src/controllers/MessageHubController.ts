import { Request, Response } from "express";
import User from "../models/User";
import { getIO } from "../libs/socket";
import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";
import SendNotificaMeMessageService from "../services/NotificaMeServices/SendNotificaMeMessageService";
import { logger } from "../utils/logger";

interface TicketData {
  contactId: number;
  status: string;
  queueId: number;
  userId: number;
  channel: string;
  companyId: number;
}

export const send = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  logger.info(`🏢 [MessageHub] Enviando mensaje - Company ID: ${companyId}`);

  const { body: message } = req.body;
  const { ticketId } = req.params;
  const medias = req.files as Express.Multer.File[];

  logger.info(`📤 [MessageHub] Mensaje: "${message}", Ticket: ${ticketId}, Medias: ${medias?.length || 0}`);

  const ticket = await Ticket.findOne({
    where: { id: ticketId, companyId },
    include: [
      {
        model: Contact,
        as: "contact"
      }
    ]
  });

  if (!ticket) {
    return res.status(404).json({ message: "Ticket no encontrado" });
  }

  // ✅ DETECTAR CANAL DEL TICKET
  const channelType = ticket.channel || "whatsapp";
  logger.info(`📡 [MessageHub] Canal detectado: ${channelType}`);

  try {
    if (medias && medias.length > 0) {
      // ✅ ENVIAR MEDIA (implementar después)
      logger.info(`🖼️ [MessageHub] Enviando ${medias.length} archivos por ${channelType}`);
      return res.status(200).json({ message: "Envío de media implementado próximamente" });
    } else {
      // ✅ ENVIAR TEXTO POR NOTIFICAME
      if (channelType === "whatsapp") {
        return res.status(400).json({ 
          message: "Para WhatsApp use la ruta /messages" 
        });
      }

      const sentMessage = await SendNotificaMeMessageService({
        message,
        ticketId: ticket.id,
        contact: ticket.contact,
        companyId
      });

      logger.info(`✅ [MessageHub] Mensaje enviado exitosamente por ${channelType}`);
      return res.status(200).json({ 
        message: "Mensaje enviado correctamente",
        messageId: sentMessage.id
      });
    }
  } catch (error) {
    logger.error(`❌ [MessageHub] Error enviando mensaje: ${error}`);
    return res.status(400).json({ 
      message: error.message || "Error interno del servidor" 
    });
  }
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { contactId, status, userId, channel }: TicketData = req.body;
  const { companyId } = req.user;

  logger.info(`📝 [MessageHub] Creando ticket - Canal: ${channel}`);

  try {
    // ✅ CREAR TICKET DE NOTIFICAME
    const ticket = await Ticket.create({
      contactId,
      status,
      userId,
      channel,
      companyId,
      whatsappId: null // Para NotificaMe
    });

    const io = getIO();
    io.to(ticket.status).emit("ticket", {
      action: "update",
      ticket
    });

    logger.info(`✅ [MessageHub] Ticket creado exitosamente - ID: ${ticket.id}`);
    return res.status(200).json(ticket);
  } catch (error) {
    logger.error(`❌ [MessageHub] Error creando ticket: ${error}`);
    return res.status(500).json({ 
      message: "Error interno del servidor" 
    });
  }
};
