import { Request, Response } from "express";
import multer from "multer";
import AppError from "../errors/AppError";

import formatBody from "../helpers/Mustache";
import SetTicketMessagesAsRead from "../helpers/SetTicketMessagesAsRead";
import { getIO } from "../libs/socket";
import Ticket from "../models/Ticket";
import Message from "../models/Message";
import Queue from "../models/Queue";
import User from "../models/User";
import Whatsapp from "../models/Whatsapp";
import { isNil } from "lodash";
import CreateOrUpdateContactService from "../services/ContactServices/CreateOrUpdateContactService";
import SendWhatsAppReaction from "../services/WbotServices/SendWhatsAppReaction";
import ListMessagesService from "../services/MessageServices/ListMessagesService";
import FindOrCreateTicketService from "../services/TicketServices/FindOrCreateTicketService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import CheckContactNumber from "../services/WbotServices/CheckNumber";
import DeleteWhatsAppMessage from "../services/WbotServices/DeleteWhatsAppMessage";
import GetProfilePicUrl from "../services/WbotServices/GetProfilePicUrl";
import ShowContactService from "../services/ContactServices/ShowContactService";
import SendWhatsAppMedia from "../services/WbotServices/SendWhatsAppMedia";
import path from "path";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import EditWhatsAppMessage from "../services/WbotServices/EditWhatsAppMessage";
import ShowMessageService, { GetWhatsAppFromMessage } from "../services/MessageServices/ShowMessageService";
import { logger } from "../utils/logger";

type IndexQuery = {
  pageNumber: string;
};

type MessageData = {
  body: string;
  fromMe: boolean;
  read: boolean;
  quotedMsg?: Message;
  number?: string;
  closeTicket?: true;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { pageNumber } = req.query as IndexQuery;
  const { companyId, profile } = req.user;
  const queues: number[] = [];

  if (profile !== "admin") {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Queue, as: "queues" }]
    });
    user.queues.forEach(queue => {
      queues.push(queue.id);
    });
  }

  const { count, messages, ticket, hasMore } = await ListMessagesService({
    pageNumber,
    ticketId,
    companyId,
    queues
  });

  SetTicketMessagesAsRead(ticket);

  return res.json({ count, messages, ticket, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { body, quotedMsg }: MessageData = req.body;
  const medias = req.files as Express.Multer.File[];
  const { companyId } = req.user;

  const ticket = await ShowTicketService(ticketId, companyId);

  SetTicketMessagesAsRead(ticket);

  console.log('bodyyyyyyyyyy:', body)
  
  // ✅ DETECTAR CANAL DEL TICKET
  const channelType = ticket.channel || "whatsapp";
  logger.info(`📡 [MessageController] Canal detectado: ${channelType} para ticket ${ticketId}`);
  
  const sentMessages = [];
  
  // ✅ ENVIAR SEGÚN CANAL DETECTADO
  if (channelType === "whatsapp") {
    // ✅ ENVÍO POR WHATSAPP (lógica existente)
    if (medias) {
      await Promise.all(
        medias.map(async (media: Express.Multer.File, index) => {
          // ✅ CALCULAR TAMAÑO DEL ARCHIVO
          let fileSize = 0;
          try {
            const fs = require('fs');
            const stats = fs.statSync(media.path);
            fileSize = stats.size;
            console.log(`[MessageController] Tamaño del archivo ${media.originalname}: ${fileSize} bytes`);
          } catch (error) {
            console.log(`[MessageController] Error calculando tamaño: ${error.message}`);
          }
          
          // No enviar el nombre del archivo como caption para evitar texto duplicado
          const bodyToSend = "";
          
          const sentMessage = await SendWhatsAppMedia({ media, ticket, body: bodyToSend, fileSize });
          sentMessages.push(sentMessage);
        })
      );
    } else {
      const sentMessage = await SendWhatsAppMessage({ body, ticket, quotedMsg });
      sentMessages.push(sentMessage);
    }
  } else {
    // ✅ ENVÍO POR NOTIFICAME (nueva lógica)
    logger.info(`📤 [MessageController] Enviando por NotificaMe - Canal: ${channelType}`);
    
    try {
      // ✅ Importar servicio de NotificaMe
      const SendNotificaMeMessageService = (await import("../services/NotificaMeServices/SendNotificaMeMessageService")).default;
      
      if (medias) {
        // ✅ ENVÍO DE MEDIA POR NOTIFICAME (implementar después)
        logger.info(`🖼️ [MessageController] Envío de media por ${channelType} implementado próximamente`);
        return res.status(200).json({ 
          message: "Envío de media implementado próximamente",
          channel: channelType 
        });
      } else {
        // ✅ ENVÍO DE TEXTO POR NOTIFICAME
        const sentMessage = await SendNotificaMeMessageService({
          message: body,
          ticketId: ticket.id,
          contact: ticket.contact,
          companyId
        });
        
        sentMessages.push(sentMessage);
        logger.info(`✅ [MessageController] Mensaje enviado por NotificaMe - ID: ${sentMessage.id}`);
      }
    } catch (error) {
      logger.error(`❌ [MessageController] Error enviando por NotificaMe: ${error}`);
      return res.status(500).json({ 
        error: "Error enviando mensaje por NotificaMe",
        details: error.message 
      });
    }
  }

  // ✅ EMITIR EVENTO SOCKET PARA ACTUALIZACIÓN EN TIEMPO REAL
  const io = getIO();
  sentMessages.forEach((message) => {
    io.to(`company-${companyId}-${ticket.status}`)
      .to(`queue-${ticket.queueId}-${ticket.status}`)
      .to(`company-${companyId}-notification`)
      .to(`queue-${ticket.queueId}-notification`)
      .to(ticket.id.toString())
      .emit(`company-${companyId}-appMessage`, {
        action: "create",
        message,
        ticket,
        contact: ticket.contact
      });
  });

  // ✅ ENVIAR RESPUESTA CON INFORMACIÓN DE LOS MENSAJES ENVIADOS
  return res.json({ 
    success: true, 
    messages: sentMessages,
    ticketId: ticket.id 
  });
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId } = req.params;
  const { companyId } = req.user;

  const message = await DeleteWhatsAppMessage(messageId);

  const io = getIO();
  io.to(message.ticketId.toString()).emit(`company-${companyId}-appMessage`, {
    action: "update",
    message
  });

  return res.send();
};

export const send = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params as unknown as { whatsappId: number };
  const messageData: MessageData = req.body;
  const medias = req.files as Express.Multer.File[];

  // ✅ LOGS SILENCIOSOS - Solo en modo debug
  if (process.env.NODE_ENV === 'development') {
    console.debug('📨 API SEND - messageData:', messageData);
    console.debug('📨 API SEND - whatsappId:', whatsappId);
  }

  try {
    const whatsapp = await Whatsapp.findByPk(whatsappId);

    if (!whatsapp) {
      throw new Error("Conexión WhatsApp no encontrada");
    }

    if (messageData.number === undefined) {
      throw new Error("El número es obligatorio");
    }

    const numberToTest = messageData.number;
    const body = messageData.body;

    const companyId = whatsapp.companyId;

    const CheckValidNumber = await CheckContactNumber(numberToTest, companyId);
    const number = CheckValidNumber.jid.replace(/\D/g, "");
    const profilePicUrl = await GetProfilePicUrl(
      number,
      companyId
    );
    const contactData = {
      name: `${number}`,
      number,
      profilePicUrl,
      isGroup: false,
      companyId
    };

    const contact = await CreateOrUpdateContactService(contactData);

    const ticket = await FindOrCreateTicketService(contact, whatsapp.id!, 0, companyId);

    if (medias) {
      await Promise.all(
        medias.map(async (media: Express.Multer.File) => {
          await req.app.get("queues").messageQueue.add(
            "SendMessage",
            {
              whatsappId,
              data: {
                number,
                body: body ? formatBody(body, contact) : media.originalname,
                mediaPath: media.path,
                fileName: media.originalname
              }
            },
            { removeOnComplete: true, attempts: 3 }
          );
        })
      );
    } else {
      await SendWhatsAppMessage({ body: formatBody(body, contact), ticket });

      await ticket.update({
        lastMessage: body,
      });

    }

    if (messageData.closeTicket) {
      setTimeout(async () => {
        await UpdateTicketService({
          ticketId: ticket.id,
          ticketData: { status: "closed" },
          companyId
        });
      }, 1000);
    }
    
    SetTicketMessagesAsRead(ticket);

    return res.send({ mensagem: "Mensaje enviado exitosamente" });
  } catch (err: any) {
    console.error('❌ API SEND ERROR:', err);
    if (Object.keys(err).length === 0) {
      throw new AppError(
        "No fue posible enviar el mensaje, intente nuevamente en unos instantes"
      );
    } else {
      throw new AppError(err.message);
    }
  }
};

export const addReaction = async (req: Request, res: Response): Promise<Response> => {
  try {
    const {messageId} = req.params;
    const {type} = req.body; // O tipo de reação, por exemplo, 'like', 'heart', etc.
    const {companyId, id} = req.user;

    const message = await Message.findByPk(messageId);

    const ticket = await Ticket.findByPk(message.ticketId, {
      include: ["contact"]
    });

    if (!message) {
      return res.status(404).send({message: "Mensagem não encontrada"});
    }

    // Envia a reação via WhatsApp
    const reactionResult = await SendWhatsAppReaction({
      messageId: messageId,
      ticket: ticket,
      reactionType: type
    });

    // ✅ Asegurar que reactions sea un array antes de agregar la nueva reacción
    const currentReactions = message.reactions || [];
    
    // Atualiza a mensagem com a nova reação no banco de dados (opcional, dependendo da necessidade)
    const updatedMessage = await message.update({
      reactions: [...currentReactions, {type: type, userId: id}]
    });

    const io = getIO();
    io.to(message.ticketId.toString()).emit(`company-${companyId}-appMessage`, {
      action: "update",
      message
    });

    return res.status(200).send({
      message: 'Reação adicionada com sucesso!',
      reactionResult,
      reactions: updatedMessage.reactions
    });
  } catch (error) {
    console.error('Erro ao adicionar reação:', error);
    if (error instanceof AppError) {
      return res.status(400).send({message: error.message});
    }
    return res.status(500).send({message: 'Erro ao adicionar reação', error: error.message});
  }
};

function obterNomeEExtensaoDoArquivo(url) {
  var urlObj = new URL(url);
  var pathname = urlObj.pathname;
  var filename = pathname.split('/').pop();
  var parts = filename.split('.');

  var nomeDoArquivo = parts[0];
  var extensao = parts[1];

  return `${nomeDoArquivo}.${extensao}`;
}

export const forwardMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {

  const { quotedMsg, signMessage, messageId, contactId } = req.body;
  const { id: userId, companyId } = req.user;
  const requestUser = await User.findByPk(userId);

  if (!messageId || !contactId) {
    return res.status(200).send("MessageId or ContactId not found");
  }
  const message = await ShowMessageService(messageId);
  const contact = await ShowContactService(contactId, companyId);

  if (!message) {
    return res.status(404).send("Message not found");
  }
  if (!contact) {
    return res.status(404).send("Contact not found");
  }

  const whatsAppConnectionId = await GetWhatsAppFromMessage(message);
  if (!whatsAppConnectionId) {
    return res.status(404).send('Whatsapp from message not found');
  }

  const ticket = await ShowTicketService(message.ticketId, message.companyId);

  const createTicket = await FindOrCreateTicketService(
    contact,
    ticket?.whatsappId,
    0,
    ticket.companyId,
    contact.isGroup ? contact : null,
  );

  let ticketData;

  if (isNil(createTicket?.queueId)) {
    ticketData = {
      status: createTicket.isGroup ? "group" : "open",
      userId: requestUser.id,
      queueId: ticket.queueId
    }
  } else {
    ticketData = {
      status: createTicket.isGroup ? "group" : "open",
      userId: requestUser.id
    }
  }

  await UpdateTicketService({
    ticketData,
    ticketId: createTicket.id,
    companyId: createTicket.companyId
  });

  let body = message.body;
  if (message.mediaType === 'conversation' || message.mediaType === 'extendedTextMessage') {
          await SendWhatsAppMessage({ body, ticket: createTicket, quotedMsg, isForwarded: message.fromMe ? false : true });
  } else {
    if (!message.mediaUrl) {
      return res.status(400).send("Media URL not found");
    }

    const mediaUrl = message.mediaUrl.replace(`:${process.env.PORT}`, '');
    const fileName = obterNomeEExtensaoDoArquivo(mediaUrl);

    if (body === fileName) {
      body = "";
    }

    const publicFolder = path.join(__dirname, '..', '..', '..', 'backend', 'public');

    const filePath = path.join(publicFolder, fileName);

    const mediaSrc = {
      fieldname: 'medias',
      originalname: fileName,
      encoding: '7bit',
      mimetype: message.mediaType,
      filename: fileName,
      path: filePath
    } as Express.Multer.File

    await SendWhatsAppMedia({ media: mediaSrc, ticket: createTicket, body, isForwarded: message.fromMe ? false : true });
  }

  return res.send();
}

export const edit = async (req: Request, res: Response): Promise<Response> => {
  const { messageId } = req.params;
  const { companyId } = req.user;
  const { body }: MessageData = req.body;
  console.log(body)
  const { ticket , message } = await EditWhatsAppMessage({messageId, body});

  const io = getIO();
 io.emit(`company-${companyId}-appMessage`, {
    action:"update",
    message,
    ticket: ticket,
    contact: ticket.contact,
  });

  return res.send();
}

// ✅ Eliminar mensaje individual (especialmente para NotificaMe)
export const deleteMessage = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  try {
    const message = await Message.findOne({
      where: { id, companyId },
      include: [{ model: Ticket, as: "ticket" }]
    });

    if (!message) {
      return res.status(404).json({ error: "Mensaje no encontrado" });
    }

    // ✅ Verificar permisos (solo mensajes de la empresa del usuario)
    if (message.companyId !== companyId) {
      return res.status(403).json({ error: "No autorizado para eliminar este mensaje" });
    }

    // ✅ Eliminar mensaje
    await message.destroy();

    // ✅ Emitir evento de socket para actualizar UI
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-message`, {
      action: "delete",
      messageId: id,
      ticketId: message.ticketId
    });

    logger.info(`✅ Mensaje ${id} eliminado correctamente`);

    return res.status(200).json({ success: true, message: "Mensaje eliminado correctamente" });

  } catch (error: any) {
    logger.error(`❌ Error eliminando mensaje: ${error}`);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};