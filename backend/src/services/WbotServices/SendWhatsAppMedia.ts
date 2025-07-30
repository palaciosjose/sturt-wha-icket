import { WAMessage, AnyMessageContent } from "@whiskeysockets/baileys";
import * as Sentry from "@sentry/node";
import fs from "fs";
import { exec } from "child_process";
import path from "path";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Ticket from "../../models/Ticket";
import mime from "mime-types";
import formatBody from "../../helpers/Mustache";
import CreateMessageService from "../MessageServices/CreateMessageService";

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  body?: string;
  isForwarded?: boolean;
  fileSize?: number;
}

const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

const processAudio = async (audio: string, isCampaign: boolean = false): Promise<string> => {
  const outputAudio = `${publicFolder}/${new Date().getTime()}.mp3`;
  console.log(`[FFmpeg] 🎵 Iniciando procesamiento de audio: ${audio}`);
  return new Promise((resolve, reject) => {
    exec(
      `${ffmpegPath.path} -i ${audio} -vn -ab 128k -ar 44100 -f ipod ${outputAudio} -y`,
      (error, _stdout, _stderr) => {
        if (error) {
          console.log(`[FFmpeg] ❌ Error procesando audio: ${error.message}`);
          reject(error);
          return;
        }
        // ✅ PRESERVAR ARCHIVO ORIGINAL PARA EL FRONTEND
        console.log(`[FFmpeg] ✅ Audio procesado exitosamente - Archivo original preservado: ${audio}`);
        resolve(outputAudio);
      }
    );
  });
};

const processAudioFile = async (audio: string): Promise<string> => {
  const outputAudio = `${publicFolder}/${new Date().getTime()}.ogg`;
  return new Promise((resolve, reject) => {
    // ✅ CONFIGURACIÓN EXACTA DE CHASAP PRO
    const ffmpegCommand = `${ffmpegPath.path} -i ${audio} -vn -c:a libopus -b:a 128k ${outputAudio} -y`;
    
    exec(ffmpegCommand, (error, _stdout, _stderr) => {
      if (error) {
        reject(error);
        return;
      }
      // Verificar que el archivo procesado existe
      if (!fs.existsSync(outputAudio)) {
        reject(new Error("Archivo procesado no encontrado"));
        return;
      }
      
      resolve(outputAudio);
    });
  });
};

export const getMessageOptions = async (
  fileName: string,
  pathMedia: string,
  body?: string
): Promise<any> => {
  const mimeType = mime.lookup(pathMedia);
  
  // Lista de extensiones de video para detección mejorada (basado en Chasap Pro)
  const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.3gp', '.m4v'];
  const fileExtension = path.extname(fileName).toLowerCase();
  
  // Si tiene extensión de video, forzar tipo video
  let typeMessage = mimeType.split("/")[0];
  if (videoExtensions.includes(fileExtension)) {
    typeMessage = "video";
  }

  try {
    if (!mimeType) {
      throw new Error("Invalid mimetype");
    }
    let options: AnyMessageContent;

    if (typeMessage === "video") {
      options = {
        video: fs.readFileSync(pathMedia),
        caption: body ? body : '',
        fileName: fileName
        // gifPlayback: true
      };
    } else if (typeMessage === "audio") {
      const typeAudio = true; //fileName.includes("audio-record-site");
      try {
        const convert = await processAudio(pathMedia);
        options = {
          audio: fs.readFileSync(convert),
          mimetype: "audio/ogg", // WhatsApp acepta audio/ogg para audio
          caption: body ? body : null,
          ptt: true
        };
      } catch (audioError) {
        // Si falla el procesamiento de audio, enviar como documento
        options = {
          document: fs.readFileSync(pathMedia),
          caption: body ? body : null,
          fileName: fileName,
          mimetype: mimeType
        };
      }
    } else if (typeMessage === "document" || typeMessage === "text" || typeMessage === "application") {
      options = {
        document: fs.readFileSync(pathMedia),
        caption: body ? body : null,
        fileName: fileName,
        mimetype: mimeType
      };
    } else {
      options = {
        image: fs.readFileSync(pathMedia),
        caption: body ? body : null
      };
    }

    return options;
  } catch (e) {
    Sentry.captureException(e);
    console.log(e);
    return null;
  }
};

const SendWhatsAppMedia = async ({
  media,
  ticket,
  body,
  isForwarded = false,
  fileSize
}: Request): Promise<WAMessage> => {
  console.log(`[SendWhatsAppMedia] 🎯 INICIANDO ENVÍO - Archivo: ${media.originalname}`);
  try {
    const wbot = await GetTicketWbot(ticket);

    let pathMedia = media.path;
    
    // Lista de extensiones de video para detección mejorada (basado en Chasap Pro)
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.3gp', '.m4v'];
    const fileExtension = path.extname(media.originalname).toLowerCase();
    
    // Si tiene extensión de video, forzar tipo video
    let typeMessage = media.mimetype.split("/")[0];
    if (videoExtensions.includes(fileExtension)) {
      typeMessage = "video";
    }
    
    let options: AnyMessageContent;
    const bodyMessage = formatBody(body, ticket.contact)

    // Log para debugging
    console.log(`[SendWhatsAppMedia] Archivo: ${media.originalname}, MIME: ${media.mimetype}, Tipo: ${typeMessage}`);

    if (typeMessage === "video") {
      options = {
        video: fs.readFileSync(pathMedia),
        caption: bodyMessage,
        fileName: media.originalname,
        contextInfo: { forwardingScore: isForwarded ? 2 : 0, isForwarded: isForwarded }
        // gifPlayback: true
      };
    } else if (typeMessage === "audio") {
      const typeAudio = media.originalname.includes("audio-record-site");
      
      // ✅ CONVERTIR OGG A MP3 PARA WHATSAPP (SOLUCIÓN DEFINITIVA)
      if (media.mimetype === "audio/ogg") {
        try {
          console.log(`[SendWhatsAppMedia] Archivo OGG detectado, convirtiendo a MP3: ${media.path}`);
          const processedAudioPath = await processAudioFile(media.path);
          
          // Verificar que el archivo procesado existe
          if (!fs.existsSync(processedAudioPath)) {
            throw new Error("Archivo de audio procesado no encontrado");
          }
          
          console.log(`[SendWhatsAppMedia] Audio convertido a MP3: ${processedAudioPath}`);
          
          // ✅ ACTUALIZAR pathMedia PARA USAR EL ARCHIVO PROCESADO
          pathMedia = processedAudioPath;
          
          // ✅ SOLUCIÓN EXACTA DE CHASAP PRO
          options = {
            audio: fs.readFileSync(processedAudioPath),
            mimetype: "audio/ogg; codecs=opus", // ✅ MIMETYPE EXACTO DE CHASAP PRO
            ptt: true, // ✅ PUSH-TO-TALK (como Chasap Pro)
            contextInfo: { forwardingScore: isForwarded ? 2 : 0, isForwarded: isForwarded }
          };
          
          console.log(`[SendWhatsAppMedia] 🎵 Configuración final: mimetype=audio/ogg; codecs=opus, ptt=true`);
          
          // Guardar la ruta del archivo procesado para limpiarlo después del envío
          const processedAudioPathToClean = processedAudioPath;
          
        } catch (audioError) {
          console.log(`[SendWhatsAppMedia] Error convirtiendo OGG a MP3, enviando como documento: ${audioError.message}`);
          // Si falla la conversión, enviar como documento
          options = {
            document: fs.readFileSync(media.path),
            caption: bodyMessage,
            fileName: media.originalname,
            mimetype: media.mimetype,
            contextInfo: { forwardingScore: isForwarded ? 2 : 0, isForwarded: isForwarded }
          };
        }
      } else {
        try {
              // ✅ CONVERTIR TODOS LOS AUDIOS A OGG (SOLUCIÓN DEFINITIVA)
    const processedAudioPath = await processAudioFile(media.path);
    
    // Verificar que el archivo procesado existe
    if (!fs.existsSync(processedAudioPath)) {
      throw new Error("Archivo de audio procesado no encontrado");
    }
    
    // ✅ ACTUALIZAR pathMedia PARA USAR EL ARCHIVO PROCESADO
    pathMedia = processedAudioPath;
    
    // ✅ SOLUCIÓN EXACTA DE CHASAP PRO
    options = {
      audio: fs.readFileSync(processedAudioPath),
      mimetype: "audio/ogg; codecs=opus", // ✅ MIMETYPE EXACTO DE CHASAP PRO
      ptt: true, // ✅ PUSH-TO-TALK (como Chasap Pro)
      contextInfo: { forwardingScore: isForwarded ? 2 : 0, isForwarded: isForwarded }
    };
          
          } catch (audioError) {
    // Si falla la conversión, enviar como documento
          options = {
            document: fs.readFileSync(media.path),
            caption: bodyMessage,
            fileName: media.originalname,
            mimetype: media.mimetype,
            contextInfo: { forwardingScore: isForwarded ? 2 : 0, isForwarded: isForwarded }
          };
        }
      }
    } else if (typeMessage === "document" || typeMessage === "text" || typeMessage === "application") {
      options = {
        document: fs.readFileSync(pathMedia),
        caption: bodyMessage,
        fileName: media.originalname,
        mimetype: media.mimetype,
        contextInfo: { forwardingScore: isForwarded ? 2 : 0, isForwarded: isForwarded }
      };
    } else if (typeMessage === "image") {
      options = {
        image: fs.readFileSync(pathMedia),
        caption: bodyMessage,
        contextInfo: { forwardingScore: isForwarded ? 2 : 0, isForwarded: isForwarded }
      };
    } else {
      // Para archivos sin extensión o tipos desconocidos, enviar como documento
      console.log(`[SendWhatsAppMedia] Tipo desconocido: ${typeMessage}, enviando como documento`);
      options = {
        document: fs.readFileSync(pathMedia),
        caption: bodyMessage,
        fileName: media.originalname,
        mimetype: media.mimetype || "application/octet-stream",
        contextInfo: { forwardingScore: isForwarded ? 2 : 0, isForwarded: isForwarded }
      };
    }

    // ✅ VALIDAR QUE EL ARCHIVO EXISTE ANTES DEL ENVÍO
    if (!fs.existsSync(pathMedia)) {
      throw new Error(`Archivo no encontrado antes del envío: ${pathMedia}`);
    }
    
    console.log(`[SendWhatsAppMedia] 🚀 Enviando mensaje a: ${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`);
    console.log(`[SendWhatsAppMedia] 📋 Tipo de mensaje: ${typeMessage}, MIME: ${media.mimetype}, Tamaño: ${fs.statSync(media.path).size} bytes`);
    
    // ✅ ENVÍO CON MANEJO DE ERRORES ESPECÍFICO
    let sentMessage;
    try {
      sentMessage = await wbot.sendMessage(
        `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
        {
          ...options
        }
      );
      
      console.log(`[SendWhatsAppMedia] ✅ Mensaje enviado exitosamente:`, sentMessage.key.id);
      console.log(`[SendWhatsAppMedia] 📊 Estado del mensaje:`, sentMessage.status);
      console.log(`[SendWhatsAppMedia] 🎵 Tipo de contenido enviado:`, typeMessage);
      console.log(`[SendWhatsAppMedia] 📱 Destinatario:`, ticket.contact.number);
      console.log(`[SendWhatsAppMedia] 🔍 Verificando si WhatsApp procesó el audio...`);
    } catch (sendError) {
      console.log(`[SendWhatsAppMedia] ❌ Error enviando mensaje:`, sendError.message);
      throw new Error(`Error enviando mensaje a WhatsApp: ${sendError.message}`);
    }

    await ticket.update({ lastMessage: bodyMessage });

    // ✅ CALCULAR TAMAÑO DEL ARCHIVO SI NO SE PROPORCIONA
    let calculatedFileSize = fileSize;
    if (!calculatedFileSize) {
      try {
        const stats = fs.statSync(media.path);
        calculatedFileSize = stats.size;
        console.log(`[SendWhatsAppMedia] Tamaño calculado: ${calculatedFileSize} bytes`);
      } catch (error) {
        console.log(`[SendWhatsAppMedia] Error calculando tamaño: ${error.message}`);
        calculatedFileSize = 0;
      }
    }

    // ✅ GUARDAR MENSAJE EN LA BASE DE DATOS CON TAMAÑO DEL ARCHIVO
    const messageData = {
      id: sentMessage.key.id,
      ticketId: ticket.id,
      contactId: undefined, // Mensaje enviado por nosotros
      body: bodyMessage || media.originalname,
      fromMe: true,
      read: true,
      mediaUrl: media.filename,
      mediaType: media.mimetype.split("/")[0],
      mediaSize: calculatedFileSize,
      ack: sentMessage.status,
      remoteJid: sentMessage.key.remoteJid,
      participant: sentMessage.key.participant,
      dataJson: JSON.stringify(sentMessage),
    };

    await CreateMessageService({
      messageData,
      companyId: ticket.companyId,
    });

    // ✅ NO ELIMINAR ARCHIVOS - PRESERVAR PARA EL FRONTEND
    console.log(`[SendWhatsAppMedia] ✅ Archivo preservado para el frontend: ${media.path}`);

    return sentMessage;
  } catch (err) {
    Sentry.captureException(err);
    console.log(err);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMedia;
