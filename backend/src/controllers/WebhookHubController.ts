import { Request, Response } from "express";
import Whatsapp from "../models/Whatsapp";
import HubNotificaMe from "../models/HubNotificaMe";
import { logger } from "../utils/logger";
import NotificaMeMessageService from "../services/NotificaMeServices/NotificaMeMessageService";

export const listen = async (req: Request, res: Response): Promise<Response> => {
  const { channelId } = req.params;

  // ✅ Validación inicial de datos necesarios
  if (!channelId || !req.body) {
    logger.error("Missing channelId or request body");
    return res.status(400).json({ message: "Missing channelId or request body" });
  }

  try {
    // 🔍 Buscar la conexión correspondiente al canal en tabla Whatsapp
    const connection = await Whatsapp.findOne({ where: { qrcode: channelId } });

    if (!connection) {
      logger.warn(`⚠️ No WhatsApp connection found for channelId: ${channelId}`);
      return res.status(404).json({ message: "Whatsapp channel not found" });
    }

    // 🔍 Buscar también en HubNotificaMe para validación adicional
    const hubConfig = await HubNotificaMe.findOne({
      where: { token: channelId }
    });

    if (!hubConfig) {
      logger.warn(`⚠️ No HubNotificaMe config found for channelId: ${channelId}`);
      // No retornamos error aquí, solo log de advertencia
    }

    // ✅ Manejar petición de validación de NotificaMe Hub
    if (req.method === 'GET' || req.query['hub.mode'] === 'subscribe') {
      logger.info(`🔍 [NotificaMe] Validación de webhook recibida para channelId: ${channelId}`);
      return res.status(200).json({
        success: true,
        message: "Webhook validado correctamente"
      });
    }

    // 🛠️ Procesar el mensaje recibido usando NotificaMeMessageService
    if (hubConfig) {
      // Si tenemos configuración de NotificaMe, usar el servicio específico
      const webhookData = req.body;

      // Soportar ambos formatos: antiguo (type: "message", data.message) y nuevo (type: "MESSAGE", message)
      const typeLower = (webhookData.type || "").toString().toLowerCase();

      if (typeLower === "message" && webhookData?.data?.message) {
        await NotificaMeMessageService.processIncomingMessage({
          message: webhookData.data.message,
          hubConfig
        });
      } else if (typeLower === "message" && webhookData?.message) {
        // Formato nuevo: normalizar a la estructura esperada por el servicio
        const rawMsg = webhookData.message;
        const textFromContents = Array.isArray(rawMsg.contents)
          ? (rawMsg.contents.find((c: any) => c?.type === "text")?.text || rawMsg.contents[0]?.text || "")
          : "";

        const normalizedMessage = {
          id: rawMsg.id,
          text: rawMsg.text || textFromContents || "",
          from: rawMsg.from,
          to: rawMsg.to,
          timestamp: Date.parse(rawMsg.timestamp) || Date.now(),
          channel: rawMsg.channel,
          direction: rawMsg.direction
        };

        await NotificaMeMessageService.processIncomingMessage({
          message: normalizedMessage as any,
          hubConfig
        });
      } else if (typeLower === "contact" && (webhookData?.data?.contact || webhookData?.contact)) {
        const contact = webhookData?.data?.contact || webhookData?.contact;
        await NotificaMeMessageService.processContact({
          contact,
          hubConfig
        });
      } else {
        logger.info(`📬 WEBHOOK RECIBIDO - Empresa: ${connection.companyId}, ChannelId: ${channelId}`);
        logger.info(`📝 Contenido del webhook:`, JSON.stringify(req.body, null, 2));
      }
    }

    return res.status(200).json({ message: "Webhook received and processed" });
  } catch (error: any) {
    // ❌ Captura de errores con logging claro
    logger.error("🔥 Error processing webhook:", error);
    return res.status(400).json({ message: error.message || "Unknown error occurred" });
  }
};
