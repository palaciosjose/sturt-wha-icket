import { logger } from "../../utils/logger";
import HubNotificaMe from "../../models/HubNotificaMe";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { notificameConfig, getChannelConfig } from "../../config/notificame";
import axios from "axios";

interface SendMessageRequest {
  ticketId: number;
  body: string;
  contactId: number;
  companyId: number;
  channel?: string;
}

interface NotificaMeApiResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

class NotificaMeSendMessageService {
  // ✅ Enviar mensaje a través de NotificaMe
  static async sendMessage({
    ticketId,
    body,
    contactId,
    companyId,
    channel = "whatsapp" // Canal por defecto
  }: SendMessageRequest): Promise<boolean> {
    try {
      logger.info(`📤 [NotificaMe] Enviando mensaje - Ticket: ${ticketId}, Contacto: ${contactId}`);

      // ✅ 1. Obtener configuración del hub para la empresa
      const hubConfig = await this.getHubConfig(companyId, channel);
      if (!hubConfig) {
        logger.error(`❌ [NotificaMe] No se encontró configuración para empresa ${companyId} y canal ${channel}`);
        return false;
      }

      // ✅ 2. Obtener información del contacto
      const contact = await this.getContactInfo(contactId);
      if (!contact) {
        logger.error(`❌ [NotificaMe] No se pudo obtener información del contacto ${contactId}`);
        return false;
      }

      // ✅ 3. Validar longitud del mensaje según el canal
      const channelConfig = getChannelConfig(channel);
      if (body.length > channelConfig.maxLength) {
        logger.error(`❌ [NotificaMe] Mensaje demasiado largo para canal ${channel}: ${body.length}/${channelConfig.maxLength}`);
        return false;
      }

      // ✅ 4. Enviar mensaje a través de la API de NotificaMe
      const apiResponse = await this.sendToNotificaMe({
        body,
        to: contact.number,
        channel,
        hubConfig
      });

      if (!apiResponse.success) {
        logger.error(`❌ [NotificaMe] Error enviando mensaje: ${apiResponse.error}`);
        return false;
      }

      // ✅ 5. Crear mensaje en la base de datos local
      await this.createLocalMessage({
        ticketId,
        body,
        contactId,
        companyId,
        messageId: apiResponse.messageId
      });

      logger.info(`✅ [NotificaMe] Mensaje enviado correctamente - Ticket: ${ticketId}, API ID: ${apiResponse.messageId}`);

      return true;

    } catch (error) {
      logger.error(`❌ [NotificaMe] Error enviando mensaje: ${error}`);
      return false;
    }
  }

  // ✅ Obtener configuración del hub para la empresa
  private static async getHubConfig(companyId: number, channel: string): Promise<HubNotificaMe | null> {
    try {
      const hubConfig = await HubNotificaMe.findOne({
        where: {
          companyId,
          tipo: channel
        }
      });

      if (!hubConfig) {
        logger.warn(`⚠️ [NotificaMe] No se encontró configuración para empresa ${companyId} y canal ${channel}`);
        return null;
      }

      return hubConfig;
    } catch (error) {
      logger.error(`❌ [NotificaMe] Error obteniendo configuración del hub: ${error}`);
      return null;
    }
  }

  // ✅ Obtener información del contacto
  private static async getContactInfo(contactId: number): Promise<any> {
    try {
      // Importar dinámicamente para evitar dependencias circulares
      const Contact = (await import("../../models/Contact")).default;
      
      const contact = await Contact.findByPk(contactId);
      if (!contact) {
        logger.error(`❌ [NotificaMe] Contacto ${contactId} no encontrado`);
        return null;
      }

      return contact;
    } catch (error) {
      logger.error(`❌ [NotificaMe] Error obteniendo información del contacto: ${error}`);
      return null;
    }
  }

  // ✅ Enviar mensaje a la API de NotificaMe
  private static async sendToNotificaMe({
    body,
    to,
    channel,
    hubConfig
  }: {
    body: string;
    to: string;
    channel: string;
    hubConfig: HubNotificaMe;
  }): Promise<NotificaMeApiResponse> {
    try {
      // ✅ URL base de la API de NotificaMe (configurable)
      const apiUrl = notificameConfig.api.baseUrl;
      
      const payload = {
        token: hubConfig.token,
        channel: channel,
        to: to,
        message: body,
        type: "text"
      };

      if (notificameConfig.logging.includeApiCalls) {
        logger.info(`📡 [NotificaMe] Enviando a API: ${apiUrl}/send`);
        logger.debug(`📡 [NotificaMe] Payload: ${JSON.stringify(payload)}`);
      }

      const response = await axios.post(`${apiUrl}/send`, payload, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${hubConfig.token}`
        },
        timeout: notificameConfig.api.timeout
      });

      if (response.status === 200 && response.data.success) {
        return {
          success: true,
          messageId: response.data.messageId || `notificame_${Date.now()}`
        };
      } else {
        return {
          success: false,
          error: response.data.error || "Respuesta no exitosa de la API"
        };
      }

    } catch (error: any) {
      if (error.response) {
        // Error de respuesta de la API
        logger.error(`❌ [NotificaMe] Error de API: ${error.response.status} - ${error.response.data?.error || error.message}`);
        return {
          success: false,
          error: `Error de API: ${error.response.status}`
        };
      } else if (error.request) {
        // Error de timeout o conexión
        logger.error(`❌ [NotificaMe] Error de conexión: ${error.message}`);
        return {
          success: false,
          error: "Error de conexión con la API"
        };
      } else {
        // Error general
        logger.error(`❌ [NotificaMe] Error general: ${error.message}`);
        return {
          success: false,
          error: error.message
        };
      }
    }
  }

  // ✅ Crear mensaje local en la base de datos
  private static async createLocalMessage({
    ticketId,
    body,
    contactId,
    companyId,
    messageId
  }: {
    ticketId: number;
    body: string;
    contactId: number;
    companyId: number;
    messageId?: string;
  }): Promise<void> {
    try {
      const messageData = {
        id: messageId || `notificame_out_${Date.now()}`,
        ticketId,
        body,
        contactId,
        fromMe: true, // Mensaje saliente
        read: true,
        mediaType: "text",
        companyId
      };

      await CreateMessageService({
        messageData,
        companyId
      });

      logger.info(`✅ [NotificaMe] Mensaje local creado: ${messageData.id} en ticket ${ticketId}`);

    } catch (error) {
      logger.error(`❌ [NotificaMe] Error creando mensaje local: ${error}`);
      // No lanzar error para no interrumpir el flujo
    }
  }

  // ✅ Verificar estado de envío de un mensaje
  static async checkMessageStatus(messageId: string, hubConfig: HubNotificaMe): Promise<any> {
    try {
      const apiUrl = process.env.NOTIFICAME_API_URL || "https://api.notificame.com";
      
      const response = await axios.get(`${apiUrl}/status/${messageId}`, {
        headers: {
          "Authorization": `Bearer ${hubConfig.token}`
        },
        timeout: notificameConfig.api.timeout / 2 // Timeout más corto para consultas de estado
      });

      return response.data;
    } catch (error) {
      logger.error(`❌ [NotificaMe] Error verificando estado del mensaje: ${error}`);
      return null;
    }
  }
}

export default NotificaMeSendMessageService;
