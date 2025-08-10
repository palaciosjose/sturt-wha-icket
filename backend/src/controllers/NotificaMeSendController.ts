import { Request, Response } from "express";
import { logger } from "../utils/logger";
import NotificaMeSendMessageService from "../services/NotificaMeServices/NotificaMeSendMessageService";
import AppError from "../errors/AppError";

interface SendMessageRequest {
  ticketId: number;
  body: string;
  channel?: string;
}

export const sendMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { ticketId, body, channel = "whatsapp" } = req.body as SendMessageRequest;
    const companyId = req.user?.companyId;

    // ✅ Validar datos requeridos
    if (!ticketId || !body || !companyId) {
      logger.error(`❌ [NotificaMe] Datos faltantes - Ticket: ${ticketId}, Body: ${body}, Company: ${companyId}`);
      return res.status(400).json({ 
        error: "Datos requeridos: ticketId, body, companyId" 
      });
    }

    // ✅ Validar que el ticket pertenece a la empresa del usuario
    if (!companyId) {
      logger.error(`❌ [NotificaMe] Usuario sin empresa asignada`);
      return res.status(401).json({ 
        error: "Usuario no autorizado" 
      });
    }

    logger.info(`📤 [NotificaMe] Enviando mensaje - Ticket: ${ticketId}, Empresa: ${companyId}`);

    // ✅ Obtener contactId del ticket
    const contactId = await getContactIdFromTicket(ticketId, companyId);
    if (!contactId) {
      logger.error(`❌ [NotificaMe] No se pudo obtener contactId del ticket ${ticketId}`);
      return res.status(404).json({ 
        error: "Ticket no encontrado o sin contacto asociado" 
      });
    }

    // ✅ Enviar mensaje a través de NotificaMe
    const success = await NotificaMeSendMessageService.sendMessage({
      ticketId,
      body,
      contactId,
      companyId,
      channel
    });

    if (success) {
      logger.info(`✅ [NotificaMe] Mensaje enviado correctamente - Ticket: ${ticketId}`);
      return res.status(200).json({ 
        success: true, 
        message: "Mensaje enviado correctamente" 
      });
    } else {
      logger.error(`❌ [NotificaMe] Error enviando mensaje - Ticket: ${ticketId}`);
      return res.status(500).json({ 
        error: "Error enviando mensaje a través de NotificaMe" 
      });
    }

  } catch (error) {
    logger.error(`❌ [NotificaMe] Error en envío de mensaje: ${error}`);
    return res.status(500).json({ 
      error: "Error interno del servidor" 
    });
  }
};

// ✅ Obtener contactId del ticket
const getContactIdFromTicket = async (ticketId: number, companyId: number): Promise<number | null> => {
  try {
    // Importar dinámicamente para evitar dependencias circulares
    const Ticket = (await import("../models/Ticket")).default;
    
    const ticket = await Ticket.findOne({
      where: {
        id: ticketId,
        companyId
      },
      attributes: ["contactId"]
    });

    return ticket?.contactId || null;
  } catch (error) {
    logger.error(`❌ [NotificaMe] Error obteniendo contactId del ticket: ${error}`);
    return null;
  }
};

// ✅ Verificar estado de un mensaje
export const checkMessageStatus = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { messageId } = req.params;
    const { channel = "whatsapp" } = req.query;
    const companyId = req.user?.companyId;

    if (!messageId || !companyId) {
      return res.status(400).json({ 
        error: "Datos requeridos: messageId, companyId" 
      });
    }

    // ✅ Obtener configuración del hub
    const HubNotificaMe = (await import("../models/HubNotificaMe")).default;
    const hubConfig = await HubNotificaMe.findOne({
      where: {
        companyId,
        tipo: channel as string
      }
    });

    if (!hubConfig) {
      return res.status(404).json({ 
        error: "Configuración de NotificaMe no encontrada" 
      });
    }

    // ✅ Verificar estado del mensaje
    const status = await NotificaMeSendMessageService.checkMessageStatus(messageId, hubConfig);

    if (status) {
      return res.status(200).json({ 
        success: true, 
        status 
      });
    } else {
      return res.status(404).json({ 
        error: "No se pudo verificar el estado del mensaje" 
      });
    }

  } catch (error) {
    logger.error(`❌ [NotificaMe] Error verificando estado del mensaje: ${error}`);
    return res.status(500).json({ 
      error: "Error interno del servidor" 
    });
  }
};
