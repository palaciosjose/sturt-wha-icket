require("dotenv").config();
const { Client, TextContent, FileContent } = require("notificamehubsdk");
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import { showHubToken } from "../../helpers/showHubToken";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";

// ✅ FUNCIÓN PARA SELECCIONAR CANAL Y NÚMERO DE CONTACTO
const selectChannelAndContactNumber = (contact: Contact, client: typeof Client) => {
  let channelClient;
  let contactNumber;
  let channelType;

  // ✅ DETECTAR CANAL BASADO EN EL MODELO DE CONTACTO
  if (contact.channel === "facebook") {
    contactNumber = contact.messengerId || contact.number;
    channelType = "facebook";
  } else if (contact.channel === "instagram") {
    contactNumber = contact.instagramId || contact.number;
    channelType = "instagram";
  } else if (contact.channel === "webchat") {
    contactNumber = contact.number;
    channelType = "webchat";
  } else {
    // ✅ CANAL POR DEFECTO
    contactNumber = contact.number;
    channelType = contact.channel || "whatsapp";
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
    logger.info(`📤 [NotificaMe] Enviando mensaje a ticket ${ticketId} en canal ${contact.channel}`);

    // ✅ BUSCAR TICKET Y OBTENER COMPANY ID
    const ticket = await Ticket.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new Error(`Ticket con ID ${ticketId} no encontrado`);
    }

    // ✅ OBTENER TOKEN DE NOTIFICAME
    let notificameHubToken;
    try {
      notificameHubToken = await showHubToken(companyId);
    } catch (err) {
      throw new Error("Error al obtener el token de NotificameHub: " + err.message);
    }

    // ✅ CREAR CLIENTE DE NOTIFICAME
    const client = new Client(notificameHubToken);
    
    // ✅ SELECCIONAR CANAL Y NÚMERO DE CONTACTO
    logger.info(`🔍 [NotificaMe] Contacto recibido - channel: ${contact.channel}, messengerId: ${contact.messengerId}, instagramId: ${contact.instagramId}, number: ${contact.number}`);
    
    const { channelClient, contactNumber, channelType } = selectChannelAndContactNumber(contact, client);
    
    logger.info(`🔍 [NotificaMe] Resultado selección - channelClient: ${!!channelClient}, contactNumber: ${contactNumber}, channelType: ${channelType}`);
    
    if (!channelClient || !contactNumber) {
      throw new Error(`No se pudo seleccionar el canal de comunicación adecuado. channelClient: ${!!channelClient}, contactNumber: ${contactNumber}, channelType: ${channelType}`);
    }

    // ✅ LIMPIAR MENSAJE (remover saltos de línea)
    const cleanMessage = message.replace(/\n/g, " ");
    const content = new TextContent(cleanMessage);

    logger.info(`📤 [NotificaMe] Enviando mensaje: "${cleanMessage}" a ${contactNumber} por ${channelType}`);

    // ✅ ENVIAR MENSAJE A TRAVÉS DE NOTIFICAME
    const response = await channelClient.sendMessage(contactNumber, content);

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
