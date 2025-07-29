import * as Sentry from "@sentry/node";
import { writeFile } from "fs";
import { head, isNil } from "lodash";
import path, { join } from "path";
import { promisify } from "util";
import fetch from "node-fetch";

import { map_msg } from "../../utils/global";

import {
  downloadMediaMessage,
  extractMessageContent,
  getContentType,
  jidNormalizedUser,
  MessageUpsertType,
  proto,
  WAMessage,
  WAMessageStubType,
  WAMessageUpdate,
  WASocket,
} from "@whiskeysockets/baileys";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";

import ffmpeg from "fluent-ffmpeg";
import {
  AudioConfig,
  SpeechConfig,
  SpeechSynthesizer
} from "microsoft-cognitiveservices-speech-sdk";
import moment from "moment";
//import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import OpenAI from "openai";
import { Op } from "sequelize";
import { debounce } from "../../helpers/Debounce";
import formatBody from "../../helpers/Mustache";
import { cacheLayer } from "../../libs/cache";
import { getIO } from "../../libs/socket";
import { Store } from "../../libs/store";
import MarkDeleteWhatsAppMessage from "./MarkDeleteWhatsAppMessage";
import Campaign from "../../models/Campaign";
import * as MessageUtils from "./wbotGetMessageFromType";
import CampaignShipping from "../../models/CampaignShipping";
import Queue from "../../models/Queue";
import QueueIntegrations from "../../models/QueueIntegrations";
import QueueOption from "../../models/QueueOption";
import Setting from "../../models/Setting";
import TicketTraking from "../../models/TicketTraking";
import User from "../../models/User";
import UserRating from "../../models/UserRating";
import { campaignQueue, parseToMilliseconds, randomValue } from "../../queues";
import { logger } from "../../utils/logger";
import VerifyCurrentSchedule from "../CompanyService/VerifyCurrentSchedule";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import ShowQueueIntegrationService from "../QueueIntegrationServices/ShowQueueIntegrationService";
import FindOrCreateATicketTrakingService from "../TicketServices/FindOrCreateATicketTrakingService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import typebotListener from "../TypebotServices/typebotListener";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import { provider } from "./providers";
import SendWhatsAppMessage from "./SendWhatsAppMessage";
import { getMessageOptions } from "./SendWhatsAppMedia";
import Prompt from "../../models/Prompt";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import GetWhatsappWbot from "../../helpers/GetWhatsappWbot";

const request = require("request");

const fs = require('fs')

type Session = WASocket & {
  id?: number;
  store?: Store;
};

interface SessionOpenAi extends OpenAI {
  id?: number;
}
const sessionsOpenAi: SessionOpenAi[] = [];

interface ImessageUpsert {
  messages: proto.IWebMessageInfo[];
  type: MessageUpsertType;
}

interface IMe {
  name: string;
  id: string;
}

interface IMessage {
  messages: WAMessage[];
  isLatest: boolean;
}

export const isNumeric = (value: string) => /^-?\d+$/.test(value);

const writeFileAsync = promisify(writeFile);

const multVecardGet = function (param: any) {
  let output = " "

  let name = param.split("\n")[2].replace(";;;", "\n").replace('N:', "").replace(";", "").replace(";", " ").replace(";;", " ").replace("\n", "")
  let inicio = param.split("\n")[4].indexOf('=')
  let fim = param.split("\n")[4].indexOf(':')
  let contact = param.split("\n")[4].substring(inicio + 1, fim).replace(";", "")
  let contactSemWhats = param.split("\n")[4].replace("item1.TEL:", "")

  if (contact != "item1.TEL") {
    output = output + name + ": 📞" + contact + "" + "\n"
  } else
    output = output + name + ": 📞" + contactSemWhats + "" + "\n"
  return output
}

const contactsArrayMessageGet = (msg: any,) => {
  let contactsArray = msg.message?.contactsArrayMessage?.contacts
  let vcardMulti = contactsArray.map(function (item, indice) {
    return item.vcard;
  });

  let bodymessage = ``
  vcardMulti.forEach(function (vcard, indice) {
    bodymessage += vcard + "\n\n" + ""
  })

  let contacts = bodymessage.split("BEGIN:")

  contacts.shift()
  let finalContacts = ""
  for (let contact of contacts) {
    finalContacts = finalContacts + multVecardGet(contact)
  }

  return finalContacts
}

const getTypeMessage = (msg: proto.IWebMessageInfo): string => {
  return getContentType(msg.message);
};

export function validaCpfCnpj(val) {
  if (val.length == 11) {
    var cpf = val.trim();

    cpf = cpf.replace(/\./g, '');
    cpf = cpf.replace('-', '');
    cpf = cpf.split('');

    var v1 = 0;
    var v2 = 0;
    var aux = false;

    for (var i = 1; cpf.length > i; i++) {
      if (cpf[i - 1] != cpf[i]) {
        aux = true;
      }
    }

    if (aux == false) {
      return false;
    }

    for (var i = 0, p = 10; (cpf.length - 2) > i; i++, p--) {
      v1 += cpf[i] * p;
    }

    v1 = ((v1 * 10) % 11);

    if (v1 == 10) {
      v1 = 0;
    }

    if (v1 != cpf[9]) {
      return false;
    }

    for (var i = 0, p = 11; (cpf.length - 1) > i; i++, p--) {
      v2 += cpf[i] * p;
    }

    v2 = ((v2 * 10) % 11);

    if (v2 == 10) {
      v2 = 0;
    }

    if (v2 != cpf[10]) {
      return false;
    } else {
      return true;
    }
  } else if (val.length == 14) {
    var cnpj = val.trim();

    cnpj = cnpj.replace(/\./g, '');
    cnpj = cnpj.replace('-', '');
    cnpj = cnpj.replace('/', '');
    cnpj = cnpj.split('');

    var v1 = 0;
    var v2 = 0;
    var aux = false;

    for (var i = 1; cnpj.length > i; i++) {
      if (cnpj[i - 1] != cnpj[i]) {
        aux = true;
      }
    }

    if (aux == false) {
      return false;
    }

    for (var i = 0, p1 = 5, p2 = 13; (cnpj.length - 2) > i; i++, p1--, p2--) {
      if (p1 >= 2) {
        v1 += cnpj[i] * p1;
      } else {
        v1 += cnpj[i] * p2;
      }
    }

    v1 = (v1 % 11);

    if (v1 < 2) {
      v1 = 0;
    } else {
      v1 = (11 - v1);
    }

    if (v1 != cnpj[12]) {
      return false;
    }

    for (var i = 0, p1 = 6, p2 = 14; (cnpj.length - 1) > i; i++, p1--, p2--) {
      if (p1 >= 2) {
        v2 += cnpj[i] * p1;
      } else {
        v2 += cnpj[i] * p2;
      }
    }

    v2 = (v2 % 11);

    if (v2 < 2) {
      v2 = 0;
    } else {
      v2 = (11 - v2);
    }

    if (v2 != cnpj[13]) {
      return false;
    } else {
      return true;
    }
  } else {
    return false;
  }
}

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sleep(time) {
  await timeout(time);
}
export const sendMessageImage = async (
  wbot: Session,
  contact,
  ticket: Ticket,
  url: string,
  caption: string
) => {

  let sentMessage
  try {
    sentMessage = await wbot.sendMessage(
      `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
      {
        image: url ? { url } : fs.readFileSync(`public/temp/${caption}-${makeid(10)}`),
        fileName: caption,
        caption: caption,
        mimetype: 'image/jpeg'
      }
    );
  } catch (error) {
    sentMessage = await wbot.sendMessage(
      `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
      {
        text: formatBody('Não consegui enviar o PDF, tente novamente!', contact)
      }
    );
  }
  verifyMessage(sentMessage, ticket, contact);
};

export const sendMessageLink = async (
  wbot: Session,
  contact: Contact,
  ticket: Ticket,
  url: string,
  caption: string
) => {

  let sentMessage
  try {
    sentMessage = await wbot.sendMessage(
      `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
      document: url ? { url } : fs.readFileSync(`public/temp/${caption}-${makeid(10)}`),
      fileName: caption,
      caption: caption,
      mimetype: 'application/pdf'
    }
    );
  } catch (error) {
    sentMessage = await wbot.sendMessage(
      `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
      text: formatBody('Não consegui enviar o PDF, tente novamente!', contact)
    }
    );
  }
  verifyMessage(sentMessage, ticket, contact);
};

export function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}


const getBodyButton = (msg: proto.IWebMessageInfo): string => {
  if (msg.key.fromMe && msg?.message?.viewOnceMessage?.message?.buttonsMessage?.contentText) {
    let bodyMessage = `*${msg?.message?.viewOnceMessage?.message?.buttonsMessage?.contentText}*`;

    for (const buton of msg.message?.viewOnceMessage?.message?.buttonsMessage?.buttons) {
      bodyMessage += `\n\n${buton.buttonText?.displayText}`;
    }
    return bodyMessage;
  }

  if (msg.key.fromMe && msg?.message?.viewOnceMessage?.message?.listMessage) {
    let bodyMessage = `*${msg?.message?.viewOnceMessage?.message?.listMessage?.description}*`;
    for (const buton of msg.message?.viewOnceMessage?.message?.listMessage?.sections) {
      for (const rows of buton.rows) {
        bodyMessage += `\n\n${rows.title}`;
      }
    }

    return bodyMessage;
  }
};

const msgLocation = (image, latitude, longitude) => {
  if (image) {
    var b64 = Buffer.from(image).toString("base64");

    let data = `data:image/png;base64, ${b64} | https://maps.google.com/maps?q=${latitude}%2C${longitude}&z=17&hl=pt-BR|${latitude}, ${longitude} `;
    return data;
  }
};

export const getBodyMessage = (msg: proto.IWebMessageInfo): string | null => {

  try {
    let type = getTypeMessage(msg);

    const types = {
      conversation: msg?.message?.conversation,
      editedMessage: msg?.message?.editedMessage?.message?.protocolMessage?.editedMessage?.conversation,
      imageMessage: msg.message?.imageMessage?.caption,
      videoMessage: msg.message?.videoMessage?.caption,
      extendedTextMessage: msg.message?.extendedTextMessage?.text,
      buttonsResponseMessage: msg.message?.buttonsResponseMessage?.selectedButtonId,
      templateButtonReplyMessage: msg.message?.templateButtonReplyMessage?.selectedId,
      messageContextInfo: msg.message?.buttonsResponseMessage?.selectedButtonId || msg.message?.listResponseMessage?.title,
      buttonsMessage: getBodyButton(msg) || msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId,
      viewOnceMessage: getBodyButton(msg) || msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId,
      stickerMessage: "sticker",
      reactionMessage: MessageUtils.getReactionMessage(msg) || "reaction",
      contactMessage: msg.message?.contactMessage?.vcard,
      contactsArrayMessage: (msg.message?.contactsArrayMessage?.contacts) && contactsArrayMessageGet(msg),
      //locationMessage: `Latitude: ${msg.message.locationMessage?.degreesLatitude} - Longitude: ${msg.message.locationMessage?.degreesLongitude}`,
      locationMessage: msgLocation(
        msg.message?.locationMessage?.jpegThumbnail,
        msg.message?.locationMessage?.degreesLatitude,
        msg.message?.locationMessage?.degreesLongitude
      ),
      liveLocationMessage: `Latitude: ${msg.message?.liveLocationMessage?.degreesLatitude} - Longitude: ${msg.message?.liveLocationMessage?.degreesLongitude}`,
      documentMessage: msg.message?.documentMessage?.title,
      documentWithCaptionMessage: msg.message?.documentWithCaptionMessage?.message?.documentMessage?.caption,
      audioMessage: "Áudio",
      listMessage: getBodyButton(msg) || msg.message?.listResponseMessage?.title,
      listResponseMessage: msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId,
    };

    const objKey = Object.keys(types).find(key => key === type);

    if (!objKey) {
      logger.warn(`#### Nao achou o type 152: ${type}
${JSON.stringify(msg)}`);
      Sentry.setExtra("Mensagem", { BodyMsg: msg.message, msg, type });
      Sentry.captureException(
        new Error("Novo Tipo de Mensagem em getTypeMessage")
      );
    }
    return types[type];
  } catch (error) {
    Sentry.setExtra("Error getTypeMessage", { msg, BodyMsg: msg.message });
    Sentry.captureException(error);
    console.log(error);
  }
};


export const getQuotedMessage = (msg: proto.IWebMessageInfo): any => {
  const body =
    msg.message.imageMessage.contextInfo ||
    msg.message.videoMessage.contextInfo ||
    msg.message?.documentMessage ||
    msg.message.extendedTextMessage.contextInfo ||
    msg.message.buttonsResponseMessage.contextInfo ||
    msg.message.listResponseMessage.contextInfo ||
    msg.message.templateButtonReplyMessage.contextInfo ||
    msg.message.buttonsResponseMessage?.contextInfo ||
    msg?.message?.buttonsResponseMessage?.selectedButtonId ||
    msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
    msg?.message?.listResponseMessage?.singleSelectReply.selectedRowId ||
    msg.message.listResponseMessage?.contextInfo;
  msg.message.senderKeyDistributionMessage;

  // testar isso

  return extractMessageContent(body[Object.keys(body).values().next().value]);
};
export const getQuotedMessageId = (msg: proto.IWebMessageInfo) => {
  const body = extractMessageContent(msg.message)[
    Object.keys(msg?.message).values().next().value
    ];
  let reaction = msg?.message?.reactionMessage
    ? msg?.message?.reactionMessage?.key?.id
    : "";

  return reaction ? reaction : body?.contextInfo?.stanzaId;
};

const getMeSocket = (wbot: Session): IMe => {
  return {
    id: jidNormalizedUser((wbot as WASocket).user.id),
    name: (wbot as WASocket).user.name
  }
};

const getSenderMessage = (
  msg: proto.IWebMessageInfo,
  wbot: Session
): string => {
  const me = getMeSocket(wbot);
  if (msg.key.fromMe) return me.id;

  const senderId = msg.participant || msg.key.participant || msg.key.remoteJid || undefined;

  return senderId && jidNormalizedUser(senderId);
};

const getContactMessage = async (msg: proto.IWebMessageInfo, wbot: Session) => {
  const isGroup = msg.key.remoteJid.includes("g.us");
  const rawNumber = msg.key.remoteJid.replace(/\D/g, "");
  return isGroup
    ? {
      id: getSenderMessage(msg, wbot),
      name: msg.pushName
    }
    : {
      id: msg.key.remoteJid,
      name: msg.key.fromMe ? rawNumber : msg.pushName
    };
};

const downloadMedia = async (msg: proto.IWebMessageInfo) => {

  let buffer
  try {
    buffer = await downloadMediaMessage(
      msg,
      'buffer',
      {}
    )
  } catch (err) {


    console.error('Erro ao baixar mídia:', err);

    // Trate o erro de acordo com as suas necessidades
  }

  let filename = msg.message?.documentMessage?.fileName || "";

  const mineType =
    msg.message?.imageMessage ||
    msg.message?.audioMessage ||
    msg.message?.videoMessage ||
    msg.message?.stickerMessage ||
    msg.message?.documentMessage ||
    msg.message?.documentWithCaptionMessage?.message?.documentMessage ||
    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage ||
    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;

  if (!mineType)
    console.log(msg)

  if (!filename) {
    const ext = mineType.mimetype.split("/")[1].split(";")[0];
    filename = `${new Date().getTime()}.${ext}`;
  } else {
    filename = `${new Date().getTime()}_${filename}`;
  }

  const media = {
    data: buffer,
    mimetype: mineType.mimetype,
    filename
  };

  return media;
}


const verifyContact = async (
  msgContact: IMe,
  wbot: Session,
  companyId: number
): Promise<Contact> => {
  let profilePicUrl: string;
  try {
    profilePicUrl = await wbot.profilePictureUrl(msgContact.id);
  } catch (e) {
    Sentry.captureException(e);
    profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
  }

  const contactData = {
    name: msgContact?.name || msgContact.id.replace(/\D/g, ""),
    number: msgContact.id.replace(/\D/g, ""),
    profilePicUrl,
    isGroup: msgContact.id.includes("g.us"),
    companyId,
    whatsappId: wbot.id
  };



  const contact = CreateOrUpdateContactService(contactData);

  return contact;
};

const verifyQuotedMessage = async (
  msg: proto.IWebMessageInfo
): Promise<Message | null> => {
  if (!msg) return null;
  const quoted = getQuotedMessageId(msg);

  if (!quoted) return null;

  const quotedMsg = await Message.findOne({
    where: { id: quoted },
  });

  if (!quotedMsg) return null;

  return quotedMsg;
};

const sanitizeName = (name: string): string => {
  let sanitized = name.split(" ")[0];
  sanitized = sanitized.replace(/[^a-zA-Z0-9]/g, "");
  return sanitized.substring(0, 60);
};
const convertTextToSpeechAndSaveToFile = (
  text: string,
  filename: string,
  subscriptionKey: string,
  serviceRegion: string,
  voice: string = "pt-BR-FabioNeural",
  audioToFormat: string = "mp3"
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const speechConfig = SpeechConfig.fromSubscription(
      subscriptionKey,
      serviceRegion
    );
    speechConfig.speechSynthesisVoiceName = voice;
    const audioConfig = AudioConfig.fromAudioFileOutput(`${filename}.wav`);
    const synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);
    synthesizer.speakTextAsync(
      text,
      result => {
        if (result) {
          convertWavToAnotherFormat(
            `${filename}.wav`,
            `${filename}.${audioToFormat}`,
            audioToFormat
          )
            .then(output => {
              resolve();
            })
            .catch(error => {
              console.error(error);
              reject(error);
            });
        } else {
          reject(new Error("No result from synthesizer"));
        }
        synthesizer.close();
      },
      error => {
        console.error(`Error: ${error}`);
        synthesizer.close();
        reject(error);
      }
    );
  });
};

const convertWavToAnotherFormat = (
  inputPath: string,
  outputPath: string,
  toFormat: string
) => {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputPath)
      .toFormat(toFormat)
      .on("end", () => resolve(outputPath))
      .on("error", (err: { message: any }) =>
        reject(new Error(`Error converting file: ${err.message}`))
      )
      .save(outputPath);
  });
};

const deleteFileSync = (path: string): void => {
  try {
    fs.unlinkSync(path);
  } catch (error) {
    console.error("Erro ao deletar o arquivo:", error);
  }
};

const keepOnlySpecifiedChars = (str: string) => {
  return str.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚâêîôûÂÊÎÔÛãõÃÕçÇ!?.,;:\s]/g, "");
};

// Agregar al inicio del archivo, después de las importaciones
const processingMessages = new Map<string, number>();

const handleOpenAi = async (
  msg: proto.IWebMessageInfo,
  wbot: Session,
  ticket: Ticket,
  contact: Contact,
  mediaSent: Message | undefined
): Promise<void> => {
  const bodyMessage = getBodyMessage(msg);
  
  if (!bodyMessage) {
    console.log("❌ No hay bodyMessage, saliendo...");
    return;
  }

  // ✅ RECARGAR TICKET ANTES DE PROCESAR
  console.log("🔄 HANDLEOPENAI - Recargando ticket antes de procesar...");
  await reloadTicketSafely(ticket);
  
  // ✅ VERIFICAR SI DEBE USAR IA DESPUÉS DE RECARGAR
  if (!shouldUseAI(ticket)) {
    console.log("⚠️ HANDLEOPENAI - Ticket no está configurado para IA después de recarga");
    console.log("🔄 HANDLEOPENAI - Intentando recarga adicional...");
    await reloadTicketSafely(ticket);
    
    if (!shouldUseAI(ticket)) {
      console.log("❌ HANDLEOPENAI - Error: Ticket no está configurado para IA");
      return;
    }
  }

  // Crear una clave única basada en el contenido del mensaje y el ticket
  const messageKey = `${ticket.id}-${bodyMessage.substring(0, 50)}`;
  const currentTime = Date.now();
  
  console.log("🚀 INICIANDO handleOpenAi - Ticket ID:", ticket.id, "Mensaje:", bodyMessage.substring(0, 30) + "...");
  
  // Verificar si ya se está procesando este mensaje (con timeout de 30 segundos)
  const existingTime = processingMessages.get(messageKey);
  if (existingTime && (currentTime - existingTime) < 30000) {
    console.log("⚠️ Mensaje ya está siendo procesado, saltando... Key:", messageKey, "Tiempo transcurrido:", currentTime - existingTime, "ms");
    return;
  }
  
  // Marcar mensaje como en procesamiento con timestamp
  processingMessages.set(messageKey, currentTime);
  console.log("✅ Mensaje marcado como en procesamiento. Key:", messageKey, "Total procesando:", processingMessages.size);
  
  try {
    console.log("🔍 Buscando prompt para WhatsApp ID:", wbot.id, "Company ID:", ticket.companyId);
    let { prompt } = await ShowWhatsAppService(wbot.id, ticket.companyId);
    console.log("📋 Prompt encontrado en WhatsApp:", prompt ? "SÍ" : "NO");
    
    // ✅ CORREGIR LÓGICA: SIEMPRE buscar prompt del departamento si el ticket tiene queueId
    if (ticket.queueId) {
      console.log("📋 Buscando prompt del departamento actual (ID:", ticket.queueId, ")...");
      try {
        const queue = await Queue.findByPk(ticket.queueId, {
          include: [{ model: Prompt, as: 'prompt' }]
        });
        
        console.log("📋 Queue encontrada:", queue ? "SÍ" : "NO");
        if (queue) {
          console.log("📋 Queue ID:", queue.id);
          console.log("📋 Queue Name:", queue.name);
          console.log("📋 Queue PromptId:", queue.promptId);
          console.log("📋 Queue Prompt cargado:", queue.prompt ? "SÍ" : "NO");
        }
        
        if (queue?.prompt) {
          console.log("📋 Prompt encontrado en departamento:", queue.prompt.name);
          prompt = queue.prompt;
        } else if (queue?.promptId) {
          // Si no está cargado el prompt, buscarlo directamente
          console.log("📋 Buscando prompt directamente por ID:", queue.promptId);
          const promptModel = await Prompt.findByPk(queue.promptId);
          if (promptModel) {
            console.log("📋 Prompt encontrado en departamento (directo):", promptModel.name);
            prompt = promptModel;
          } else {
            console.log("❌ Prompt no encontrado por ID:", queue.promptId);
          }
        } else {
          console.log("📋 Departamento no tiene prompt configurado");
        }
      } catch (error) {
        console.log("❌ ERROR al buscar prompt del departamento:", error);
      }
    } else {
      console.log("🔍 DEBUG - Ticket NO tiene queueId:", ticket.queueId);
    }

    console.log("📋 Prompt final:", prompt ? "SÍ" : "NO");
    if (!prompt) {
      console.log("❌ NO HAY PROMPT CONFIGURADO - CONTINUANDO AL FLUJO NORMAL");
      // ✅ NO INTERRUMPIR EL FLUJO - Dejar que continúe al CHATBOT simple
      return;
    }

    if (msg.messageStubType) return;

    // Debug logs
    console.log("=== DEBUG PROMPT INFO ===");
    console.log("Prompt ID:", prompt.id);
    console.log("Prompt Name:", prompt.name);
    console.log("Prompt Provider:", prompt.provider);
    console.log("Prompt API Key (first 10 chars):", prompt.apiKey ? prompt.apiKey.substring(0, 10) + "..." : "NO API KEY");
    console.log("==========================");

    const publicFolder: string = path.resolve(
      __dirname,
      "..",
      "..",
      "..",
      "public"
    );

    // Determinar el proveedor de IA basado en la API key
    const apiKey = prompt.apiKey;
    const provider = prompt.provider || "openai"; // Usar el campo provider del prompt
    let baseURL = "https://api.openai.com/v1";
    let model = "gpt-3.5-turbo-1106";

    // Configurar según el proveedor seleccionado
    switch (provider) {
      case "openrouter-openai":
        baseURL = "https://openrouter.ai/api/v1";
        model = "openai/gpt-3.5-turbo";
        break;
      case "openrouter-deepseek":
        baseURL = "https://openrouter.ai/api/v1";
        model = "deepseek/deepseek-chat";
        break;
      case "openrouter-anthropic":
        baseURL = "https://openrouter.ai/api/v1";
        model = "anthropic/claude-3-sonnet";
        break;
      case "openrouter-gemini":
        baseURL = "https://openrouter.ai/api/v1";
        model = "google/gemini-2.0-flash-exp:free"; // Modelo gratuito de Google Gemini
        break;
      case "openrouter-qwen":
        baseURL = "https://openrouter.ai/api/v1";
        model = "qwen/qwen-plus";
        break;
      // Mantener compatibilidad con valores antiguos
      case "openai":
        baseURL = "https://api.openai.com/v1";
        model = "gpt-3.5-turbo-1106";
        break;
      case "openrouter":
        baseURL = "https://openrouter.ai/api/v1";
        model = "deepseek/deepseek-chat";
        break;
      default:
        baseURL = "https://openrouter.ai/api/v1";
        model = "deepseek/deepseek-chat";
    }

    console.log("=== DEBUG PROVIDER CONFIG ===");
    console.log("Selected Provider:", provider);
    console.log("Base URL:", baseURL);
    console.log("Model:", model);
    console.log("=============================");

    let openai: OpenAI | any;
    const openAiIndex = sessionsOpenAi.findIndex(s => s.id === ticket.id);

    if (openAiIndex === -1) {
      openai = new OpenAI({ 
        apiKey: prompt.apiKey,
        baseURL: baseURL
      });
      openai.id = ticket.id;
      openai.provider = provider;
      sessionsOpenAi.push(openai);
    } else {
      openai = sessionsOpenAi[openAiIndex];
    }

    const messages = await Message.findAll({
      where: { ticketId: ticket.id },
      order: [["createdAt", "ASC"]],
      limit: prompt.maxMessages
    });

    const promptSystem = `Nas respostas utilize o nome ${sanitizeName(contact.name || "Amigo(a)")} para identificar o cliente.\nSua resposta deve usar no máximo ${prompt.maxTokens}
     tokens e cuide para não truncar o final.\nSempre que possível, mencione o nome dele para ser mais personalizado o atendimento e mais educado. Quando a resposta requer uma transferência para o setor de atendimento, comece sua resposta com 'Ação: Transferir para o setor de atendimento'.\n
  ${prompt.prompt}\n`;

    let messagesOpenAi = [];

    if (msg.message?.conversation || msg.message?.extendedTextMessage?.text) {
      messagesOpenAi = [];
      messagesOpenAi.push({ role: "system", content: promptSystem });
      for (
        let i = 0;
        i < Math.min(prompt.maxMessages, messages.length);
        i++
      ) {
        const message = messages[i];
        if (message.mediaType === "chat") {
          if (message.fromMe) {
            messagesOpenAi.push({ role: "assistant", content: message.body });
          } else {
            messagesOpenAi.push({ role: "user", content: message.body });
          }
        }
      }
      messagesOpenAi.push({ role: "user", content: bodyMessage! });

      let chat;
      const startTime = Date.now();

      try {
        chat = await openai.chat.completions.create({
          model: model,
          messages: messagesOpenAi,
          temperature: prompt.temperature,
          max_tokens: prompt.maxTokens,
        });
      } catch (error) {
        console.log("❌ ERROR en llamada a IA:", error);
        throw error; // Re-lanzar para que sea capturado por el catch principal
      }

      let response = chat.choices[0]?.message?.content;
      let tokensUsed = chat.usage?.total_tokens || 0;
      let estimatedCost = 0;

      // Calcular costo estimado según proveedor
      switch (provider) {
        case "openrouter-openai":
          estimatedCost = (tokensUsed / 1000) * 0.0015; // $0.0015 por 1K tokens
          break;
        case "openrouter-deepseek":
          estimatedCost = (tokensUsed / 1000) * 0.0014; // $0.0014 por 1K tokens
          break;
        case "openrouter-anthropic":
          estimatedCost = (tokensUsed / 1000) * 0.003; // $0.003 por 1K tokens
          break;
        case "openrouter-gemini":
          estimatedCost = (tokensUsed / 1000) * 0.0005; // $0.0005 por 1K tokens
          break;
        case "openrouter-qwen":
          estimatedCost = (tokensUsed / 1000) * 0.001; // $0.001 por 1K tokens
          break;
        default:
          estimatedCost = (tokensUsed / 1000) * 0.0015;
      }
      
      const responseTime = Date.now() - startTime;
      
      // Log de monitoreo básico
      console.log("=== MONITOREO BÁSICO IA ===");
      console.log("📊 Proveedor:", provider);
      console.log("🤖 Modelo:", model);
      console.log("🔢 Tokens usados:", tokensUsed);
      console.log("💰 Costo estimado: $", estimatedCost.toFixed(6));
      console.log("⏱️ Tiempo respuesta:", responseTime, "ms");
      console.log("🎫 Ticket ID:", ticket.id);
      console.log("👤 Contacto:", contact.name);
      console.log("===========================");

      if (response?.includes("Ação: Transferir para o setor de atendimento")) {
        await transferQueue(prompt.queueId, ticket, contact);
        response = response
          .replace("Ação: Transferir para o setor de atendimento", "")
          .trim();
      }

      if (prompt.voice === "texto") {
        console.log('responseVoice', response)
        const sentMessage = await wbot.sendMessage(msg.key.remoteJid!, {
          text: `\u200e ${response!}`
        });
        
        // ✅ CORREGIR: Crear estructura de mensaje completa para guardar en BD
        const aiMessageData = {
          id: sentMessage.key.id,
          ticketId: ticket.id,
          contactId: undefined, // Mensaje del bot
          body: response!,
          fromMe: true,
          mediaType: "conversation",
          read: true,
          quotedMsgId: undefined,
          ack: 2, // ACK_SUCCESS
          remoteJid: sentMessage.key.remoteJid,
          participant: sentMessage.key.participant,
          dataJson: JSON.stringify(sentMessage),
          isEdited: false,
        };

        // ✅ GUARDAR MENSAJE DE IA EN BASE DE DATOS
        await CreateMessageService({ messageData: aiMessageData, companyId: ticket.companyId });
        
        // ✅ ACTUALIZAR TICKET
        await ticket.update({
          lastMessage: response!
        });

        // ✅ EMITIR EVENTO PARA ACTUALIZAR INTERFAZ
        await ticket.reload({
          include: [
            { model: Queue, as: "queue" },
            { model: User, as: "user" },
            { model: Contact, as: "contact" }
          ]
        });

        const io = getIO();
        io.to(`company-${ticket.companyId}-${ticket.status}`)
          .to(`queue-${ticket.queueId}-${ticket.status}`)
          .to(`company-${ticket.companyId}-notification`)
          .to(`queue-${ticket.queueId}-notification`)
          .to(ticket.id.toString())
          .emit(`company-${ticket.companyId}-ticket`, {
            action: "update",
            ticket
          });

        console.log("✅ MENSAJE DE IA GUARDADO Y EVENTO EMITIDO");
      } else {
        const fileNameWithOutExtension = `${ticket.id}_${Date.now()}`;
        convertTextToSpeechAndSaveToFile(
          keepOnlySpecifiedChars(response!),
          `${publicFolder}/${fileNameWithOutExtension}`,
          prompt.voiceKey,
          prompt.voiceRegion,
          prompt.voice,
          "mp3"
        ).then(async () => {
          try {
            const sendMessage = await wbot.sendMessage(msg.key.remoteJid!, {
              audio: { url: `${publicFolder}/${fileNameWithOutExtension}.mp3` },
              mimetype: "audio/mpeg",
              ptt: true
            });
            await verifyMediaMessage(sendMessage!, ticket, contact);
            deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.mp3`);
            deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.wav`);
          } catch (error) {
            console.log(`Erro para responder com audio: ${error}`);
          }
        });
      }
    } else {
      // Para otros proveedores, enviar mensaje de que no soportan audio
      const response = "Lo siento, actualmente no puedo procesar mensajes de audio. Por favor, envía tu mensaje en texto.";
      const sentMessage = await wbot.sendMessage(msg.key.remoteJid!, {
        text: response
      });
      await verifyMessage(sentMessage!, ticket, contact);
    }
    messagesOpenAi = [];
  } catch (error) {
    console.log("❌ ERROR en handleOpenAi:", error);
    
    // ✅ FALLBACK: Si la IA falla, activar chatbot simple
    if (ticket.queueId) {
      console.log("🔄 ACTIVANDO FALLBACK A CHATBOT SIMPLE");
      
      // Verificar si el departamento tiene opciones de chatbot
      const queue = await Queue.findByPk(ticket.queueId, {
        include: [{ model: QueueOption, as: 'options' }]
      });
      
      if (queue && queue.options && queue.options.length > 0) {
        console.log("✅ DEPARTAMENTO TIENE OPCIONES DE CHATBOT - ACTIVANDO");
        
        await ticket.update({
          chatbot: true,
          useIntegration: false,
          promptId: null
        });
        
        console.log("✅ CHATBOT SIMPLE ACTIVADO - Continuando flujo normal");
      } else {
        console.log("❌ DEPARTAMENTO NO TIENE OPCIONES DE CHATBOT");
      }
    }
    
    // ✅ NO INTERRUMPIR EL FLUJO - Dejar que continúe al CHATBOT simple
    return;
  } finally {
    // Desmarcar mensaje como en procesamiento después de un delay
    setTimeout(() => {
      processingMessages.delete(messageKey);
      console.log("🧹 Mensaje", messageKey, "desmarcado del procesamiento después de 5 segundos. Total procesando:", processingMessages.size);
    }, 5000); // Esperar 5 segundos antes de desmarcar
  }
};

const transferQueue = async (
  queueId: number,
  ticket: Ticket,
  contact: Contact
): Promise<void> => {
  console.log("🚀 TRANSFERQUEUE - Iniciando transferencia a departamento:", queueId);
  
  // ✅ EVITAR PROCESAMIENTO DUPLICADO
  const transferKey = `transfer-${ticket.id}-${Date.now()}`;
  const isProcessing = await cacheLayer.get(transferKey);
  if (isProcessing) {
    console.log("⚠️ TRANSFERQUEUE - Transferencia ya en proceso, evitando duplicado");
    return;
  }
  await cacheLayer.set(transferKey, "processing", "5"); // 5 segundos de expiración
  
  try {
    // ✅ OBTENER PROMPT DEL DEPARTAMENTO DESTINO
    const destinationQueue = await Queue.findByPk(queueId);
    console.log("🔍 TRANSFERQUEUE - Departamento destino:", destinationQueue?.name);
    console.log("🔍 TRANSFERQUEUE - PromptId del departamento:", destinationQueue?.promptId);
    
    // ✅ ACTUALIZAR TICKET CON PROMPT
    console.log("🔧 TRANSFERQUEUE - Actualizando ticket con datos:");
    console.log("  - queueId:", queueId);
    console.log("  - useIntegration: true");
    console.log("  - promptId:", destinationQueue?.promptId);
    
    await UpdateTicketService({
      ticketData: { 
        queueId: queueId, 
        useIntegration: true,  // ✅ CAMBIAR A true PARA ACTIVAR IA
        promptId: destinationQueue?.promptId || null 
      },
      ticketId: ticket.id,
      companyId: ticket.companyId
    });
    
    // ✅ RECARGAR TICKET DE FORMA ROBUSTA
    console.log("🔄 TRANSFERQUEUE - Recargando ticket después de transferencia...");
    await reloadTicketSafely(ticket);
    
    // ✅ VERIFICAR QUE LA TRANSFERENCIA FUE EXITOSA
    if (!shouldUseAI(ticket)) {
      console.log("⚠️ TRANSFERQUEUE - Ticket no está configurado para IA después de transferencia");
      console.log("🔄 TRANSFERQUEUE - Intentando recarga adicional...");
      await reloadTicketSafely(ticket);
      
      if (!shouldUseAI(ticket)) {
        console.log("❌ TRANSFERQUEUE - Error: Ticket no se configuró correctamente para IA");
        return;
      }
    }
    
    console.log("✅ TRANSFERQUEUE - Ticket transferido y configurado correctamente para IA");
    
    // ✅ EMITIR EVENTOS PARA ACTUALIZAR INTERFAZ WEB
    const io = getIO();
    await ticket.reload({
      include: [
        { model: Queue, as: "queue" },
        { model: User, as: "user" },
        { model: Contact, as: "contact" }
      ]
    });
    
    // ✅ EMITIR EVENTO DE ACTUALIZACIÓN DE TICKET
    io.to(`company-${ticket.companyId}-${ticket.status}`)
      .to(`queue-${ticket.queueId}-${ticket.status}`)
      .to(`company-${ticket.companyId}-notification`)
      .to(`queue-${ticket.queueId}-notification`)
      .to(ticket.id.toString())
      .emit(`company-${ticket.companyId}-ticket`, {
        action: "update",
        ticket
      });
    
    console.log("📡 TRANSFERQUEUE - Eventos emitidos para actualizar interfaz web");
    
    // ✅ FASE 1: ELIMINAR PALABRA CLAVE DE ACTIVACIÓN
    // ✅ NO ENVIAR MENSAJE ARTIFICIAL - EL MENSAJE ORIGINAL SE PROCESARÁ DIRECTAMENTE
    console.log("✅ TRANSFERQUEUE - Transferencia completada. El mensaje original se procesará con el nuevo prompt.");
    
    // ✅ EL MENSAJE ORIGINAL DEL USUARIO SE PROCESARÁ EN EL FLUJO NORMAL
    // ✅ NO CREAR MENSAJES ARTIFICIALES - EVITAR DUPLICACIÓN
    
  } catch (error) {
    console.error("❌ TRANSFERQUEUE - Error en transferencia:", error);
  }
};

const verifyMediaMessage = async (
  msg: proto.IWebMessageInfo,
  ticket: Ticket,
  contact: Contact
): Promise<Message> => {
  const io = getIO();
  const quotedMsg = await verifyQuotedMessage(msg);
  const media = await downloadMedia(msg);

  if (!media) {
    throw new Error("ERR_WAPP_DOWNLOAD_MEDIA");
  }

  if (!media.filename) {
    const ext = media.mimetype.split("/")[1].split(";")[0];
    media.filename = `${new Date().getTime()}.${ext}`;
  }

  try {
    await writeFileAsync(
      join(__dirname, "..", "..", "..", "public", media.filename),
      media.data,
      "base64"
    );
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  }

  const body = getBodyMessage(msg);


  const messageData = {
    id: msg.key.id,
    ticketId: ticket.id,
    contactId: msg.key.fromMe ? undefined : contact.id,
    body: body ? formatBody(body, ticket.contact) : media.filename,
    fromMe: msg.key.fromMe,
    read: msg.key.fromMe,
    mediaUrl: media.filename,
    mediaType: media.mimetype.split("/")[0],
    quotedMsgId: quotedMsg?.id,
    ack: msg.status,
    remoteJid: msg.key.remoteJid,
    participant: msg.key.participant,
    dataJson: JSON.stringify(msg),
  };

  await ticket.update({
    lastMessage: body || media.filename,
  });

  const newMessage = await CreateMessageService({
    messageData,
    companyId: ticket.companyId,
  });


  if (!msg.key.fromMe && ticket.status === "closed") {
    await ticket.update({ status: "pending" });
    await ticket.reload({
      include: [
        { model: Queue, as: "queue" },
        { model: User, as: "user" },
        { model: Contact, as: "contact" },
      ],
    });

    io.to(`company-${ticket.companyId}-closed`)
      .to(`queue-${ticket.queueId}-closed`)
      .emit(`company-${ticket.companyId}-ticket`, {
        action: "delete",
        ticket,
        ticketId: ticket.id,
      });

    io.to(`company-${ticket.companyId}-${ticket.status}`)
      .to(`queue-${ticket.queueId}-${ticket.status}`)
      .to(ticket.id.toString())
      .emit(`company-${ticket.companyId}-ticket`, {
        action: "update",
        ticket,
        ticketId: ticket.id,
      });
  }

  return newMessage;
};

function getStatus(msg, msgType) {

  if (msg.status == "PENDING") {

    if (msg.key.fromMe && msgType == "reactionMessage"){
      return 3;
    }

    return 1
  } else if (msg.status == "SERVER_ACK") {
    return 1
  }
  return msg.status;
}

export const verifyMessage = async (
  msg: proto.IWebMessageInfo,
  ticket: Ticket,
  contact: Contact
) => {
  const io = getIO();
  const quotedMsg = await verifyQuotedMessage(msg);
  const body = getBodyMessage(msg);
  const isEdited = getTypeMessage(msg) == 'editedMessage';

  // ✅ RECARGAR TICKET ANTES DE VERIFICAR
  console.log("🔄 VERIFYMESSAGE - Recargando ticket antes de verificar...");
  await reloadTicketSafely(ticket);

  // ✅ DETECTAR PALABRAS CLAVE DE TRANSFERENCIA PARA CUALQUIER MENSAJE
  if (!msg.key.fromMe && body) {
    console.log("🔍 VERIFYMESSAGE - Verificando palabras clave de transferencia...");
    console.log("🔍 VERIFYMESSAGE - Mensaje recibido:", body);
    
    const transferResult = await detectTransferKeywords(body, ticket.companyId);
    
    if (transferResult.targetQueueId && transferResult.keyword) {
      console.log("🚀 VERIFYMESSAGE - TRANSFERENCIA ENTRE DEPARTAMENTOS IA DETECTADA:");
      console.log("  - Departamento origen:", ticket.queueId);
      console.log("  - Departamento destino:", transferResult.targetQueueId);
      console.log("  - Palabra clave:", transferResult.keyword);
      
      // ✅ TRANSFERIR TICKET A NUEVO DEPARTAMENTO
      await transferQueue(transferResult.targetQueueId, ticket, contact);
      
      // ✅ FASE 1: PROCESAR MENSAJE ORIGINAL CON NUEVO PROMPT
      // ✅ NO SALIR - CONTINUAR PARA PROCESAR EL MENSAJE ORIGINAL
      console.log("✅ VERIFYMESSAGE - Transferencia completada, procesando mensaje original con nuevo prompt");
    } else {
      console.log("🔍 VERIFYMESSAGE - No se detectaron palabras clave de transferencia");
    }
  }

  // ✅ VERIFICAR SI EL TICKET TIENE CHATBOT ACTIVADO
  if (ticket.chatbot && !msg.key.fromMe) {
    console.log("🔍 VERIFYMESSAGE - Ticket con chatbot activado, procesando opción:", body);
    
    // ✅ OBTENER WHATSAPP Y VERIFICAR QUEUES
    const whatsapp = await ShowWhatsAppService(ticket.whatsappId, ticket.companyId);
    const { queues } = whatsapp;
    
    if (queues.length === 1) {
      console.log("🔍 VERIFYMESSAGE - Un solo departamento detectado");
      
      const currentQueue = queues[0];
      if (currentQueue.options && currentQueue.options.length > 0) {
        const optionIndex = parseInt(body) - 1;
        const selectedQueueOption = currentQueue.options[optionIndex];
        
        console.log("🔍 VERIFYMESSAGE - Opción encontrada:", selectedQueueOption);
        
        // ✅ VERIFICAR SI LA OPCIÓN ES VÁLIDA PRIMERO
        if (!selectedQueueOption) {
          console.log("❌ VERIFYMESSAGE - Opción no válida:", body);
          
          // ✅ ENVIAR MENSAJE DE OPCIÓN INVÁLIDA
          const invalidOptionMessage = "Opción inválida, por favor, elige una opción válida.";
          
          console.log("📤 VERIFYMESSAGE - Enviando mensaje de error:", invalidOptionMessage);
          
          const wbot = await GetWhatsappWbot(ticket.whatsappId);
          const sendMsg = await wbot.sendMessage(
            `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
            { text: invalidOptionMessage }
          );
          
          await verifyMessage(sendMsg, ticket, contact);
          console.log("✅ VERIFYMESSAGE - Mensaje de opción inválida enviado");
          return;
        }
        
        // ✅ VERIFICAR SI TIENE TRANSFERENCIA A DEPARTAMENTO IA
        if (selectedQueueOption.transferQueueId) {
          console.log("🚀 VERIFYMESSAGE - TRANSFERENCIA DETECTADA a departamento:", selectedQueueOption.transferQueueId);
          
          // ✅ TRANSFERIR AL DEPARTAMENTO IA
          await transferQueue(selectedQueueOption.transferQueueId, ticket, contact);
          
          // ✅ FASE 1: PROCESAR MENSAJE ORIGINAL CON NUEVO PROMPT
          // ✅ NO SALIR - CONTINUAR PARA PROCESAR EL MENSAJE ORIGINAL
          console.log("✅ VERIFYMESSAGE - Transferencia desde chatbot completada, procesando mensaje original con nuevo prompt");
        } else {
          console.log("⚠️ VERIFYMESSAGE - Opción válida pero sin transferencia configurada");
        }
      }
    }
  }

  const messageData = {
    id: isEdited ? msg?.message?.editedMessage?.message?.protocolMessage?.key?.id : msg.key.id,
    ticketId: ticket.id,
    contactId: msg.key.fromMe ? undefined : contact.id,
    body,
    fromMe: msg.key.fromMe,
    mediaType: getTypeMessage(msg),
    read: msg.key.fromMe,
    quotedMsgId: quotedMsg?.id,
    ack: msg.status,
    remoteJid: msg.key.remoteJid,
    participant: msg.key.participant,
    dataJson: JSON.stringify(msg),
    isEdited: isEdited,
  };

  await ticket.update({
    lastMessage: body
  });


  await CreateMessageService({ messageData, companyId: ticket.companyId });

  // ✅ EMITIR EVENTO DE ACTUALIZACIÓN DE TICKET PARA TODOS LOS MENSAJES
  await ticket.reload({
    include: [
      { model: Queue, as: "queue" },
      { model: User, as: "user" },
      { model: Contact, as: "contact" }
    ]
  });

  io.to(`company-${ticket.companyId}-${ticket.status}`)
    .to(`queue-${ticket.queueId}-${ticket.status}`)
    .to(`company-${ticket.companyId}-notification`)
    .to(`queue-${ticket.queueId}-notification`)
    .to(ticket.id.toString())
    .emit(`company-${ticket.companyId}-ticket`, {
      action: "update",
      ticket
    });

  if (!msg.key.fromMe && ticket.status === "closed") {
    await ticket.update({ status: "pending" });
    await ticket.reload({
      include: [
        { model: Queue, as: "queue" },
        { model: User, as: "user" },
        { model: Contact, as: "contact" }
      ]
    });

    io.to(`company-${ticket.companyId}-closed`)
      .to(`queue-${ticket.queueId}-closed`)
      .emit(`company-${ticket.companyId}-ticket`, {
        action: "delete",
        ticket,
        ticketId: ticket.id
      });

    io.to(`company-${ticket.companyId}-${ticket.status}`)
      .to(`queue-${ticket.queueId}-${ticket.status}`)
      .emit(`company-${ticket.companyId}-ticket`, {
        action: "update",
        ticket,
        ticketId: ticket.id
      });
  }
};

const isValidMsg = (msg: proto.IWebMessageInfo): boolean => {
  if (msg.key.remoteJid === "status@broadcast") return false;
  try {
    const msgType = getTypeMessage(msg);
    if (!msgType) {
      return;
    }

    const ifType =
      msgType === "conversation" ||
      msgType === "extendedTextMessage" ||
      msgType === "editedMessage" ||
      msgType === "audioMessage" ||
      msgType === "videoMessage" ||
      msgType === "imageMessage" ||
      msgType === "documentMessage" ||
      msgType === "documentWithCaptionMessage" ||
      msgType === "stickerMessage" ||
      msgType === "buttonsResponseMessage" ||
      msgType === "buttonsMessage" ||
      msgType === "messageContextInfo" ||
      msgType === "locationMessage" ||
      msgType === "liveLocationMessage" ||
      msgType === "contactMessage" ||
      msgType === "voiceMessage" ||
      msgType === "mediaMessage" ||
      msgType === "contactsArrayMessage" ||
      msgType === "reactionMessage" ||
      msgType === "reactionMessage" ||
      msgType === "ephemeralMessage" ||
      msgType === "protocolMessage" ||
      msgType === "listResponseMessage" ||
      msgType === "listMessage" ||
      msgType === "viewOnceMessage";

    if (!ifType) {
      logger.warn(`#### Nao achou o type em isValidMsg: ${msgType}
${JSON.stringify(msg?.message)}`);
      Sentry.setExtra("Mensagem", { BodyMsg: msg.message, msg, msgType });
      Sentry.captureException(new Error("Novo Tipo de Mensagem em isValidMsg"));
    }

    return !!ifType;
  } catch (error) {
    Sentry.setExtra("Error isValidMsg", { msg });
    Sentry.captureException(error);
  }
};


const Push = (msg: proto.IWebMessageInfo) => {
  return msg.pushName;
}
const verifyQueue = async (
  wbot: Session,
  msg: proto.IWebMessageInfo,
  ticket: Ticket,
  contact: Contact,
  mediaSent?: Message | undefined
) => {
  const companyId = ticket.companyId;

  console.log("🔍 VERIFYQUEUE - Iniciando...");

  const { queues, greetingMessage, maxUseBotQueues, timeUseBotQueues } = await ShowWhatsAppService(
    wbot.id!,
    ticket.companyId
  )

  console.log("🔍 VERIFYQUEUE - Queues encontradas:", queues.length);
  console.log("🔍 VERIFYQUEUE - Queues:", queues.map(q => ({ id: q.id, name: q.name, options: q.options?.length || 0 })));



  console.log("🔍 VERIFYQUEUE - Verificando si hay un solo departamento...");
  
  if (queues.length === 1) {
    console.log("✅ VERIFYQUEUE - Un solo departamento detectado");

    const sendGreetingMessageOneQueues = await Setting.findOne({
      where: {
        key: "sendGreetingMessageOneQueues",
        companyId: ticket.companyId
      }
    });

    if (greetingMessage.length > 1 && sendGreetingMessageOneQueues?.value === "enabled") {
      const body = formatBody(`${greetingMessage}`, contact);

      console.log('body2', body)
      await wbot.sendMessage(
        `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
        {
          text: body
        }
      );
    }

    const firstQueue = head(queues);
    let chatbot = false;
    if (firstQueue?.options) {
      chatbot = firstQueue.options.length > 0;
    }
    // Removido logs de debug innecesarios

    //inicia integração dialogflow/n8n
    if (
      !msg.key.fromMe &&
      !ticket.isGroup &&
      !isNil(queues[0]?.integrationId)
    ) {
      const integrations = await ShowQueueIntegrationService(queues[0].integrationId, companyId);

      await handleMessageIntegration(msg, wbot, integrations, ticket)

      await ticket.update({
        useIntegration: true,
        integrationId: integrations.id
      })
      // return;
    }
    //inicia integração openai
    if (
      !msg.key.fromMe &&
      !ticket.isGroup &&
      !isNil(queues[0]?.promptId)
    ) {



      await handleOpenAi(msg, wbot, ticket, contact, mediaSent);


      await ticket.update({
        useIntegration: true,
        promptId: queues[0]?.promptId
      })
      // return;
    }

    await UpdateTicketService({
      ticketData: { queueId: firstQueue.id, chatbot, status: "pending" },
      ticketId: ticket.id,
      companyId: ticket.companyId,
    });

    // ✅ AGREGAR LÓGICA DE CHATBOT PARA UN SOLO DEPARTAMENTO
    console.log("🔍 VERIFYQUEUE - Verificando chatbot:", chatbot);
    console.log("🔍 VERIFYQUEUE - firstQueue.options:", firstQueue.options?.length || 0);
    
    if (chatbot && firstQueue.options && firstQueue.options.length > 0) {
      console.log("🤖 CHATBOT SIMPLE - Enviando menú de opciones");
      
      let options = "";
      firstQueue.options.forEach((option, index) => {
        options += `*[ ${index + 1} ]* - ${option.title}\n`;
      });

      const queueGreetingMessage = firstQueue.greetingMessage || greetingMessage;
      const textMessage = {
        text: formatBody(`\u200e${queueGreetingMessage}\n\n${options}`, contact),
      };

      const sendMsg = await wbot.sendMessage(
        `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
        textMessage
      );
      
      await verifyMessage(sendMsg, ticket, ticket.contact);
      console.log("✅ MENÚ DE OPCIONES ENVIADO");
    }

    return;
  }

  const selectedOption = getBodyMessage(msg);
  console.log("🔍 VERIFYQUEUE - Opción seleccionada:", selectedOption);
  
  // ✅ LÓGICA PARA UN SOLO DEPARTAMENTO CON OPCIONES
  if (queues.length === 1) {
    const currentQueue = queues[0];
    console.log("🔍 VERIFYQUEUE - Procesando opción para departamento único:", currentQueue.name);
    
    if (currentQueue.options && currentQueue.options.length > 0) {
      const optionIndex = parseInt(selectedOption) - 1;
      const selectedQueueOption = currentQueue.options[optionIndex];
      
      console.log("🔍 VERIFYQUEUE - Opción encontrada:", selectedQueueOption);
      
      if (selectedQueueOption) {
        console.log("🔍 VERIFYQUEUE - Verificando transferencia...");
        
        // ✅ VERIFICAR SI TIENE TRANSFERENCIA A DEPARTAMENTO IA
        if (selectedQueueOption.transferQueueId) {
          console.log("🚀 VERIFYQUEUE - TRANSFERENCIA DETECTADA a departamento:", selectedQueueOption.transferQueueId);
          
          // ✅ TRANSFERIR AL DEPARTAMENTO IA
          await transferQueue(selectedQueueOption.transferQueueId, ticket, contact);
          
          // ✅ FASE 1: PROCESAR MENSAJE ORIGINAL CON NUEVO PROMPT
          // ✅ NO SALIR - CONTINUAR PARA PROCESAR EL MENSAJE ORIGINAL
          console.log("✅ VERIFYQUEUE - Transferencia completada, procesando mensaje original con nuevo prompt");
        } else {
          console.log("⚠️ VERIFYQUEUE - Opción sin transferencia configurada");
        }
      } else {
        console.log("❌ VERIFYQUEUE - Opción no válida:", selectedOption);
        
        // ✅ ENVIAR MENSAJE DE OPCIÓN INVÁLIDA
        const invalidOptionMessage = "Opción inválida, por favor, elige una opción válida.";
        
        const sendMsg = await wbot.sendMessage(
          `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          { text: invalidOptionMessage }
        );
        
        await verifyMessage(sendMsg, ticket, contact);
        console.log("✅ VERIFYQUEUE - Mensaje de opción inválida enviado");
        return;
      }
    }
  }
  
  // ✅ LÓGICA ORIGINAL PARA MÚLTIPLES DEPARTAMENTOS
  const choosenQueue = queues[+selectedOption - 1];

  // ✅ VERIFICAR SI LA OPCIÓN ES VÁLIDA PARA MÚLTIPLES DEPARTAMENTOS
  if (!choosenQueue) {
    console.log("❌ VERIFYQUEUE - Opción no válida para múltiples departamentos:", selectedOption);
    
    // ✅ ENVIAR MENSAJE DE OPCIÓN INVÁLIDA
    const invalidOptionMessage = "Opción inválida, por favor, elige una opción válida.";
    
    const sendMsg = await wbot.sendMessage(
      `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
      { text: invalidOptionMessage }
    );
    
    await verifyMessage(sendMsg, ticket, contact);
    console.log("✅ VERIFYQUEUE - Mensaje de opción inválida enviado para múltiples departamentos");
    return;
  }

  const buttonActive = await Setting.findOne({
    where: {
      key: "chatBotType",
      companyId
    }
  });



  /**
   * recebe as mensagens dos usuários e envia as opções de fila
   * tratamiento de mensajes para respuesta a los usuarios desde el chatbot/fila.         
   */
  const botText = async () => {
    let options = "";

    queues.forEach((queue, index) => {
      options += `*[ ${index + 1} ]* - ${queue.name}\n`;
    });


    const textMessage = {
      text: formatBody(`\u200e${greetingMessage}\n\n${options}`, contact),
    };
    let lastMsg = map_msg.get(contact.number)
    let invalidOption = "Opción inválida, por favor, elige una opción válida."
    

    // console.log('getBodyMessage(msg)', getBodyMessage(msg))
    console.log('textMessage2', textMessage)
     console.log("lastMsg::::::::::::':", contact.number)
    // map_msg.set(contact.number, lastMsg);
    if (!lastMsg?.msg || getBodyMessage(msg).includes('#') || textMessage.text === 'concluido' || lastMsg.msg !== textMessage.text && !lastMsg.invalid_option) {
      const sendMsg = await wbot.sendMessage(
        `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
        textMessage
      );
      lastMsg ?? (lastMsg = {});
      lastMsg.msg = textMessage.text;
      lastMsg.invalid_option = false;
      map_msg.set(contact.number, lastMsg);
      await verifyMessage(sendMsg, ticket, ticket.contact);

    } else if (lastMsg.msg !== invalidOption && !lastMsg.invalid_option) {
      textMessage.text = invalidOption
      const sendMsg = await wbot.sendMessage(
        `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
        textMessage
      );
      lastMsg ?? (lastMsg = {});
      lastMsg.invalid_option = true;
      lastMsg.msg = textMessage.text;
      map_msg.set(contact.number, lastMsg);
      await verifyMessage(sendMsg, ticket, ticket.contact);
    }

  };

  if (choosenQueue) {
    let chatbot = false;
    if (choosenQueue?.options) {
      chatbot = choosenQueue.options.length > 0;
    }

    await UpdateTicketService({
      ticketData: { queueId: choosenQueue.id, chatbot },
      ticketId: ticket.id,
      companyId: ticket.companyId,
    });


    /* Tratamento para envio de mensagem quando a fila está fora do expediente */
    if (choosenQueue.options.length === 0) {
      const queue = await Queue.findByPk(choosenQueue.id);
      const { schedules }: any = queue;
      const now = moment();
      const weekday = now.format("dddd").toLowerCase();
      let schedule;
      if (Array.isArray(schedules) && schedules.length > 0) {
        schedule = schedules.find((s) => s.weekdayEn === weekday && s.startTime !== "" && s.startTime !== null && s.endTime !== "" && s.endTime !== null);
      }

      if (queue.outOfHoursMessage !== null && queue.outOfHoursMessage !== "" && !isNil(schedule)) {
        const startTime = moment(schedule.startTime, "HH:mm");
        const endTime = moment(schedule.endTime, "HH:mm");



        if (now.isBefore(startTime) || now.isAfter(endTime)) {
          const body = formatBody(`\u200e ${queue.outOfHoursMessage}\n\n*[ # ]* - Volver al Menú Principal`, ticket.contact);
          console.log('body222', body)
          const sentMessage = await wbot.sendMessage(
            `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
            text: body,
          }
          );
          await verifyMessage(sentMessage, ticket, contact);
          await UpdateTicketService({
            ticketData: { queueId: null, chatbot },
            ticketId: ticket.id,
            companyId: ticket.companyId,
          });
          return;
        }
      }

      //inicia integración dialogflow/n8n
      if (
        !msg.key.fromMe &&
        !ticket.isGroup &&
        choosenQueue.integrationId
      ) {
        const integrations = await ShowQueueIntegrationService(choosenQueue.integrationId, companyId);

        await handleMessageIntegration(msg, wbot, integrations, ticket)

        await ticket.update({
          useIntegration: true,
          integrationId: integrations.id
        })
        // return;
      }

      //inicia integración openai
      if (
        !msg.key.fromMe &&
        !ticket.isGroup &&
        !isNil(choosenQueue?.promptId)
      ) {
        await handleOpenAi(msg, wbot, ticket, contact, mediaSent);


        await ticket.update({
          useIntegration: true,
          promptId: choosenQueue?.promptId
        })
        // return;
      }

      const body = formatBody(`\u200e${choosenQueue.greetingMessage}`, ticket.contact
      );
      if (choosenQueue.greetingMessage) {
        console.log('body33333333', body)
        const sentMessage = await wbot.sendMessage(
          `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
          text: body,
        }
        );
        await verifyMessage(sentMessage, ticket, contact);
      }
	        if (choosenQueue.mediaPath !== null && choosenQueue.mediaPath !== "") {
        const filePath = path.resolve("public", choosenQueue.mediaPath);

        const optionsMsg = await getMessageOptions(choosenQueue.mediaName, filePath);

        let sentMessage = await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, { ...optionsMsg });

        await verifyMediaMessage(sentMessage, ticket, contact);
      }
    }

  } else {

    if (maxUseBotQueues && maxUseBotQueues !== 0 && ticket.amountUsedBotQueues >= maxUseBotQueues) {
      // await UpdateTicketService({
      //   ticketData: { queueId: queues[0].id },
      //   ticketId: ticket.id
      // });

      return;
    }

    //Regra para deshabilitar el chatbot por x minutos/horas después del primer envío
    const ticketTraking = await FindOrCreateATicketTrakingService({ ticketId: ticket.id, companyId });
    let dataLimite = new Date();
    let Agora = new Date();


    if (ticketTraking.chatbotAt !== null) {
      dataLimite.setMinutes(ticketTraking.chatbotAt.getMinutes() + (Number(timeUseBotQueues)));

      if (ticketTraking.chatbotAt !== null && Agora < dataLimite && timeUseBotQueues !== "0" && ticket.amountUsedBotQueues !== 0) {
        return
      }
    }
    await ticketTraking.update({
      chatbotAt: null
    })

    if (buttonActive.value === "text") {
      return botText();
    }

  }

};


export const verifyRating = (ticketTraking: TicketTraking) => {
  if (
    ticketTraking &&
    ticketTraking.finishedAt === null &&
    ticketTraking.userId !== null &&
    ticketTraking.ratingAt !== null
  ) {
    return true;
  }
  return false;
};

export const handleRating = async (
  rate: number,
  ticket: Ticket,
  ticketTraking: TicketTraking
) => {
  const io = getIO();

  const { complationMessage } = await ShowWhatsAppService(
    ticket.whatsappId,
    ticket.companyId
  );

  let finalRate = rate;

  if (rate < 1) {
    finalRate = 1;
  }
  if (rate > 5) {
    finalRate = 5;
  }

  await UserRating.create({
    ticketId: ticketTraking.ticketId,
    companyId: ticketTraking.companyId,
    userId: ticketTraking.userId,
    rate: finalRate,
  });

  if (complationMessage) {
    const body = formatBody(`\u200e${complationMessage}`, ticket.contact);
    await SendWhatsAppMessage({ body, ticket });
  }

  await ticketTraking.update({
    finishedAt: moment().toDate(),
    rated: true,
  });

  await ticket.update({
    queueId: null,
    chatbot: null,
    queueOptionId: null,
    userId: null,
    status: "closed",
  });

  io.to(`company-${ticket.companyId}-open`)
    .to(`queue-${ticket.queueId}-open`)
    .emit(`company-${ticket.companyId}-ticket`, {
      action: "delete",
      ticket,
      ticketId: ticket.id,
    });

  io.to(`company-${ticket.companyId}-${ticket.status}`)
    .to(`queue-${ticket.queueId}-${ticket.status}`)
    .to(ticket.id.toString())
    .emit(`company-${ticket.companyId}-ticket`, {
      action: "update",
      ticket,
      ticketId: ticket.id,
    });
};

const handleChartbot = async (
  wbot: Session,
  msg: proto.IWebMessageInfo,
  ticket: Ticket,
  contact: Contact,
  mediaSent?: Message | undefined
) => {
  const companyId = ticket.companyId;
  
  // ✅ RECARGAR TICKET ANTES DE PROCESAR
  console.log("🔄 HANDLECHATBOT - Recargando ticket antes de procesar...");
  await reloadTicketSafely(ticket);
  
  // ✅ DETECTAR PALABRAS CLAVE DE TRANSFERENCIA ENTRE DEPARTAMENTOS IA
  const messageBody = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "") as string;
  if (messageBody) {
    console.log("🔍 HANDLECHATBOT - Verificando palabras clave de transferencia...");
    const transferResult = await detectTransferKeywords(messageBody, companyId);
    
    if (transferResult.targetQueueId && transferResult.keyword) {
      console.log("🚀 HANDLECHATBOT - TRANSFERENCIA ENTRE DEPARTAMENTOS IA DETECTADA:");
      console.log("  - Departamento origen:", ticket.queueId);
      console.log("  - Departamento destino:", transferResult.targetQueueId);
      console.log("  - Palabra clave:", transferResult.keyword);
      
      // ✅ TRANSFERIR TICKET A NUEVO DEPARTAMENTO
      await transferQueue(transferResult.targetQueueId, ticket, contact);
      
      // ✅ FASE 1: PROCESAR MENSAJE ORIGINAL CON NUEVO PROMPT
      // ✅ NO SALIR - CONTINUAR PARA PROCESAR EL MENSAJE ORIGINAL
      console.log("✅ HANDLECHATBOT - Transferencia completada, procesando mensaje original con nuevo prompt");
    }
  }
  
  // ✅ GENERAR PALABRAS CLAVE DINÁMICAMENTE
  const activationKeywords = await generateActivationKeywords(companyId);
  
  // ✅ DETECTAR SI ES MENSAJE DE ACTIVACIÓN
  const lowerMessage = messageBody.toLowerCase();
  
  // ✅ BUSCAR DEPARTAMENTO POR PALABRA CLAVE
  let targetQueueId = null;
  for (const [queueId, keyword] of Object.entries(activationKeywords)) {
    if (lowerMessage.includes((keyword as string).toLowerCase())) {
      targetQueueId = parseInt(queueId);
      break;
    }
  }
  
  if (targetQueueId) {
    console.log("🔄 TRANSFERENCIA AUTOMÁTICA DETECTADA:");
    console.log("  - Mensaje:", messageBody);
    console.log("  - Departamento destino:", targetQueueId);
    
    // ✅ TRANSFERIR TICKET
    await ticket.update({
      queueId: targetQueueId,
      chatbot: false, // Desactivar chatbot
      status: "pending"
    });
    
    // ✅ MENSAJE DE TRANSFERENCIA
    const queue = await Queue.findByPk(targetQueueId);
    const transferMessage = `Te transfiero a ${queue?.name || 'el departamento'} un momento...`;
    await wbot.sendMessage(
      `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
      { text: transferMessage }
    );
    
    // ✅ ENVIAR MENSAJE INTERNO PARA ACTIVAR IA
    const internalKeyword = activationKeywords[targetQueueId];
    await wbot.sendMessage(
      `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
      { text: internalKeyword }
    );
    
    console.log("✅ TRANSFERENCIA COMPLETADA - IA activada");
    return;
  }

  // ✅ LÓGICA EXISTENTE DEL CHATBOT
  // ... resto del código existente ...

  // ✅ LÓGICA EXISTENTE DEL CHATBOT
  const { queues, greetingMessage } = await ShowWhatsAppService(
    wbot.id!,
    ticket.companyId
  );

  console.log("🔍 HANDLECHATBOT - Queues encontradas:", queues.length);

  // ✅ LÓGICA PARA MÚLTIPLES DEPARTAMENTOS
  if (queues.length > 1) {
    console.log("🔍 HANDLECHATBOT - Múltiples departamentos detectados");
    
    const selectedOption = getBodyMessage(msg);
    console.log("🔍 HANDLECHATBOT - Opción seleccionada:", selectedOption);
    
    // ✅ VERIFICAR SI LA OPCIÓN ES VÁLIDA
    const optionIndex = parseInt(selectedOption) - 1;
    const choosenQueue = queues[optionIndex];
    
    if (choosenQueue) {
      console.log("✅ HANDLECHATBOT - Opción válida seleccionada:", choosenQueue.name);
      
      // ✅ PROCESAR OPCIÓN VÁLIDA
      await verifyQueue(wbot, msg, ticket, contact, mediaSent);
    } else {
      console.log("❌ HANDLECHATBOT - Opción inválida:", selectedOption);
      
      // ✅ ENVIAR MENSAJE DE OPCIÓN INVÁLIDA
      const invalidOptionMessage = "Opción inválida, por favor, elige una opción válida.";
      
      const sendMsg = await wbot.sendMessage(
        `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
        { text: invalidOptionMessage }
      );
      
      await verifyMessage(sendMsg, ticket, contact);
      console.log("✅ HANDLECHATBOT - Mensaje de opción inválida enviado");
    }
  } else {
    console.log("🔍 HANDLECHATBOT - Un solo departamento detectado");
    
    // ✅ LÓGICA PARA UN SOLO DEPARTAMENTO
    const currentQueue = queues[0];
    
    if (currentQueue.options && currentQueue.options.length > 0) {
      console.log("🔍 HANDLECHATBOT - Departamento con opciones detectado");
      
      const selectedOption = getBodyMessage(msg);
      console.log("🔍 HANDLECHATBOT - Opción seleccionada:", selectedOption);
      
      // ✅ VERIFICAR SI LA OPCIÓN ES VÁLIDA
      const optionIndex = parseInt(selectedOption) - 1;
      const selectedQueueOption = currentQueue.options[optionIndex];
      
      if (selectedQueueOption) {
        console.log("✅ HANDLECHATBOT - Opción válida seleccionada:", selectedQueueOption.title);
        
        // ✅ PROCESAR OPCIÓN VÁLIDA
        await verifyQueue(wbot, msg, ticket, contact, mediaSent);
      } else {
        console.log("❌ HANDLECHATBOT - Opción inválida:", selectedOption);
        
        // ✅ ENVIAR MENSAJE DE OPCIÓN INVÁLIDA
        const invalidOptionMessage = "Opción inválida, por favor, elige una opción válida.";
        
        const sendMsg = await wbot.sendMessage(
          `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          { text: invalidOptionMessage }
        );
        
        await verifyMessage(sendMsg, ticket, contact);
        console.log("✅ HANDLECHATBOT - Mensaje de opción inválida enviado");
      }
    } else {
      console.log("🔍 HANDLECHATBOT - Departamento sin opciones, procesando normalmente");
      
      // ✅ PROCESAR NORMALMENTE
      await verifyQueue(wbot, msg, ticket, contact, mediaSent);
    }
  }
};

export const handleMessageIntegration = async (
  msg: proto.IWebMessageInfo,
  wbot: Session,
  queueIntegration: QueueIntegrations,
  ticket: Ticket
): Promise<void> => {
  const msgType = getTypeMessage(msg);

  if (queueIntegration.type === "n8n" || queueIntegration.type === "webhook") {
    if (queueIntegration?.urlN8N) {
      const options = {
        method: "POST",
        url: queueIntegration?.urlN8N,
        headers: {
          "Content-Type": "application/json"
        },
        json: msg
      };
      try {
        request(options, function (error, response) {
          if (error) {
            throw new Error(error);
          }
          else {
            console.log(response.body);
          }
        });
      } catch (error) {
        throw new Error(error);
      }
    }

  } else if (queueIntegration.type === "typebot") {
            // ✅ LOG SILENCIOSO - Solo en modo debug
        if (process.env.NODE_ENV === 'development') {
          console.debug("entrou no typebot");
        }
    // await typebots(ticket, msg, wbot, queueIntegration);
    await typebotListener({ ticket, msg, wbot, typebot: queueIntegration });

  }
}

const handleMessage = async (
  msg: proto.IWebMessageInfo,
  wbot: Session,
  companyId: number
): Promise<void> => {

  let mediaSent: Message | undefined;

  if (!isValidMsg(msg)) return;
  try {
    let msgContact: IMe;
    let groupContact: Contact | undefined;

    const isGroup = msg.key.remoteJid?.endsWith("@g.us");

    const msgIsGroupBlock = await Setting.findOne({
      where: {
        companyId,
        key: "CheckMsgIsGroup",
      },
    });

    const bodyMessage = getBodyMessage(msg);
    const msgType = getTypeMessage(msg);

    const hasMedia =
      msg.message?.audioMessage ||
      msg.message?.imageMessage ||
      msg.message?.videoMessage ||
      msg.message?.documentMessage ||
      msg.message?.documentWithCaptionMessage ||
      msg.message.stickerMessage;
    if (msg.key.fromMe) {
      if (/\u200e/.test(bodyMessage)) return;

      if (
        !hasMedia &&
        msgType !== "conversation" &&
        msgType !== "extendedTextMessage" &&
        msgType !== "vcard" &&
        msgType !== "reactionMessage" 
      )
        return;
      msgContact = await getContactMessage(msg, wbot);
    } else {
      msgContact = await getContactMessage(msg, wbot);
    }

    if (msgIsGroupBlock?.value === "enabled" && isGroup) return;

    if (isGroup) {
      const grupoMeta = await wbot.groupMetadata(msg.key.remoteJid);
      const msgGroupContact = {
        id: grupoMeta.id,
        name: grupoMeta.subject
      };
      groupContact = await verifyContact(msgGroupContact, wbot, companyId);
    }

    const whatsapp = await ShowWhatsAppService(wbot.id!, companyId);
    const contact = await verifyContact(msgContact, wbot, companyId);

    let unreadMessages = 0;


    if (msg.key.fromMe) {
      await cacheLayer.set(`contacts:${contact.id}:unreads`, "0");
    } else {
      const unreads = await cacheLayer.get(`contacts:${contact.id}:unreads`);
      unreadMessages = +unreads + 1;
      await cacheLayer.set(
        `contacts:${contact.id}:unreads`,
        `${unreadMessages}`
      );
    }

    const lastMessage = await Message.findOne({
      where: {
        contactId: contact.id,
        companyId,
      },
      order: [["createdAt", "DESC"]],
    });

    if (unreadMessages === 0 && whatsapp.complationMessage && formatBody(whatsapp.complationMessage, contact).trim().toLowerCase() === lastMessage?.body.trim().toLowerCase()) {
      return;
    }

    const ticket = await FindOrCreateTicketService(contact, wbot.id!, unreadMessages, companyId, groupContact);



    await provider(ticket, msg, companyId, contact, wbot as WASocket);

    // voltar para o menu inicial


    if (bodyMessage == "#") {
      await ticket.update({
        queueOptionId: null,
        chatbot: false,
        queueId: null,
      });
      await verifyQueue(wbot, msg, ticket, ticket.contact);
      return;
    }


    const ticketTraking = await FindOrCreateATicketTrakingService({
      ticketId: ticket.id,
      companyId,
      whatsappId: whatsapp?.id
    });

    try {
      if (!msg.key.fromMe) {
        /**
         * Tratamento para avaliação do atendente
         */

        //  // dev Ricardo: insistir a responder avaliação
        //  const rate_ = Number(bodyMessage);

        //  if ((ticket?.lastMessage.includes('_Insatisfeito_') || ticket?.lastMessage.includes('Por favor avalie nosso atendimento.')) &&  (!isFinite(rate_))) {
        //      const debouncedSentMessage = debounce(
        //        async () => {
        //          await wbot.sendMessage(
        //            `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"
        //            }`,
        //            {
        //              text: 'Por favor avalie nosso atendimento.'
        //            }
        //          );
        //        },
        //        1000,
        //        ticket.id
        //      );
        //      debouncedSentMessage();
        //      return;
        //  }
        //  // dev Ricardo

        if (ticketTraking !== null && verifyRating(ticketTraking)) {

          handleRating(parseFloat(bodyMessage), ticket, ticketTraking);
          return;
        }
      }
    } catch (e) {
      Sentry.captureException(e);
      console.log(e);
    }

    // Atualiza o ticket se a ultima mensagem foi enviada por mim, para que possa ser finalizado. 
    try {
      await ticket.update({
        fromMe: msg.key.fromMe,
      });
    } catch (e) {
      Sentry.captureException(e);
      console.log(e);
    }

    if (hasMedia) {
      mediaSent = await verifyMediaMessage(msg, ticket, contact);
    } else {
      await verifyMessage(msg, ticket, contact);
    }

    const currentSchedule = await VerifyCurrentSchedule(companyId);
    const scheduleType = await Setting.findOne({
      where: {
        companyId,
        key: "scheduleType"
      }
    });


    try {
      if (!msg.key.fromMe && scheduleType) {
        /**
         * Tratamento para envio de mensagem quando a empresa está fuera do expediente
         */
        if (
          scheduleType.value === "company" &&
          !isNil(currentSchedule) &&
          (!currentSchedule || currentSchedule.inActivity === false)
        ) {
          const body = `\u200e ${whatsapp.outOfHoursMessage}`;

          console.log('body9341023', body)
          const debouncedSentMessage = debounce(
            async () => {
              await wbot.sendMessage(
                `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"
                }`,
                {
                  text: body
                }
              );
            },
            3000,
            ticket.id
          );
          debouncedSentMessage();
          return;
        }

        console.log('bodyMaaaaaaa1111aaaaaessage:', bodyMessage);
        if (scheduleType.value === "queue" && ticket.queueId !== null) {

          /**
           * Tratamento para envio de mensagem quando a fila está fuera do expediente
           */


          const queue = await Queue.findByPk(ticket.queueId);

          const { schedules }: any = queue;
          const now = moment();
          const weekday = now.format("dddd").toLowerCase();
          let schedule = null;

          if (Array.isArray(schedules) && schedules.length > 0) {
            schedule = schedules.find(
              s =>
                s.weekdayEn === weekday &&
                s.startTime !== "" &&
                s.startTime !== null &&
                s.endTime !== "" &&
                s.endTime !== null
            );
          }

          if (
            scheduleType.value === "queue" &&
            queue.outOfHoursMessage !== null &&
            queue.outOfHoursMessage !== "" &&
            !isNil(schedule)
          ) {
            const startTime = moment(schedule.startTime, "HH:mm");
            const endTime = moment(schedule.endTime, "HH:mm");

            if (now.isBefore(startTime) || now.isAfter(endTime)) {
              const body = formatBody(`\u200e ${queue.outOfHoursMessage}\n\n*[ # ]* - Volver al Menú Principal`, ticket.contact);
              console.log('body222', body)
              const sentMessage = await wbot.sendMessage(
                `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
                text: body,
              }
              );
              await verifyMessage(sentMessage, ticket, contact);
              await UpdateTicketService({
                ticketData: { queueId: null, chatbot },
                ticketId: ticket.id,
                companyId: ticket.companyId,
              });
              return;
            }
          }
        }

      }
    } catch (e) {
      Sentry.captureException(e);
      console.log(e);
    }

    try {
      if (!msg.key.fromMe) {
        if (ticketTraking !== null && verifyRating(ticketTraking)) {
          handleRating(parseFloat(bodyMessage), ticket, ticketTraking);
          return;
        }
      }
    } catch (e) {
      Sentry.captureException(e);
      console.log(e);
    }

    //openai na conexao
    if (
      !ticket.queue &&
      !isGroup &&
      !msg.key.fromMe &&
      !ticket.userId &&
      !isNil(whatsapp.promptId)
    ) {
      console.log("🔍 EJECUTANDO handleOpenAi - CONEXIÓN (whatsapp.promptId)");
      await handleOpenAi(msg, wbot, ticket, contact, mediaSent);
    }

    //integraçao na conexao
    if (
      !msg.key.fromMe &&
      !ticket.isGroup &&
      !ticket.queue &&
      !ticket.user &&
      ticket.chatbot &&
      !isNil(whatsapp.integrationId) &&
      !ticket.useIntegration
    ) {

      const integrations = await ShowQueueIntegrationService(whatsapp.integrationId, companyId);

      await handleMessageIntegration(msg, wbot, integrations, ticket)

      return
    }

    // ✅ DETECTAR PALABRAS CLAVE DE TRANSFERENCIA ENTRE DEPARTAMENTOS IA
    if (!isGroup && !msg.key.fromMe && !ticket.userId && bodyMessage) {
      console.log("🔍 VERIFICANDO PALABRAS CLAVE DE TRANSFERENCIA...");
      const transferResult = await detectTransferKeywords(bodyMessage, companyId);
      
      if (transferResult.targetQueueId && transferResult.keyword) {
        console.log("🚀 TRANSFERENCIA ENTRE DEPARTAMENTOS IA DETECTADA:");
        console.log("  - Departamento origen:", ticket.queueId);
        console.log("  - Departamento destino:", transferResult.targetQueueId);
        console.log("  - Palabra clave:", transferResult.keyword);
        
        // ✅ TRANSFERIR TICKET A NUEVO DEPARTAMENTO
        await transferQueue(transferResult.targetQueueId, ticket, contact);
        
        // ✅ FASE 1: PROCESAR MENSAJE ORIGINAL CON NUEVO PROMPT
        // ✅ NO SALIR - CONTINUAR PARA PROCESAR EL MENSAJE ORIGINAL
        console.log("✅ HANDLEMESSAGE - Transferencia completada, procesando mensaje original con nuevo prompt");
      }
    }

    //openai na fila
    if (
      !isGroup &&
      !msg.key.fromMe &&
      !ticket.userId &&
      !isNil(ticket.promptId) &&
      ticket.useIntegration &&
      ticket.queueId

    ) {
      console.log("🔍 EJECUTANDO handleOpenAi - FILA (ticket.promptId)");
      console.log("🔍 DEBUG TICKET - queueId:", ticket.queueId, "promptId:", ticket.promptId, "useIntegration:", ticket.useIntegration);
      await handleOpenAi(msg, wbot, ticket, contact, mediaSent);
    }

    if (
      !msg.key.fromMe &&
      !ticket.isGroup &&
      !ticket.userId &&
      ticket.integrationId &&
      ticket.useIntegration &&
      ticket.queue
    ) {

              // ✅ LOG SILENCIOSO - Solo en modo debug
        if (process.env.NODE_ENV === 'development') {
          console.debug("entrou no type 1974");
        }
      const integrations = await ShowQueueIntegrationService(ticket.integrationId, companyId);

      await handleMessageIntegration(msg, wbot, integrations, ticket)

    }

    if (
      !ticket.queue &&
      !ticket.isGroup &&
      !msg.key.fromMe &&
      !ticket.userId &&
      whatsapp.queues.length >= 1 &&
      !ticket.useIntegration
    ) {

      // ✅ DETECCIÓN EN TIEMPO REAL: Verificar si el departamento del ticket coincide con el configurado
      // SOLO si el ticket no está en proceso de ser atendido
      if (ticket.queueId && whatsapp.queues && whatsapp.queues.length > 0 && !ticket.userId) {
        const configuredQueueId = whatsapp.queues[0].id; // Tomar el primer departamento configurado
        
        if (ticket.queueId !== configuredQueueId) {
          console.log("🔄 DEPARTAMENTO INCORRECTO DETECTADO:");
          console.log("  - Ticket Queue ID:", ticket.queueId);
          console.log("  - WhatsApp Queue ID:", configuredQueueId);
          console.log("  - Reseteando ticket automáticamente...");
          
          // Resetear ticket automáticamente
          await ticket.update({
            queueId: null,
            queueOptionId: null,
            chatbot: false,
            useIntegration: false,
            promptId: null,
            integrationId: null,
            status: "pending"
          });
          
          console.log("✅ TICKET RESETEADO - Reasignando departamento...");
        }
      }
      
      // ✅ REASIGNACIÓN AUTOMÁTICA: Si el ticket no tiene departamento, asignarlo al configurado
      if (!ticket.queueId && whatsapp.queues && whatsapp.queues.length > 0) {
        const configuredQueueId = whatsapp.queues[0].id;
        console.log("🔄 REASIGNANDO TICKET A DEPARTAMENTO:");
        console.log("  - Ticket sin departamento, asignando a:", configuredQueueId);
        console.log("  - Ticket ID:", ticket.id);
        console.log("  - Ticket queueId antes:", ticket.queueId);
        
        // ✅ VERIFICAR SI EL DEPARTAMENTO TIENE PROMPT
        const queue = await Queue.findByPk(configuredQueueId, {
          include: [{ model: Prompt, as: 'prompt' }]
        });
        
        let chatbot = false;
        if (queue && queue.options && queue.options.length > 0) {
          chatbot = true;
        }
        
        // ✅ SI NO HAY PROMPT, ACTIVAR CHATBOT SIMPLE
        if (!queue?.promptId && !queue?.prompt) {
          console.log("📋 DEPARTAMENTO SIN PROMPT - ACTIVANDO CHATBOT SIMPLE");
          chatbot = true;
        }
        
        await ticket.update({
          queueId: configuredQueueId,
          chatbot: chatbot,
          status: "pending"
        });
        
        console.log("✅ TICKET REASIGNADO - Departamento actualizado, Chatbot:", chatbot);
        console.log("  - Ticket queueId después:", ticket.queueId);
      } else {
        console.log("🔍 DEBUG REASIGNACIÓN - Ticket queueId:", ticket.queueId, "WhatsApp queues:", whatsapp.queues ? whatsapp.queues.length : 0);
        console.log("🔍 DEBUG REASIGNACIÓN - Ticket chatbot:", ticket.chatbot, "Ticket status:", ticket.status);
      }
      
      // Removido logs de debug innecesarios
      await verifyQueue(wbot, msg, ticket, contact);

      if (ticketTraking.chatbotAt === null) {
        await ticketTraking.update({
          chatbotAt: moment().toDate(),
        })
      }
    }

    const dontReadTheFirstQuestion = ticket.queue === null;

    await ticket.reload();

    try {
      //Fluxo fora do expediente
      if (!msg.key.fromMe && scheduleType && ticket.queueId !== null) {
        /**
         * Tratamento para envio de mensagem quando a fila está fora do expediente
         */
        const queue = await Queue.findByPk(ticket.queueId);

        const { schedules }: any = queue;
        const now = moment();
        const weekday = now.format("dddd").toLowerCase();
        let schedule = null;

        if (Array.isArray(schedules) && schedules.length > 0) {
          schedule = schedules.find(
            s =>
              s.weekdayEn === weekday &&
              s.startTime !== "" &&
              s.startTime !== null &&
              s.endTime !== "" &&
              s.endTime !== null
          );
        }

        if (
          scheduleType.value === "queue" &&
          queue.outOfHoursMessage !== null &&
          queue.outOfHoursMessage !== "" &&
          !isNil(schedule)
        ) {
          const startTime = moment(schedule.startTime, "HH:mm");
          const endTime = moment(schedule.endTime, "HH:mm");

          if (now.isBefore(startTime) || now.isAfter(endTime)) {
            const body = queue.outOfHoursMessage;
            console.log('body158964153', body)
            const debouncedSentMessage = debounce(
              async () => {
                await wbot.sendMessage(
                  `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"
                  }`,
                  {
                    text: body
                  }
                );
              },
              3000,
              ticket.id
            );
            debouncedSentMessage();
            return;
          }
        }
      }
	  
    } catch (e) {
      Sentry.captureException(e);
      console.log(e);
    }



    if (!whatsapp?.queues?.length && !ticket.userId && !isGroup && !msg.key.fromMe) {

      const lastMessage = await Message.findOne({
        where: {
          ticketId: ticket.id,
          fromMe: true
        },
        order: [["createdAt", "DESC"]]
      });

      if (lastMessage && lastMessage.body.includes(whatsapp.greetingMessage)) {
        return;
      }

      if (whatsapp.greetingMessage) {

        console.log('whatsapp.greetingMessage', whatsapp.greetingMessage)
        const debouncedSentMessage = debounce(
          async () => {
            await wbot.sendMessage(
              `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"
              }`,
              {
                text: whatsapp.greetingMessage
              }
            );
          },
          1000,
          ticket.id
        );
        debouncedSentMessage();
        return;
      }

    }


    if (whatsapp.queues.length == 1 && ticket.queue) {
      if (ticket.chatbot && !msg.key.fromMe) {
        await handleChartbot(wbot, msg, ticket, ticket.contact, mediaSent);
      }
    }
    if (whatsapp.queues.length > 1 && ticket.queue) {
      if (ticket.chatbot && !msg.key.fromMe) {
        await handleChartbot(wbot, msg, ticket, ticket.contact, mediaSent);
      }
    }

  } catch (err) {
    console.log(err)
    Sentry.captureException(err);
    logger.error(`Error handling whatsapp message: Err: ${err}`);
  }
};

const handleMsgAck = async (
  msg: WAMessage,
  chat: number | null | undefined
) => {
  await new Promise((r) => setTimeout(r, 500));
  const io = getIO();

  try {
    const messageToUpdate = await Message.findByPk(msg.key.id, {
      include: [
        "contact",
        {
          model: Message,
          as: "quotedMsg",
          include: ["contact"],
        },
      ],
    });

    if (!messageToUpdate) return;
    await messageToUpdate.update({ ack: chat });
    io.to(messageToUpdate.ticketId.toString()).emit(
      `company-${messageToUpdate.companyId}-appMessage`,
      {
        action: "update",
        message: messageToUpdate,
      }
    );
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Error handling message ack. Err: ${err}`);
  }
};

const verifyRecentCampaign = async (
  message: proto.IWebMessageInfo,
  companyId: number
) => {
  if (!message.key.fromMe) {
    const number = message.key.remoteJid.replace(/\D/g, "");
    const campaigns = await Campaign.findAll({
      where: { companyId, status: "EM_ANDAMENTO", confirmation: true },
    });
    if (campaigns) {
      const ids = campaigns.map((c) => c.id);
      const campaignShipping = await CampaignShipping.findOne({
        where: { campaignId: { [Op.in]: ids }, number, confirmation: null },
      });

      if (campaignShipping) {
        await campaignShipping.update({
          confirmedAt: moment(),
          confirmation: true,
        });
        await campaignQueue.add(
          "DispatchCampaign",
          {
            campaignShippingId: campaignShipping.id,
            campaignId: campaignShipping.campaignId,
          },
          {
            delay: parseToMilliseconds(randomValue(0, 10)),
          }
        );
      }
    }
  }
};

const verifyCampaignMessageAndCloseTicket = async (
  message: proto.IWebMessageInfo,
  companyId: number
) => {
  const io = getIO();
  const body = getBodyMessage(message);
  const isCampaign = /\u200c/.test(body);
  
  // ✅ SOLUCIÓN: NO CERRAR TICKETS AUTOMÁTICAMENTE EN MENSAJES DE CAMPAÑA
  // Los tickets deben permanecer abiertos para que el usuario pueda hacer seguimiento
  if (message.key.fromMe && isCampaign) {
    console.log("📨 MENSAJE DE CAMPAÑA DETECTADO - Manteniendo ticket abierto");
    
    const messageRecord = await Message.findOne({
      where: { id: message.key.id!, companyId },
    });
    
    if (messageRecord) {
      const ticket = await Ticket.findByPk(messageRecord.ticketId);
      
      if (ticket) {
        // ✅ MANTENER TICKET ABIERTO - No cambiar estado a "closed"
        // El ticket debe permanecer en estado "open" para seguimiento
        console.log(`✅ Ticket ${ticket.id} mantenido abierto para seguimiento`);
        
        // Solo actualizar lastMessage si es necesario
        await ticket.update({ 
          lastMessage: body,
          // ✅ NO CAMBIAR STATUS - Mantener estado actual
        });
        
        // ✅ NOTIFICAR ACTUALIZACIÓN SIN CAMBIAR ESTADO
        io.to(`company-${ticket.companyId}-${ticket.status}`)
          .to(`queue-${ticket.queueId}-${ticket.status}`)
          .to(ticket.id.toString())
          .emit(`company-${ticket.companyId}-ticket`, {
            action: "update",
            ticket,
            ticketId: ticket.id,
          });
      }
    }
  }
};

const filterMessages = (msg: WAMessage): boolean => {
  if (msg.message?.protocolMessage) return false;

  if (
    [
      WAMessageStubType.REVOKE,
      WAMessageStubType.E2E_DEVICE_CHANGED,
      WAMessageStubType.E2E_IDENTITY_CHANGED,
      WAMessageStubType.CIPHERTEXT
    ].includes(msg.messageStubType)
  )
    return false;

  return true;
};

const wbotMessageListener = async (wbot: Session, companyId: number): Promise<void> => {
  try {
    wbot.ev.on("messages.upsert", async (messageUpsert: ImessageUpsert) => {
      // ✅ LOGS SILENCIOSOS - Solo en modo debug
      if (process.env.NODE_ENV === 'development') {
        console.debug("📨 MESSAGE UPSERT RECIBIDO - Mensajes:", messageUpsert.messages.length);
      }
      
      const messages = messageUpsert.messages
        .filter(filterMessages)
        .map(msg => msg);

      if (!messages) return;

      messages.forEach(async (message: proto.IWebMessageInfo) => {
        // ✅ LOGS SILENCIOSOS - Solo en modo debug
        if (process.env.NODE_ENV === 'development') {
          console.debug("📝 PROCESANDO MENSAJE - ID:", message.key.id);
        }

        const messageExists = await Message.count({
          where: { id: message.key.id!, companyId }
        });

        if (!messageExists) {
          // ✅ LOGS SILENCIOSOS - Solo en modo debug
          if (process.env.NODE_ENV === 'development') {
            console.debug("✅ MENSAJE NUEVO - Iniciando procesamiento");
          }
          await handleMessage(message, wbot, companyId);
          await verifyRecentCampaign(message, companyId);
          await verifyCampaignMessageAndCloseTicket(message, companyId);
        } else {
          // ✅ LOGS SILENCIOSOS - Solo en modo debug
          if (process.env.NODE_ENV === 'development') {
            console.debug("⚠️ MENSAJE DUPLICADO - Saltando procesamiento");
          }
        }
      });
    });

    wbot.ev.on("messages.update", (messageUpdate: WAMessageUpdate[]) => {
      if (messageUpdate.length === 0) return;
      messageUpdate.forEach(async (message: WAMessageUpdate) => {
        (wbot as WASocket)!.readMessages([message.key])
		
		const msgUp = { ...messageUpdate }
        if (msgUp['0']?.update.messageStubType === 1 && msgUp['0']?.key.remoteJid !== 'status@broadcast') {
          MarkDeleteWhatsAppMessage(msgUp['0']?.key.remoteJid, null, msgUp['0']?.key.id, companyId)
        }

        handleMsgAck(message, message.update.status);
      });
    });

    // wbot.ev.on("messages.set", async (messageSet: IMessage) => {
    //   messageSet.messages.filter(filterMessages).map(msg => msg);
    // });
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`Error handling wbot message listener. Err: ${error}`);
  }
};

export { handleMessage, wbotMessageListener };

// ✅ FUNCIÓN: Detectar departamentos IA dinámicamente
const detectAIQueues = async (companyId: number) => {
  try {
    const queues = await Queue.findAll({
      where: { companyId },
      include: [{ model: Prompt, as: 'prompt' }]
    });

    const aiQueues = queues.filter(queue => {
      // ✅ DETECCIÓN POR NOMBRE (BOT-AI-*)
      const isAIName = queue.name.toLowerCase().includes('bot-ai') || 
                      queue.name.toLowerCase().includes('ia') ||
                      queue.name.toLowerCase().includes('ai');
      
      // ✅ DETECCIÓN POR PROMPT CONFIGURADO
      const hasPrompt = queue.promptId || queue.prompt;
      
      return isAIName || hasPrompt;
    });

    console.log("🤖 DEPARTAMENTOS IA DETECTADOS:", aiQueues.map(q => q.name));
    return aiQueues;
  } catch (error) {
    console.error("❌ ERROR detectando departamentos IA:", error);
    return [];
  }
};

// ✅ FUNCIÓN: Generar palabras clave dinámicamente
const generateActivationKeywords = async (companyId: number) => {
  const aiQueues = await detectAIQueues(companyId);
  
  const keywords = {};
  aiQueues.forEach(queue => {
    // ✅ GENERAR PALABRA CLAVE BASADA EN NOMBRE
    const queueName = queue.name.toLowerCase();
    let keyword = "";
    
    if (queueName.includes("soporte")) {
      keyword = "hola soporte";
    } else if (queueName.includes("ventas")) {
      keyword = "hola ventas";
    } else if (queueName.includes("atención") || queueName.includes("atencion")) {
      keyword = "hola atención";
    } else if (queueName.includes("técnico") || queueName.includes("tecnico")) {
      keyword = "hola técnico";
    } else if (queueName.includes("facturación") || queueName.includes("facturacion")) {
      keyword = "hola facturación";
    } else if (queueName.includes("cobranza")) {
      keyword = "hola cobranza";
    } else if (queueName.includes("reclamos")) {
      keyword = "hola reclamos";
    } else if (queueName.includes("bot-ai") || queueName.includes("ia") || queueName.includes("ai")) {
      // ✅ DEPARTAMENTOS IA: Palabras clave más específicas
      const cleanName = queueName.replace(/bot-ai|ia|ai/g, '').trim();
      if (cleanName) {
        keyword = `transferir a ${cleanName}`;
      } else {
        keyword = "transferir departamento";
      }
    } else {
      // ✅ PALABRA CLAVE GENÉRICA
      keyword = `hola ${queueName.replace(/[^a-z]/g, '')}`;
    }
    
    keywords[queue.id] = keyword;
  });
  
  console.log("🔑 PALABRAS CLAVE GENERADAS:", keywords);
  return keywords;
};

// ✅ FUNCIÓN HELPER: Recargar ticket de forma robusta
const reloadTicketSafely = async (ticket: Ticket): Promise<Ticket> => {
  try {
    console.log("🔄 RELOADING TICKET - ID:", ticket.id);
    
    // ✅ FORZAR RECARGA DESDE BD
    await ticket.reload();
    
    // ✅ VERIFICAR DATOS CRÍTICOS
    console.log("🔍 TICKET RELOADED - Estado actual:");
    console.log("  - queueId:", ticket.queueId);
    console.log("  - useIntegration:", ticket.useIntegration);
    console.log("  - promptId:", ticket.promptId);
    console.log("  - chatbot:", ticket.chatbot);
    console.log("  - status:", ticket.status);
    
    return ticket;
  } catch (error) {
    console.error("❌ ERROR recargando ticket:", error);
    // ✅ FALLBACK: Buscar ticket directamente desde BD
    try {
      const freshTicket = await Ticket.findByPk(ticket.id);
      if (freshTicket) {
        console.log("✅ TICKET RECUPERADO DESDE BD");
        return freshTicket;
      }
    } catch (fallbackError) {
      console.error("❌ ERROR en fallback:", fallbackError);
    }
    return ticket; // Retornar el original si todo falla
  }
};

// ✅ FUNCIÓN HELPER: Verificar si ticket debe usar IA
const shouldUseAI = (ticket: Ticket): boolean => {
  const hasPrompt = ticket.promptId != null;
  const hasIntegration = ticket.useIntegration === true;
  const hasQueue = ticket.queueId != null;
  
  console.log("🔍 VERIFICANDO SI DEBE USAR IA:");
  console.log("  - hasPrompt:", hasPrompt);
  console.log("  - hasIntegration:", hasIntegration);
  console.log("  - hasQueue:", hasQueue);
  console.log("  - RESULTADO:", hasPrompt && hasIntegration && hasQueue);
  
  return hasPrompt && hasIntegration && hasQueue;
};

// ✅ FUNCIÓN HELPER: Detectar palabras clave de transferencia
const detectTransferKeywords = async (messageBody: string, companyId: number): Promise<{ targetQueueId: number | null, keyword: string | null }> => {
  try {
    const activationKeywords = await generateActivationKeywords(companyId);
    const lowerMessage = messageBody.toLowerCase();
    
    // ✅ DETECCIÓN PRINCIPAL: Palabras clave exactas
    for (const [queueId, keyword] of Object.entries(activationKeywords)) {
      if (lowerMessage.includes((keyword as string).toLowerCase())) {
        console.log("🔑 TRANSFERENCIA DETECTADA (palabra clave exacta):");
        console.log("  - Mensaje:", messageBody);
        console.log("  - Palabra clave:", keyword);
        console.log("  - Departamento destino:", queueId);
        
        return {
          targetQueueId: parseInt(queueId),
          keyword: keyword as string
        };
      }
    }
    
    // ✅ DETECCIÓN SECUNDARIA: Palabras clave específicas por departamento
    const aiQueues = await detectAIQueues(companyId);
    for (const queue of aiQueues) {
      const queueName = queue.name.toLowerCase();
      
      // ✅ DETECTAR PALABRAS ESPECÍFICAS POR DEPARTAMENTO
      if (queueName.includes("ventas") || queueName.includes("bot-ai-ventas")) {
        if (lowerMessage.includes("comprar") || lowerMessage.includes("compra") || 
            lowerMessage.includes("venta") || lowerMessage.includes("producto") ||
            lowerMessage.includes("precio") || lowerMessage.includes("costo")) {
          console.log("🔑 TRANSFERENCIA DETECTADA (palabra específica ventas):");
          console.log("  - Mensaje:", messageBody);
          console.log("  - Departamento destino:", queue.name);
          
          return {
            targetQueueId: queue.id,
            keyword: "comprar/ventas"
          };
        }
      }
      
      if (queueName.includes("soporte") || queueName.includes("bot-ai-soporte")) {
        if (lowerMessage.includes("ayuda") || lowerMessage.includes("problema") || 
            lowerMessage.includes("error") || lowerMessage.includes("soporte") ||
            lowerMessage.includes("asistencia")) {
          console.log("🔑 TRANSFERENCIA DETECTADA (palabra específica soporte):");
          console.log("  - Mensaje:", messageBody);
          console.log("  - Departamento destino:", queue.name);
          
          return {
            targetQueueId: queue.id,
            keyword: "ayuda/soporte"
          };
        }
      }
      
      if (queueName.includes("técnico") || queueName.includes("tecnico") || queueName.includes("bot-ai-tecnico")) {
        if (lowerMessage.includes("técnico") || lowerMessage.includes("reparar") || 
            lowerMessage.includes("arreglar") || lowerMessage.includes("falla") ||
            lowerMessage.includes("daño")) {
          console.log("🔑 TRANSFERENCIA DETECTADA (palabra específica técnico):");
          console.log("  - Mensaje:", messageBody);
          console.log("  - Departamento destino:", queue.name);
          
          return {
            targetQueueId: queue.id,
            keyword: "técnico/reparación"
          };
        }
      }
    }
    
    return { targetQueueId: null, keyword: null };
  } catch (error) {
    console.error("❌ ERROR detectando palabras clave:", error);
    return { targetQueueId: null, keyword: null };
  }
};