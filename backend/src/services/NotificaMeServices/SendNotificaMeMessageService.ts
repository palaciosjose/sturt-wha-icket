require("dotenv").config();
const { Client, TextContent, FileContent } = require("notificamehubsdk");
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import { showHubToken } from "../../helpers/showHubToken";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";

// ✅ FUNCIÓN PARA SELECCIONAR CANAL Y NÚMERO DE CONTACTO
const selectChannelAndContactNumber = (contact: Contact, client: typeof Client, ticketChannel: string) => {
  let channelClient;
  let contactNumber;
  let channelType;

  // ✅ USAR EL CANAL DEL TICKET COMO PRIORIDAD
  if (ticketChannel === "facebook") {
    contactNumber = contact.messengerId || contact.number;
    channelType = "facebook";
  } else if (ticketChannel === "instagram") {
    contactNumber = contact.instagramId || contact.number;
    channelType = "instagram";
  } else if (ticketChannel === "webchat") {
    contactNumber = contact.number;
    channelType = "webchat";
  } else {
    // ✅ CANAL POR DEFECTO
    contactNumber = contact.number;
    channelType = ticketChannel || "whatsapp";
  }

  // ✅ CORREGIR: Configurar el canal correctamente
  if (channelType && channelType !== "whatsapp") {
    try {
      // ✅ Usar el cliente directamente con el canal configurado
      channelClient = client;
      logger.info(`📡 [NotificaMe] Canal configurado: ${channelType} para contacto ${contactNumber}`);
    } catch (error) {
      logger.error(`❌ [NotificaMe] Error configurando canal ${channelType}: ${error}`);
      throw new Error(`Error configurando canal ${channelType}: ${error.message}`);
    }
  } else {
    // ✅ Para WhatsApp, usar el cliente por defecto
    channelClient = client;
    logger.info(`📡 [NotificaMe] Usando canal por defecto: whatsapp`);
  }

  return { channelClient, contactNumber, channelType };
};

const SendNotificaMeMessageService = async ({
  message,
  ticketId,
  contact,
  companyId
}: {
  message: string;
  ticketId: number;
  contact: Contact;
  companyId: number;
}): Promise<Message> => {
  try {
    // ✅ BUSCAR TICKET Y OBTENER COMPANY ID Y CANAL
    const ticket = await Ticket.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new Error(`Ticket con ID ${ticketId} no encontrado`);
    }

    // ✅ USAR EL CANAL DEL TICKET EN LUGAR DEL CONTACTO
    const ticketChannel = ticket.channel || "whatsapp";
    logger.info(`📤 [NotificaMe] Enviando mensaje a ticket ${ticketId} en canal ${ticketChannel} (ticket) vs ${contact.channel} (contacto)`);

    // ✅ OBTENER TOKEN DE NOTIFICAME
    let notificameHubToken;
    try {
      notificameHubToken = await showHubToken(companyId);
    } catch (err) {
      throw new Error("Error al obtener el token de NotificameHub: " + err.message);
    }

    // ✅ CREAR CLIENTE DE NOTIFICAME
    const client = new Client(notificameHubToken);
    
    // ✅ DEBUG: Verificar el cliente creado
    logger.info(`🔍 [NotificaMe] Cliente creado - Tipo: ${typeof client}, Constructor: ${client.constructor.name}`);
    logger.info(`🔍 [NotificaMe] Métodos del cliente: ${Object.getOwnPropertyNames(client)}`);
    logger.info(`🔍 [NotificaMe] Prototipo del cliente: ${Object.getOwnPropertyNames(Object.getPrototypeOf(client))}`);
    
    // ✅ SELECCIONAR CANAL Y NÚMERO DE CONTACTO
    logger.info(`🔍 [NotificaMe] Contacto recibido - channel: ${contact.channel}, messengerId: ${contact.messengerId}, instagramId: ${contact.instagramId}, number: ${contact.number}`);
    logger.info(`🔍 [NotificaMe] Ticket canal: ${ticketChannel}`);
    
    const { channelClient, contactNumber, channelType } = selectChannelAndContactNumber(contact, client, ticketChannel);
    
    logger.info(`🔍 [NotificaMe] Resultado selección - channelClient: ${!!channelClient}, contactNumber: ${contactNumber}, channelType: ${channelType}`);
    
    if (!channelClient || !contactNumber) {
      throw new Error(`No se pudo seleccionar el canal de comunicación adecuado. channelClient: ${!!channelClient}, contactNumber: ${contactNumber}, channelType: ${channelType}`);
    }

    // ✅ LIMPIAR MENSAJE (remover saltos de línea)
    const cleanMessage = message.replace(/\n/g, " ");
    const content = new TextContent(cleanMessage);

    logger.info(`📤 [NotificaMe] Enviando mensaje: "${cleanMessage}" a ${contactNumber} por ${channelType}`);

    // ✅ ENVIAR MENSAJE A TRAVÉS DE NOTIFICAME
    logger.info(`🔍 [NotificaMe] Tipo de cliente: ${typeof channelClient}, Métodos disponibles: ${Object.getOwnPropertyNames(channelClient)}`);
    
    // ✅ CORREGIR: Usar setChannel y sendMessageBatch
    let response;
    
    try {
      // ✅ 1. Configurar el canal primero
      if (typeof channelClient.setChannel === 'function') {
        const channelClientConfigured = channelClient.setChannel(channelType);
        logger.info(`📡 [NotificaMe] Canal configurado exitosamente: ${channelType}`);
        
        // ✅ 2. Enviar mensaje usando sendMessageBatch
        if (typeof channelClientConfigured.sendMessageBatch === 'function') {
          response = await channelClientConfigured.sendMessageBatch([{
            to: contactNumber,
            content: content
          }]);
          logger.info(`📤 [NotificaMe] Mensaje enviado usando sendMessageBatch`);
        } else {
          throw new Error(`Cliente configurado no tiene sendMessageBatch`);
        }
      } else {
        throw new Error(`Cliente no tiene método setChannel`);
      }
    } catch (error) {
      logger.error(`❌ [NotificaMe] Error en envío: ${error}`);
      throw error;
    }

    // ✅ PARSEAR RESPUESTA
    let data: any;
    try {
      if (typeof response === "string") {
        const jsonStart = response.indexOf("{");
        const jsonResponse = response.substring(jsonStart);
        data = JSON.parse(jsonResponse);
      } else if (typeof response === "object") {
        data = response;
      } else {
        throw new Error("La respuesta no es ni un objeto ni una cadena válida.");
      }
    } catch (error) {
      logger.error("Error al parsear la respuesta:", error);
      throw new Error("La respuesta del servidor no es válida.");
    }

    // ✅ CREAR MENSAJE EN BASE DE DATOS
    const newMessage = await Message.create({
      id: data.id || `notificame_out_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contactId: contact.id,
      companyId,
      body: cleanMessage,
      ticketId,
      fromMe: true,
      ack: 2, // Mensaje enviado
      channel: contact.channel,
      mediaType: "text"
    });

    // ✅ ACTUALIZAR ÚLTIMO MENSAJE DEL TICKET
    await Ticket.update(
      { lastMessage: cleanMessage },
      { where: { id: ticketId } }
    );

    // ✅ EMITIR EVENTOS DE SOCKET
    const io = getIO();
    const updatedTicket = await Ticket.findByPk(ticketId, { include: ["contact"] });

    if (updatedTicket) {
      io.to(updatedTicket.status)
        .to(ticketId.toString())
        .emit("message", {
          action: "create",
          message: newMessage,
          ticket: updatedTicket
        });

      io.to(updatedTicket.status)
        .to(ticketId.toString())
        .emit(`company-${companyId}-ticket`, {
          action: "update",
          ticket: updatedTicket
        });
    }

    logger.info(`✅ [NotificaMe] Mensaje enviado exitosamente - ID: ${newMessage.id}`);
    return newMessage;

  } catch (error) {
    logger.error(`❌ [NotificaMe] Error enviando mensaje: ${error}`);
    throw error;
  }
};

export default SendNotificaMeMessageService;
