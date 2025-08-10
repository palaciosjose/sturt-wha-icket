import { logger } from "../../utils/logger";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import HubNotificaMe from "../../models/HubNotificaMe";

interface NotificaMeMessage {
  id: string;
  text: string;
  from: string;
  to: string;
  timestamp: number;
  channel: string;
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
    hubConfig
  }: ProcessMessageRequest): Promise<void> {
    try {
      logger.info(`📨 [NotificaMe] Procesando mensaje de ${message.from} en canal ${message.channel}`);

      // ✅ 1. Crear/actualizar contacto
      const contact = await this.createOrUpdateContact(message, hubConfig);
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
      await this.createMessage(message, ticket, contact, hubConfig);

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
    hubConfig: HubNotificaMe
  ) {
    try {
      const contactData = {
        name: message.from, // Usar el remitente como nombre temporal
        number: message.from,
        email: "",
        companyId: hubConfig.companyId,
        isGroup: false, // NotificaMe no maneja grupos
        channel: message.channel
      };

      const contact = await CreateOrUpdateContactService(contactData);
      logger.info(`✅ [NotificaMe] Contacto creado/actualizado: ${contact.name}`);

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
      // ✅ Importar dinámicamente para evitar dependencias circulares
      const FindOrCreateTicketService = (await import("../TicketServices/FindOrCreateTicketService")).default;
      
      // ✅ Llamar con los parámetros correctos según la firma del servicio
      const ticket = await FindOrCreateTicketService(
        contact,           // contact: Contact
        0,                 // whatsappId: number (0 para NotificaMe)
        1,                 // unreadMessages: number (1 mensaje entrante)
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
    hubConfig: HubNotificaMe
  ) {
    try {
      const messageData = {
        id: `notificame_${message.id}`, // ID único para NotificaMe
        ticketId: ticket.id,
        body: message.text,
        contactId: contact.id,
        fromMe: false, // Mensaje entrante
        read: false,
        mediaType: "text",
        companyId: hubConfig.companyId
      };

      const createdMessage = await CreateMessageService({
        messageData,
        companyId: hubConfig.companyId
      });

      logger.info(`✅ [NotificaMe] Mensaje creado: ${createdMessage.id} en ticket ${ticket.id}`);

      return createdMessage;
    } catch (error) {
      logger.error(`❌ [NotificaMe] Error creando mensaje: ${error}`);
      return null;
    }
  }
}

export default NotificaMeMessageService;
