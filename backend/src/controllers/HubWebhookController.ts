import { Request, Response } from "express";
import HubNotificaMe from "../models/HubNotificaMe";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";
import { notificameConfig, validateNotificaMeConfig } from "../config/notificame";
import NotificaMeMessageService from "../services/NotificaMeServices/NotificaMeMessageService";

interface WebhookData {
  type: string;
  data: {
    message?: {
      id: string;
      text: string;
      from: string;
      to: string;
      timestamp: number;
      channel: string;
    };
    contact?: {
      id: string;
      name: string;
      phone: string;
    };
  };
}

export const handleWebhook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    // ✅ Validar configuración de NotificaMe
    if (!notificameConfig.webhook.enabled) {
      logger.warn(`⚠️ [NotificaMe] Webhook deshabilitado en configuración`);
      return res.status(503).json({ error: "Webhook no disponible" });
    }

    const { token } = req.params;
    const webhookData: WebhookData = req.body;

    // ✅ Validar token contra tabla HubNotificaMe
    const hubConfig = await HubNotificaMe.findOne({
      where: { token }
    });

    if (!hubConfig) {
      logger.error(`Webhook token inválido: ${token}`);
      return res.status(401).json({ error: "Token inválido" });
    }

    // ✅ Log del webhook recibido
    logger.info(`📬 WEBHOOK RECIBIDO - Empresa: ${hubConfig.companyId}, Tipo: ${webhookData.type}`);

    // ✅ Validar estructura del webhook
    if (!webhookData.type || !webhookData.data) {
      logger.error("Estructura de webhook inválida");
      return res.status(400).json({ error: "Estructura inválida" });
    }

    // ✅ Procesar según el tipo de mensaje
    switch (webhookData.type) {
      case "message":
        if (webhookData.data.message) {
          // ✅ Procesar mensaje entrante usando el servicio
          await NotificaMeMessageService.processIncomingMessage({
            message: webhookData.data.message,
            hubConfig
          });
        }
        break;
      
      case "contact":
        if (webhookData.data.contact) {
          // ✅ Procesar contacto usando el servicio
          await NotificaMeMessageService.processContact({
            contact: webhookData.data.contact,
            hubConfig
          });
        }
        break;
      
      default:
        logger.warn(`Tipo de webhook no manejado: ${webhookData.type}`);
    }

    // ✅ Respuesta exitosa
    return res.status(200).json({ 
      success: true, 
      message: "Webhook procesado correctamente" 
    });

  } catch (error) {
    logger.error(`Error en webhook: ${error}`);
    return res.status(500).json({ 
      error: "Error interno del servidor" 
    });
  }
};

// ✅ Las funciones de procesamiento ahora están en NotificaMeMessageService
