import { Request, Response } from "express";
import SendNotificaMeMessageService from "../services/NotificaMeServices/SendNotificaMeMessageService";
import Ticket from "../models/Ticket";
import Contact from "../models/Contact";
import { logger } from "../utils/logger";

// ✅ ENVIAR MENSAJE POR NOTIFICAME (RUTA SEPARADA)
export const sendNotificaMeMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { ticketId, message } = req.body;
    const { companyId } = req.user;

    logger.info(`📤 [NotificaMe] Enviando mensaje a ticket ${ticketId}`);

    // ✅ VALIDAR DATOS
    if (!ticketId || !message) {
      return res.status(400).json({
        error: "ticketId y message son requeridos"
      });
    }

    // ✅ BUSCAR TICKET
    const ticket = await Ticket.findByPk(ticketId, {
      include: ["contact"]
    });

    if (!ticket) {
      return res.status(404).json({
        error: "Ticket no encontrado"
      });
    }

    // ✅ VERIFICAR QUE SEA UN TICKET DE NOTIFICAME
    if (ticket.channel === "whatsapp") {
      return res.status(400).json({
        error: "Este ticket es de WhatsApp, use la ruta de WhatsApp"
      });
    }

    // ✅ VERIFICAR QUE EL USUARIO TENGA ACCESO AL TICKET
    if (ticket.companyId !== companyId) {
      return res.status(403).json({
        error: "No tienes acceso a este ticket"
      });
    }

    // ✅ ENVIAR MENSAJE POR NOTIFICAME
    const sentMessage = await SendNotificaMeMessageService({
      message,
      ticketId: ticket.id,
      contact: ticket.contact,
      companyId
    });

    logger.info(`✅ [NotificaMe] Mensaje enviado exitosamente - ID: ${sentMessage.id}`);

    return res.json({
      success: true,
      message: sentMessage,
      ticketId: ticket.id
    });

  } catch (error) {
    logger.error(`❌ [NotificaMe] Error enviando mensaje: ${error}`);
    return res.status(500).json({
      error: "Error interno del servidor",
      details: error.message
    });
  }
};

// ✅ OBTENER ESTADO DE ENVÍO
export const getNotificaMeStatus = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { companyId } = req.user;

    // ✅ BUSCAR CONFIGURACIONES ACTIVAS DE NOTIFICAME
    const HubNotificaMe = require("../models/HubNotificaMe").default;
    const activeChannels = await HubNotificaMe.findAll({
      where: {
        companyId,
        active: true
      },
      attributes: ["tipo", "active", "createdAt"]
    });

    return res.json({
      success: true,
      activeChannels,
      totalChannels: activeChannels.length
    });

  } catch (error) {
    logger.error(`❌ [NotificaMe] Error obteniendo estado: ${error}`);
    return res.status(500).json({
      error: "Error interno del servidor"
    });
  }
};
