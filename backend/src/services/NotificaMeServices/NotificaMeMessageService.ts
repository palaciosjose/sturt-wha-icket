import { logger } from "../../utils/logger";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import HubNotificaMe from "../../models/HubNotificaMe";

interface NotificaMeMessage {
  id: string;
  text?: string;
  from: string;
  to: string;
  timestamp?: number;
  channel: string;
  direction?: string;
  visitor?: {
    name: string;
    firstName?: string;
    lastName?: string;
    picture?: string;
  };
  contents?: Array<{
    type: string;
    text: string;
  }>;
}

interface NotificaMeContact {
  id: string;
  name: string;
  phone: string;
}

interface ProcessMessageRequest {
  message: NotificaMeMessage;
  hubConfig: HubNotificaMe;
}

interface ProcessContactRequest {
  contact: NotificaMeContact;
  hubConfig: HubNotificaMe;
}

class NotificaMeMessageService {
  // ✅ Procesar mensaje entrante de NotificaMe
  static async processIncomingMessage({
    message,
    hubConfig,
    webhookData
  }: ProcessMessageRequest & { webhookData?: any }): Promise<void> {
    try {
      logger.info(`📨 [NotificaMe] Procesando mensaje de ${message.from} en canal ${message.channel}`);

      // ✅ 1. Crear/actualizar contacto
      const contact = await this.createOrUpdateContact(message, hubConfig, webhookData);
      if (!contact) {
        logger.error(`[NotificaMe] No se pudo crear/actualizar contacto para ${message.from}`);
        return;
      }

      // ✅ 2. Crear/actualizar ticket
      const ticket = await this.findOrCreateTicket(message, contact, hubConfig);
      if (!ticket) {
        logger.error(`[NotificaMe] No se pudo crear/actualizar ticket para contacto ${contact.id}`);
        return;
      }

      // ✅ 3. Crear mensaje en el ticket
      await this.createMessage(message, ticket, contact, hubConfig, webhookData);

      logger.info(`✅ [NotificaMe] Mensaje procesado correctamente - Ticket: ${ticket.id}, Contacto: ${contact.name}`);

    } catch (error) {
      logger.error(`❌ [NotificaMe] Error procesando mensaje: ${error}`);
      throw error;
    }
  }

  // ✅ Procesar contacto de NotificaMe
  static async processContact({
    contact,
    hubConfig
  }: ProcessContactRequest): Promise<void> {
    try {
      logger.info(`👤 [NotificaMe] Procesando contacto ${contact.name} (${contact.phone})`);

      // ✅ Crear/actualizar contacto
      await this.createOrUpdateContactFromContact(contact, hubConfig);

      logger.info(`✅ [NotificaMe] Contacto procesado correctamente: ${contact.name}`);

    } catch (error) {
      logger.error(`❌ [NotificaMe] Error procesando contacto: ${error}`);
      throw error;
    }
  }

  // ✅ Crear/actualizar contacto desde mensaje
  private static async createOrUpdateContact(
    message: NotificaMeMessage,
    hubConfig: HubNotificaMe,
    webhookData?: any // Agregar webhookData completo para acceder a visitor
  ) {
    try {
      const direction = (message.direction || "in").toLowerCase();
      // Para OUT, el "contacto" es el destinatario (to). Para IN, es el remitente (from)
      const externalId = direction === "out" ? message.to : message.from;
      
      // ✅ Extraer visitor desde el lugar correcto del payload
      const visitor = webhookData?.message?.visitor || webhookData?.visitor || {};

      // ✅ Extraer nombre real del visitor desde webhookData.message.visitor
      let visitorName = "Usuario Instagram"; // Nombre por defecto
      if (visitor?.name && String(visitor.name).trim()) {
        visitorName = String(visitor.name).trim();
      } else if (visitor?.firstName && String(visitor.firstName).trim()) {
        visitorName = String(visitor.firstName).trim();
      }

      const contactData = {
        name: visitorName,
        number: externalId,
        email: "",
        companyId: hubConfig.companyId,
        isGroup: false, // NotificaMe no maneja grupos
        channel: message.channel,
        profilePicUrl: visitor?.picture || ""
      };

      const contact = await CreateOrUpdateContactService(contactData);
      logger.info(`✅ [NotificaMe] Contacto creado/actualizado: ${contact.name} (ID: ${externalId})`);

      return contact;
    } catch (error) {
      logger.error(`❌ [NotificaMe] Error creando/actualizando contacto: ${error}`);
      return null;
    }
  }

  // ✅ Crear/actualizar contacto desde datos de contacto
  private static async createOrUpdateContactFromContact(
    contact: NotificaMeContact,
    hubConfig: HubNotificaMe
  ) {
    try {
      const contactData = {
        name: contact.name,
        number: contact.phone,
        email: "",
        companyId: hubConfig.companyId,
        isGroup: false,
        channel: "notificame" // Canal por defecto
      };

      const createdContact = await CreateOrUpdateContactService(contactData);
      logger.info(`✅ [NotificaMe] Contacto creado/actualizado: ${createdContact.name}`);

      return createdContact;
    } catch (error) {
      logger.error(`❌ [NotificaMe] Error creando/actualizando contacto: ${error}`);
      return null;
    }
  }

  // ✅ Encontrar o crear ticket
  private static async findOrCreateTicket(
    message: NotificaMeMessage,
    contact: any,
    hubConfig: HubNotificaMe
  ) {
    try {
      const direction = (message.direction || "in").toLowerCase();
      const unread = direction === "out" ? 0 : 1;
      // ✅ Importar dinámicamente para evitar dependencias circulares
      const FindOrCreateTicketService = (await import("../TicketServices/FindOrCreateTicketService")).default;
      
      // ✅ Llamar con los parámetros correctos según la firma del servicio
      const ticket = await FindOrCreateTicketService(
        contact,           // contact: Contact
        0,                 // whatsappId: number (0 para NotificaMe)
        unread,            // unreadMessages según dirección
        hubConfig.companyId, // companyId: number
        undefined          // groupContact?: Contact (no aplica para NotificaMe)
      );
      
      logger.info(`✅ [NotificaMe] Ticket encontrado/creado: ${ticket.id}`);

      return ticket;
    } catch (error) {
      logger.error(`❌ [NotificaMe] Error creando/buscando ticket: ${error}`);
      return null;
    }
  }

  // ✅ Crear mensaje en el ticket
  private static async createMessage(
    message: NotificaMeMessage,
    ticket: any,
    contact: any,
    hubConfig: HubNotificaMe,
    webhookData?: any
  ) {
    try {
      const direction = (message.direction || "in").toLowerCase();
      
      // ✅ Extraer texto del mensaje desde webhookData.message.contents
      let messageText = "";
      if (webhookData?.message?.contents && Array.isArray(webhookData.message.contents)) {
        const textContent = webhookData.message.contents.find((c: any) => c?.type === "text");
        messageText = textContent?.text || "";
      } else if (message.text) {
        messageText = message.text;
      }
      
      // Si no hay texto, usar un mensaje por defecto
      if (!messageText.trim()) {
        messageText = direction === "in" ? "Mensaje recibido" : "Mensaje enviado";
      }
      
      const messageData = {
        id: `notificame_${message.id}`, // ID único para NotificaMe
        ticketId: ticket.id,
        body: messageText,
        contactId: contact.id,
        fromMe: direction === "out", // OUT -> enviado por nosotros
        read: false,
        mediaType: "text",
        companyId: hubConfig.companyId
      };

      const createdMessage = await CreateMessageService({
        messageData,
        companyId: hubConfig.companyId
      });

      logger.info(`✅ [NotificaMe] Mensaje creado: ${createdMessage.id} en ticket ${ticket.id} - Texto: "${messageText}"`);

      return createdMessage;
    } catch (error) {
      logger.error(`❌ [NotificaMe] Error creando mensaje: ${error}`);
      return null;
    }
  }
}

export default NotificaMeMessageService;
