import * as Sentry from "@sentry/node";
import BullQueue from "bull";
import { addSeconds, differenceInSeconds } from "date-fns";
import { isArray, isEmpty, isNil } from "lodash";
import moment from "moment-timezone";
import path from "path";
import { Op, QueryTypes } from "sequelize";
import sequelize from "./database";
import GetDefaultWhatsApp from "./helpers/GetDefaultWhatsApp";
import GetWhatsappWbot from "./helpers/GetWhatsappWbot";
import formatBody from "./helpers/Mustache";
import { MessageData, SendMessage } from "./helpers/SendMessage";
import { getIO } from "./libs/socket";
import Campaign from "./models/Campaign";
import CampaignSetting from "./models/CampaignSetting";
import CampaignShipping from "./models/CampaignShipping";
import Company from "./models/Company";
import Contact from "./models/Contact";
import ContactList from "./models/ContactList";
import ContactListItem from "./models/ContactListItem";
import Message from "./models/Message";
import Plan from "./models/Plan";
import Schedule from "./models/Schedule";
import Ticket from "./models/Ticket";
import User from "./models/User";
import Whatsapp from "./models/Whatsapp";
import ShowFileService from "./services/FileServices/ShowService";
import { getMessageOptions } from "./services/WbotServices/SendWhatsAppMedia";
import { ClosedAllOpenTickets } from "./services/WbotServices/wbotClosedTickets";
import { logger } from "./utils/logger";
import GetTimezone from "./helpers/GetTimezone";


const nodemailer = require('nodemailer');
const CronJob = require('cron').CronJob;

const connection = process.env.REDIS_URI || "";
const limiterMax = process.env.REDIS_OPT_LIMITER_MAX || 1;
const limiterDuration = process.env.REDIS_OPT_LIMITER_DURATION || 3000;

interface ProcessCampaignData {
  id: number;
  delay: number;
}

interface PrepareContactData {
  contactId: number;
  campaignId: number;
  delay: number;
  variables: any[];
}

interface DispatchCampaignData {
  campaignId: number;
  campaignShippingId: number;
  contactListItemId: number;
}

export const userMonitor = new BullQueue("UserMonitor", connection);

export const queueMonitor = new BullQueue("QueueMonitor", connection);

export const messageQueue = new BullQueue("MessageQueue", connection, {
  limiter: {
    max: limiterMax as number,
    duration: limiterDuration as number
  }
});

export const scheduleMonitor = new BullQueue("ScheduleMonitor", connection);
export const sendScheduledMessages = new BullQueue(
  "SendSacheduledMessages",
  connection
);

export const campaignQueue = new BullQueue("CampaignQueue", connection);

async function handleSendMessage(job) {
  try {
    const { data } = job;

    const whatsapp = await Whatsapp.findByPk(data.whatsappId);

    if (whatsapp == null) {
      throw Error("Whatsapp não identificado");
    }

    const messageData: MessageData = data.data;

    await SendMessage(whatsapp, messageData);
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("MessageQueue -> SendMessage: error", e.message);
    throw e;
  }
}

{/*async function handleVerifyQueue(job) {
  logger.info("Buscando atendimentos perdidos nas filas");
  try {
    const companies = await Company.findAll({
      attributes: ['id', 'name'],
      where: {
        status: true,
        dueDate: {
          [Op.gt]: Sequelize.literal('CURRENT_DATE')
        }
      },
      include: [
        {
          model: Whatsapp, attributes: ["id", "name", "status", "timeSendQueue", "sendIdQueue"], where: {
            timeSendQueue: {
              [Op.gt]: 0
            }
          }
        },
      ]
    }); */}

{/*    companies.map(async c => {
      c.whatsapps.map(async w => {

        if (w.status === "CONNECTED") {

          var companyId = c.id;

          const moveQueue = w.timeSendQueue ? w.timeSendQueue : 0;
          const moveQueueId = w.sendIdQueue;
          const moveQueueTime = moveQueue;
          const idQueue = moveQueueId;
          const timeQueue = moveQueueTime;

          if (moveQueue > 0) {

            if (!isNaN(idQueue) && Number.isInteger(idQueue) && !isNaN(timeQueue) && Number.isInteger(timeQueue)) {

              const tempoPassado = moment().subtract(timeQueue, "minutes").utc().format();
              // const tempoAgora = moment().utc().format();

              const { count, rows: tickets } = await Ticket.findAndCountAll({
                where: {
                  status: "pending",
                  queueId: null,
                  companyId: companyId,
                  whatsappId: w.id,
                  updatedAt: {
                    [Op.lt]: tempoPassado
                  }
                },
                include: [
                  {
                    model: Contact,
                    as: "contact",
                    attributes: ["id", "name", "number", "email", "profilePicUrl"],
                    include: ["extraInfo"]
                  }
                ]
              });

              if (count > 0) {
                tickets.map(async ticket => {
                  await ticket.update({
                    queueId: idQueue
                  });

                  await ticket.reload();

                  const io = getIO();
                  io.to(ticket.status)
                    .to("notification")
                    .to(ticket.id.toString())
                    .emit(`company-${companyId}-ticket`, {
                      action: "update",
                      ticket,
                      ticketId: ticket.id
                    });

                  // io.to("pending").emit(`company-${companyId}-ticket`, {
                  //   action: "update",
                  //   ticket,
                  // });

                  logger.info(`Atendimento Perdido: ${ticket.id} - Empresa: ${companyId}`);
                });
              } else {
                logger.info(`Nenhum atendimento perdido encontrado - Empresa: ${companyId}`);
              }
            } else {
              logger.info(`Condição não respeitada - Empresa: ${companyId}`);
            }
          }
        }
      });
    });
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("SearchForQueue -> VerifyQueue: error", e.message);
    throw e;
  }
}; */}

async function handleCloseTicketsAutomatic() {
  const job = new CronJob('*/1 * * * *', async () => {
    try {
      const companies = await Company.findAll();
      let hasActivity = false;
      
      for (const c of companies) {
        try {
          const companyId = c.id;
          await ClosedAllOpenTickets(companyId);
          hasActivity = true;
        } catch (e: any) {
          Sentry.captureException(e);
          logger.error(`[AutoClose] Error en empresa ${c.id}:`, e.message);
        }
      }
      
      // Solo log si hay actividad (en desarrollo)
      if (hasActivity && process.env.NODE_ENV === 'development') {
        logger.debug(`[AutoClose] Verificación de tickets automáticos completada`);
      }
    } catch (e: any) {
      Sentry.captureException(e);
      logger.error("[AutoClose] Error general:", e.message);
    }
  });
  job.start()
}

async function handleVerifySchedules(job) {
  try {
    const now = moment();
    const { count, rows: schedules } = await Schedule.findAndCountAll({
      where: {
        status: "PENDENTE",
        sentAt: null,
        sendAt: {
          [Op.lte]: now.format("YYYY-MM-DD HH:mm:ss") // Buscar agendamientos que YA DEBERÍAN haberse ejecutado
        }
      },
      include: [{ model: Contact, as: "contact" }]
    });
    
    if (count > 0) {
      logger.info(`[Schedules] Encontrados ${count} mensajes programados para enviar`);
      
      for (const schedule of schedules) {
        try {
          // Obtener zona horaria de la empresa
          const timezone = await GetTimezone(schedule.companyId);
          
          // Convertir hora actual a la zona horaria de la empresa para comparación
          const nowInCompanyTimezone = moment().tz(timezone);
          const scheduledTimeInCompanyTimezone = moment(schedule.sendAt).tz(timezone);
          
          // Verificar si realmente es hora de enviar
          if (scheduledTimeInCompanyTimezone.isAfter(nowInCompanyTimezone)) {
            logger.info(`[Schedules] Agendamiento ${schedule.id} aún no es hora de enviar`);
            continue;
          }
          
          await schedule.update({
            status: "AGENDADA"
          });
          
          // Calcular delay basado en la zona horaria correcta
          const delay = Math.max(0, nowInCompanyTimezone.diff(scheduledTimeInCompanyTimezone, 'milliseconds'));
          
          sendScheduledMessages.add(
            "SendMessage",
            { schedule },
            { delay: delay + 1000 } // Agregar 1 segundo para asegurar que se ejecute
          );
          
          logger.info(`[Schedules] Programado: ${schedule.contact.name} - Hora programada: ${scheduledTimeInCompanyTimezone.format('YYYY-MM-DD HH:mm:ss')} - Delay: ${delay}ms`);
        } catch (error) {
          logger.error(`[Schedules] Error al procesar agendamiento ${schedule.id}:`, error.message);
        }
      }
    }
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("SendScheduledMessage -> Verify: error", e.message);
    throw e;
  }
}

async function handleSendScheduledMessage(job) {
  const {
    data: { schedule }
  } = job;
  let scheduleRecord: Schedule | null = null;
  let logPrefix = "[Schedules]"; // Definir logPrefix al inicio

  try {
    scheduleRecord = await Schedule.findByPk(schedule.id);
    
    if (!scheduleRecord) {
      logger.error(`[Schedules] Agendamiento ${schedule.id} no encontrado`);
      return;
    }
    
    // Verificar que el agendamiento aún esté pendiente
    if (scheduleRecord.status !== "AGENDADA") {
      logger.warn(`[Schedules] Agendamiento ${schedule.id} ya no está en estado AGENDADA (actual: ${scheduleRecord.status})`);
      return;
    }
    
  } catch (e) {
    Sentry.captureException(e);
    logger.error(`[Schedules] Error al consultar programación: ${schedule.id}`, e.message);
    return;
  }

  try {
    const whatsapp = await GetDefaultWhatsApp(schedule.companyId);
    
    if (!whatsapp) {
      throw new Error(`No se encontró WhatsApp configurado para la empresa ${schedule.companyId}`);
    }

    let filePath = null;
    if (schedule.mediaPath) {
      filePath = path.resolve("public", schedule.mediaPath);
    }

    // Determinar el tipo de mensaje a enviar
    let messageBody = schedule.body;

    if (scheduleRecord.isReminderSystem) {
      // Importar función de formateo si es necesario
      let formatStartMessage = null;
      if (scheduleRecord.reminderType === 'start') {
        const reminderService = require("../services/ScheduleServices/ReminderSystemService");
        formatStartMessage = reminderService.formatStartMessage;
      }

      switch (scheduleRecord.reminderType) {
        case 'reminder':
          logPrefix = "[ReminderSystem] Recordatorio 10min antes";
          break;
        case 'start':
          logPrefix = "[ReminderSystem] Mensaje de inicio";
          // Si es el mensaje de inicio, usar el formato especial
          if (formatStartMessage) {
            messageBody = formatStartMessage(scheduleRecord.contact, scheduleRecord.body);
          }
          break;
        default:
          logPrefix = "[Schedules]";
      }
    }

    logger.info(`${logPrefix} Enviando mensaje programado a ${schedule.contact.name} (${schedule.contact.number})`);
    
                      const sentMessage = await SendMessage(whatsapp, {
                    number: schedule.contact.number,
                    body: formatBody(messageBody, schedule.contact),
                    mediaPath: filePath
                  });

                  // Guardar mensaje en la base de datos
                  if (sentMessage) {
                    const messageId = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    await Message.create({
                      id: messageId,
                      body: formatBody(messageBody, schedule.contact),
                      fromMe: true,
                      read: true,
                      mediaUrl: filePath,
                      mediaType: schedule.mediaName ? path.extname(schedule.mediaName).substring(1) : null,
                      contactId: schedule.contactId,
                      companyId: schedule.companyId,
                      ticketId: 42, // Usar ticket existente
                      ack: 1,
                      reactions: []
                    });

                    // Actualizar lastMessage del ticket
                    const ticket = await Ticket.findOne({
                      where: { contactId: schedule.contactId, companyId: schedule.companyId },
                      order: [["createdAt", "DESC"]]
                    });

                    if (ticket) {
                      await ticket.update({ lastMessage: formatBody(messageBody, schedule.contact) });
                    }
                  }

                  await scheduleRecord.update({
                    sentAt: moment().format("YYYY-MM-DD HH:mm:ss"),
                    status: "ENVIADO",
                    reminderStatus: "sent"
                  });

    logger.info(`${logPrefix} ✅ Mensaje enviado exitosamente: ${schedule.contact.name} - ${moment().format('YYYY-MM-DD HH:mm:ss')}`);
    
  } catch (e: any) {
    Sentry.captureException(e);
    await scheduleRecord.update({
      status: "ERRO",
      reminderStatus: "error"
    });
    logger.error(`${logPrefix} ❌ Error enviando mensaje programado: ${schedule.contact.name}`, e.message);
    throw e;
  }
}

async function handleVerifyCampaigns(job) {
  try {
    // Buscar campañas programadas para la próxima hora Y campañas que ya pasaron la hora
    const campaigns: { id: number; scheduledAt: string; companyId: number }[] =
      await sequelize.query(
        `SELECT id, scheduledAt, companyId FROM Campaigns c
         WHERE status = 'PROGRAMADA' 
         AND (
           scheduledAt BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 1 HOUR)
           OR scheduledAt < NOW()
         )`,
        { type: QueryTypes.SELECT }
      );
    
    if (campaigns.length > 0) {
      logger.info(`[Campaigns] Encontradas ${campaigns.length} campañas para procesar`);
      
      // Mostrar detalles de cada campaña encontrada
      campaigns.forEach((campaign, index) => {
        logger.info(`[Campaigns] Campaña ${index + 1}: ID=${campaign.id}, Programada=${campaign.scheduledAt}`);
      });
      
      for (let campaign of campaigns) {
        try {
          // Verificar si ya hay un job en proceso para esta campaña
          const existingJobs = await campaignQueue.getJobs(['waiting', 'delayed', 'active']);
          const hasExistingJob = existingJobs.some(job => 
            job.name === "ProcessCampaign" && job.data.id === campaign.id
          );
          
          if (hasExistingJob) {
            logger.warn(`[Campaigns] Campaña ${campaign.id} ya está siendo procesada, saltando...`);
            continue;
          }
          
          // Obtener zona horaria dinámica
          const timezone = await GetTimezone(campaign.companyId);
          const now = moment().tz(timezone);
          const scheduledAt = moment(campaign.scheduledAt).tz(timezone);
          const delay = Math.max(0, scheduledAt.diff(now, "milliseconds")); // No permitir delays negativos
          
          if (scheduledAt.isBefore(now)) {
            logger.info(`[Campaigns] Procesando campaña atrasada ${campaign.id} - Programada para: ${scheduledAt.format('YYYY-MM-DD HH:mm:ss')} (${now.diff(scheduledAt, 'hours', true).toFixed(1)} horas atrás)`);
          } else {
            logger.info(`[Campaigns] Procesando campaña ${campaign.id} - Programada para: ${scheduledAt.format('YYYY-MM-DD HH:mm:ss')} - Delay: ${delay}ms`);
          }
          
          campaignQueue.add(
            "ProcessCampaign",
            {
              id: campaign.id,
              delay
            },
            {
              removeOnComplete: true
            }
          );
        } catch (err: any) {
          Sentry.captureException(err);
          logger.error(`[Campaigns] Error al procesar campaña ${campaign.id}:`, err.message);
        }
      }
    }
  } catch (err: any) {
    Sentry.captureException(err);
    logger.error(`[Campaigns] Error en handleVerifyCampaigns:`, err.message);
    logger.error(`[Campaigns] Stack trace:`, err.stack);
  }
}

async function getCampaign(id) {
  return await Campaign.findByPk(id, {
    include: [
      {
        model: ContactList,
        as: "contactList",
        attributes: ["id", "name"],
        include: [
          {
            model: ContactListItem,
            as: "contacts",
            attributes: ["id", "name", "number", "email", "isWhatsappValid"],
            where: { isWhatsappValid: true }
          }
        ]
      },
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: ["id", "name"]
      },
      {
        model: CampaignShipping,
        as: "shipping",
        include: [{ model: ContactListItem, as: "contact" }]
      }
    ]
  });
}

async function getContact(id) {
  return await ContactListItem.findByPk(id, {
    attributes: ["id", "name", "number", "email"]
  });
}

async function getSettings(campaign) {
  const settings = await CampaignSetting.findAll({
    where: { companyId: campaign.companyId },
    attributes: ["key", "value"]
  });

  let messageInterval: number = 20;
  let longerIntervalAfter: number = 20;
  let greaterInterval: number = 60;
  let variables: any[] = [];

  settings.forEach(setting => {
    if (setting.key === "messageInterval") {
      messageInterval = JSON.parse(setting.value);
    }
    if (setting.key === "longerIntervalAfter") {
      longerIntervalAfter = JSON.parse(setting.value);
    }
    if (setting.key === "greaterInterval") {
      greaterInterval = JSON.parse(setting.value);
    }
    if (setting.key === "variables") {
      variables = JSON.parse(setting.value);
    }
  });

  return {
    messageInterval,
    longerIntervalAfter,
    greaterInterval,
    variables
  };
}

export function parseToMilliseconds(seconds) {
  return seconds * 1000;
}

async function sleep(seconds) {
  // Solo log en desarrollo para evitar spam
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`[Sleep] Iniciado: ${seconds}s - ${moment().format("HH:mm:ss")}`);
  }
  return new Promise(resolve => {
    setTimeout(() => {
      // Solo log en desarrollo para evitar spam
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`[Sleep] Finalizado: ${seconds}s - ${moment().format("HH:mm:ss")}`);
      }
      resolve(true);
    }, parseToMilliseconds(seconds));
  });
}

function getCampaignValidMessages(campaign) {
  const messages = [];

  if (!isEmpty(campaign.message1) && !isNil(campaign.message1)) {
    messages.push(campaign.message1);
  }

  if (!isEmpty(campaign.message2) && !isNil(campaign.message2)) {
    messages.push(campaign.message2);
  }

  if (!isEmpty(campaign.message3) && !isNil(campaign.message3)) {
    messages.push(campaign.message3);
  }

  if (!isEmpty(campaign.message4) && !isNil(campaign.message4)) {
    messages.push(campaign.message4);
  }

  if (!isEmpty(campaign.message5) && !isNil(campaign.message5)) {
    messages.push(campaign.message5);
  }

  return messages;
}

function getCampaignValidConfirmationMessages(campaign) {
  const messages = [];

  if (
    !isEmpty(campaign.confirmationMessage1) &&
    !isNil(campaign.confirmationMessage1)
  ) {
    messages.push(campaign.confirmationMessage1);
  }

  if (
    !isEmpty(campaign.confirmationMessage2) &&
    !isNil(campaign.confirmationMessage2)
  ) {
    messages.push(campaign.confirmationMessage2);
  }

  if (
    !isEmpty(campaign.confirmationMessage3) &&
    !isNil(campaign.confirmationMessage3)
  ) {
    messages.push(campaign.confirmationMessage3);
  }

  if (
    !isEmpty(campaign.confirmationMessage4) &&
    !isNil(campaign.confirmationMessage4)
  ) {
    messages.push(campaign.confirmationMessage4);
  }

  if (
    !isEmpty(campaign.confirmationMessage5) &&
    !isNil(campaign.confirmationMessage5)
  ) {
    messages.push(campaign.confirmationMessage5);
  }

  return messages;
}

function getProcessedMessage(msg: string, variables: any[], contact: any) {
  let finalMessage = msg;

  // Procesar variables de Mustache ({{variable}})
  if (finalMessage.includes("{{firstName}}")) {
    const firstName = contact.name ? contact.name.split(' ')[0] : '';
    finalMessage = finalMessage.replace(/\{\{firstName\}\}/g, firstName);
  }

  if (finalMessage.includes("{{name}}")) {
    finalMessage = finalMessage.replace(/\{\{name\}\}/g, contact.name || '');
  }

  if (finalMessage.includes("{{ms}}")) {
    const now = new Date();
    const hour = now.getHours();
    let greeting = '';
    
    if (hour >= 6 && hour < 12) {
      greeting = 'Buenos días';
    } else if (hour >= 12 && hour < 18) {
      greeting = 'Buenas tardes';
    } else if (hour >= 18 && hour < 23) {
      greeting = 'Buenas noches';
    } else {
      greeting = 'Buenas noches';
    }
    
    finalMessage = finalMessage.replace(/\{\{ms\}\}/g, greeting);
  }

  if (finalMessage.includes("{{protocol}}")) {
    const now = new Date();
    const protocol = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0');
    finalMessage = finalMessage.replace(/\{\{protocol\}\}/g, protocol);
  }

  if (finalMessage.includes("{{hora}}")) {
    const now = new Date();
    const hora = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    finalMessage = finalMessage.replace(/\{\{hora\}\}/g, hora);
  }

  // Procesar variables legacy ({variable})
  if (finalMessage.includes("{nome}")) {
    finalMessage = finalMessage.replace(/{nome}/g, contact.name || '');
  }

  if (finalMessage.includes("{email}")) {
    finalMessage = finalMessage.replace(/{email}/g, contact.email || '');
  }

  if (finalMessage.includes("{numero}")) {
    finalMessage = finalMessage.replace(/{numero}/g, contact.number || '');
  }

  // Procesar variables adicionales del sistema
  variables.forEach(variable => {
    if (finalMessage.includes(`{${variable.key}}`)) {
      const regex = new RegExp(`{${variable.key}}`, "g");
      finalMessage = finalMessage.replace(regex, variable.value);
    }
  });

  return finalMessage;
}

export function randomValue(min, max) {
  return Math.floor(Math.random() * max) + min;
}

async function verifyAndFinalizeCampaign(campaign) {
  const { contacts } = campaign.contactList;

  const count1 = contacts.length;
  const count2 = await CampaignShipping.count({
    where: {
      campaignId: campaign.id,
      deliveredAt: {
        [Op.not]: null
      }
    }
  });

  if (count1 === count2) {
    await campaign.update({ status: "FINALIZADA", completedAt: moment() });
  }

  const io = getIO();
  io.to(`company-${campaign.companyId}-mainchannel`).emit(`company-${campaign.companyId}-campaign`, {
    action: "update",
    record: campaign
  });
}

function calculateDelay(index, baseDelay, longerIntervalAfter, greaterInterval, messageInterval) {
  const now = new Date();
  const scheduledTime = new Date(baseDelay);
  const diffSeconds = differenceInSeconds(scheduledTime, now);
  
  // Calcular el delay total
  let totalDelay = diffSeconds * 1000; // Convertir a milisegundos
  
  // Agregar el intervalo correspondiente
  if (index > longerIntervalAfter) {
    totalDelay += greaterInterval;
  } else {
    totalDelay += messageInterval * 1000; // Convertir a milisegundos
  }
  
  // Asegurar que el delay no sea negativo
  return Math.max(totalDelay, 0);
}

async function handleProcessCampaign(job) {
  try {
    const { id }: ProcessCampaignData = job.data;
    logger.info(`[Campaign] Iniciando procesamiento de campaña ID: ${id}`);
    
    const campaign = await getCampaign(id);
    if (!campaign) {
      logger.error(`[Campaign] Campaña ${id} no encontrada`);
      return;
    }
    
    const settings = await getSettings(campaign);
    logger.info(`[Campaign] Configuración de campaña ${id}:`, {
      messageInterval: settings.messageInterval,
      longerIntervalAfter: settings.longerIntervalAfter,
      greaterInterval: settings.greaterInterval,
      variablesCount: settings.variables.length
    });
    
    const { contacts } = campaign.contactList;
    if (!isArray(contacts) || contacts.length === 0) {
      logger.warn(`[Campaign] Campaña ${id} no tiene contactos válidos`);
      await campaign.update({ status: "FINALIZADA" });
      return;
    }
    
    logger.info(`[Campaign] Procesando ${contacts.length} contactos para campaña ${id}`);
    
    const contactData = contacts.map(contact => ({
      contactId: contact.id,
      campaignId: campaign.id,
      variables: settings.variables,
    }));

    const longerIntervalAfter = settings.longerIntervalAfter; // En segundos
    const greaterInterval = settings.greaterInterval; // En segundos
    const messageInterval = settings.messageInterval; // En segundos

    const queuePromises = [];
    for (let i = 0; i < contactData.length; i++) {
      // Calcular el tiempo base para este contacto
      const baseDelay = addSeconds(campaign.scheduledAt, i * messageInterval);

      const { contactId, campaignId, variables } = contactData[i];
      const delay = calculateDelay(i, baseDelay, longerIntervalAfter, greaterInterval, messageInterval);
      
      logger.info(`[Campaign] Programando contacto ${contacts[i].name} (${contacts[i].number}) para campaña ${campaignId} con delay: ${delay}ms`);
      
      const queuePromise = campaignQueue.add(
        "PrepareContact",
        { contactId, campaignId, variables, delay },
        { removeOnComplete: true }
      );
      queuePromises.push(queuePromise);
    }
    
    await Promise.all(queuePromises);
    await campaign.update({ status: "EM_ANDAMENTO" });
    
    logger.info(`[Campaign] Campaña ${id} procesada exitosamente. Estado actualizado a EM_ANDAMENTO`);
  } catch (err: any) {
    Sentry.captureException(err);
    logger.error(`[Campaign] Error procesando campaña ${job.data.id}:`, err.message);
  }
}

// Variable para controlar el índice de mensajes por campaña
const campaignMessageIndexes = new Map();
async function handlePrepareContact(job) {
  try {
    const { contactId, campaignId, delay, variables }: PrepareContactData =
      job.data;
    
    logger.info(`[Prepare] Iniciando preparación de contacto: Contacto=${contactId}, Campaña=${campaignId}, Delay=${delay}ms`);
    
    const campaign = await getCampaign(campaignId);
    if (!campaign) {
      logger.error(`[Prepare] Campaña ${campaignId} no encontrada`);
      return;
    }
    
    const contact = await getContact(contactId);
    if (!contact) {
      logger.error(`[Prepare] Contacto ${contactId} no encontrado`);
      return;
    }

    logger.info(`[Prepare] Procesando contacto: ${contact.name} (${contact.number})`);

    const campaignShipping: any = {};
    campaignShipping.number = contact.number;
    campaignShipping.contactId = contactId;
    campaignShipping.campaignId = campaignId;

    const messages = getCampaignValidMessages(campaign);
    logger.info(`[Prepare] Mensajes válidos encontrados: ${messages.length}`);
    
    if (messages.length) {
      // Obtener el índice de mensaje para esta campaña específica
      let messageIndex = campaignMessageIndexes.get(campaignId) || 0;
      const message = getProcessedMessage(
        messages[messageIndex],
        variables,
        contact
      );
      campaignShipping.message = `\u200c ${message}`;
      logger.info(`[Prepare] Mensaje preparado: ${message.substring(0, 50)}...`);
      
      // Incrementar el índice para el siguiente contacto de esta campaña
      messageIndex = (messageIndex + 1) % messages.length;
      campaignMessageIndexes.set(campaignId, messageIndex);
    } else {
      logger.warn(`[Prepare] No hay mensajes válidos para la campaña ${campaignId}`);
    }

    if (campaign.confirmation) {
      const confirmationMessages =
        getCampaignValidConfirmationMessages(campaign);
      if (confirmationMessages.length) {
        const radomIndex = randomValue(0, confirmationMessages.length);
        const message = getProcessedMessage(
          confirmationMessages[radomIndex],
          variables,
          contact
        );
        campaignShipping.confirmationMessage = `\u200c ${message}`;
        logger.info(`[Prepare] Mensaje de confirmación preparado`);
      }
    }

    // Verificar si ya existe un registro para este contacto en esta campaña
    const existingRecord = await CampaignShipping.findOne({
      where: {
        campaignId: campaignShipping.campaignId,
        contactId: campaignShipping.contactId
      }
    });

    let record, created;
    if (existingRecord) {
      record = existingRecord;
      created = false;
      logger.info(`[Prepare] Registro existente encontrado: ID=${record.id}`);
      
      // Si el registro ya existe y ya fue entregado, no procesar
      if (record.deliveredAt !== null && record.deliveredAt !== undefined) {
        logger.info(`[Prepare] Registro ya entregado, saltando procesamiento - deliveredAt: ${record.deliveredAt}`);
        return;
      }
    } else {
      record = await CampaignShipping.create(campaignShipping);
      created = true;
      logger.info(`[Prepare] Nuevo registro creado: ID=${record.id}`);
    }

    logger.info(`[Prepare] Registro de envío ${created ? 'creado' : 'actualizado'}: ID=${record.id}`);
    logger.info(`[Prepare] Estado del registro - deliveredAt: ${record.deliveredAt}, jobId: ${record.jobId}`);
    logger.info(`[Prepare] Tipo de deliveredAt: ${typeof record.deliveredAt}`);
    logger.info(`[Prepare] deliveredAt === null: ${record.deliveredAt === null}`);
    logger.info(`[Prepare] deliveredAt === undefined: ${record.deliveredAt === undefined}`);

    if (
      !created &&
      record.deliveredAt === null &&
      record.confirmationRequestedAt === null
    ) {
      record.set(campaignShipping);
      await record.save();
      logger.info(`[Prepare] Registro actualizado`);
    }

    // Siempre programar el envío si el registro no tiene deliveredAt
    const isDelivered = record.deliveredAt !== null && record.deliveredAt !== undefined;
    
    logger.info(`[Prepare] Verificación de envío:`);
    logger.info(`[Prepare] - record.deliveredAt: ${record.deliveredAt}`);
    logger.info(`[Prepare] - typeof record.deliveredAt: ${typeof record.deliveredAt}`);
    logger.info(`[Prepare] - record.deliveredAt === null: ${record.deliveredAt === null}`);
    logger.info(`[Prepare] - record.deliveredAt === undefined: ${record.deliveredAt === undefined}`);
    logger.info(`[Prepare] - isDelivered: ${isDelivered}`);
    
    if (!isDelivered) {
      logger.info(`[Prepare] Programando envío con delay: ${delay}ms`);
      
      const nextJob = await campaignQueue.add(
        "DispatchCampaign",
        {
          campaignId: campaign.id,
          campaignShippingId: record.id,
          contactListItemId: contactId
        },
        {
          delay
        }
      );

      await record.update({ jobId: nextJob.id });
      logger.info(`[Prepare] Job de envío programado: ${nextJob.id}`);
    } else {
      logger.info(`[Prepare] Registro ya entregado, saltando envío - deliveredAt: ${record.deliveredAt}`);
    }

    await verifyAndFinalizeCampaign(campaign);
    logger.info(`[Prepare] Preparación completada para contacto ${contact.name}`);
  } catch (err: any) {
    Sentry.captureException(err);
    logger.error(`[Prepare] Error preparando contacto ${job.data.contactId}:`, err.message);
    logger.error(`[Prepare] Stack trace:`, err.stack);
  }
}

async function handleDispatchCampaign(job) {
  try {
    const { data } = job;
    const { campaignShippingId, campaignId }: DispatchCampaignData = data;
    
    logger.info(`[Dispatch] Iniciando envío de campaña: Campaña=${campaignId}, Envío=${campaignShippingId}`);
    
    const campaign = await getCampaign(campaignId);
    if (!campaign) {
      logger.error(`[Dispatch] Campaña ${campaignId} no encontrada`);
      return;
    }
    
    logger.info(`[Dispatch] Campaña encontrada: ${campaign.name}, WhatsApp ID: ${campaign.whatsappId}`);
    
    // Si no hay WhatsApp específico para la campaña, usar el WhatsApp por defecto de la empresa
    let whatsapp = campaign.whatsapp;
    if (!whatsapp) {
      logger.info(`[Dispatch] No hay WhatsApp específico para la campaña, buscando WhatsApp por defecto de la empresa`);
      const defaultWhatsapp = await Whatsapp.findOne({
        where: { companyId: campaign.companyId, isDefault: true }
      });
      if (defaultWhatsapp) {
        whatsapp = defaultWhatsapp;
        logger.info(`[Dispatch] WhatsApp por defecto encontrado: ${whatsapp.name}`);
      } else {
        logger.error(`[Dispatch] No se encontró WhatsApp por defecto para la empresa ${campaign.companyId}`);
        return;
      }
    }
    
    const wbot = await GetWhatsappWbot(whatsapp);
    if (!wbot) {
      logger.error(`[Dispatch] WhatsApp no encontrado para campaña ${campaignId}`);
      return;
    }

    logger.info(`[Dispatch] WhatsApp encontrado: ${whatsapp.name}, Estado: ${whatsapp.status}`);

    if (!wbot?.user?.id) {
      logger.error(`[Dispatch] Usuario de WhatsApp no autenticado para campaña ${campaignId}`);
      return;
    }

    logger.info(`[Dispatch] Usuario de WhatsApp autenticado: ${wbot.user.id}`);

    const campaignShipping = await CampaignShipping.findByPk(
      campaignShippingId,
      {
        include: [{ model: ContactListItem, as: "contact" }]
      }
    );
    
    if (!campaignShipping) {
      logger.error(`[Dispatch] Envío ${campaignShippingId} no encontrado`);
      return;
    }

    logger.info(`[Dispatch] Envío encontrado: ID=${campaignShipping.id}, Contacto=${campaignShipping.contact.name}, Número=${campaignShipping.number}`);

    const chatId = `${campaignShipping.number}@s.whatsapp.net`;
    logger.info(`[Dispatch] Chat ID: ${chatId}`);
    logger.info(`[Dispatch] Enviando mensaje a: ${campaignShipping.contact.name} (${campaignShipping.number})`);

    let body = campaignShipping.message;
    logger.info(`[Dispatch] Mensaje a enviar: ${body}`);

    if (campaign.confirmation && campaignShipping.confirmation === null) {
      body = campaignShipping.confirmationMessage;
      logger.info(`[Dispatch] Enviando mensaje de confirmación`);
    }

    // Enviar archivos si existen
    if (!isNil(campaign.fileListId)) {
      try {
        logger.info(`[Dispatch] Enviando archivos adjuntos`);
        const publicFolder = path.resolve(__dirname, "..", "public");
        const files = await ShowFileService(campaign.fileListId, campaign.companyId)
        const folder = path.resolve(publicFolder, "fileList", String(files.id))
        for (const [index, file] of files.options.entries()) {
          const options = await getMessageOptions(file.path, path.resolve(folder, file.path), file.name);
          await wbot.sendMessage(chatId, { ...options });
          logger.info(`[Dispatch] Archivo enviado: ${file.name}`);
        };
      } catch (error) {
        logger.error(`[Dispatch] Error enviando archivos:`, error);
      }
    }

    // Enviar media si existe
    if (campaign.mediaPath) {
      try {
        logger.info(`[Dispatch] Enviando media: ${campaign.mediaName}`);
        const publicFolder = path.resolve(__dirname, "..", "public");
        const filePath = path.join(publicFolder, campaign.mediaPath);

        const options = await getMessageOptions(campaign.mediaName, filePath, body);
        if (Object.keys(options).length) {
          await wbot.sendMessage(chatId, { ...options });
        }
      } catch (error) {
        logger.error(`[Dispatch] Error enviando media:`, error);
      }
    } else {
      // Enviar mensaje de texto
      try {
        logger.info(`[Dispatch] Intentando enviar mensaje de texto...`);
        if (campaign.confirmation && campaignShipping.confirmation === null) {
          logger.info(`[Dispatch] Enviando mensaje de confirmación...`);
          await wbot.sendMessage(chatId, {
            text: body
          });
          await campaignShipping.update({ confirmationRequestedAt: moment() });
          logger.info(`[Dispatch] Mensaje de confirmación enviado exitosamente`);
        } else {
          logger.info(`[Dispatch] Enviando mensaje de texto normal...`);
          await wbot.sendMessage(chatId, {
            text: body
          });
          logger.info(`[Dispatch] Mensaje de texto enviado exitosamente`);
        }
      } catch (error) {
        logger.error(`[Dispatch] Error enviando mensaje de texto:`, error);
        logger.error(`[Dispatch] Stack trace:`, error.stack);
        throw error;
      }
    }
    
    logger.info(`[Dispatch] Actualizando deliveredAt...`);
    await campaignShipping.update({ deliveredAt: moment() });
    logger.info(`[Dispatch] Mensaje entregado exitosamente`);

    await verifyAndFinalizeCampaign(campaign);

    const io = getIO();
    io.to(`company-${campaign.companyId}-mainchannel`).emit(`company-${campaign.companyId}-campaign`, {
      action: "update",
      record: campaign
    });

    logger.info(`[Dispatch] Campaña ${campaignId} enviada exitosamente a ${campaignShipping.contact.name}`);
  } catch (err: any) {
    Sentry.captureException(err);
    logger.error(`[Dispatch] Error enviando campaña ${job.data.campaignId}:`, err.message);
    console.log(err.stack);
  }
}

async function handleLoginStatus(job) {
  const users: { id: number }[] = await sequelize.query(
    `SELECT id FROM Users WHERE updatedAt < DATE_SUB(NOW(), INTERVAL 5 MINUTE) AND online = true`,
    { type: QueryTypes.SELECT }
  );
  for (let item of users) {
    try {
      const user = await User.findByPk(item.id);
      await user.update({ online: false });
      logger.info(`Usuário passado para offline: ${item.id}`);
    } catch (e: any) {
      Sentry.captureException(e);
    }
  }
}


async function handleInvoiceCreate() {
  logger.info("Iniciando geração de boletos");
  const job = new CronJob('*/5 * * * * *', async () => {


    const companies = await Company.findAll();
    companies.map(async c => {
      var dueDate = c.dueDate;
      const date = moment(dueDate).format();
      const timestamp = moment().format();
      const hoje = moment(moment()).format("DD/MM/yyyy");
      var vencimento = moment(dueDate).format("DD/MM/yyyy");

      var diff = moment(vencimento, "DD/MM/yyyy").diff(moment(hoje, "DD/MM/yyyy"));
      var dias = moment.duration(diff).asDays();

      if (dias < 20) {
        const plan = await Plan.findByPk(c.planId);

        const sql = `SELECT COUNT(*) mycount FROM "Invoices" WHERE "companyId" = ${c.id} AND "dueDate"::text LIKE '${moment(dueDate).format("yyyy-MM-DD")}%';`
        const invoice = await sequelize.query(sql,
          { type: QueryTypes.SELECT }
        );
        if (invoice[0]['mycount'] > 0) {

        } else {
          const sql = `INSERT INTO "Invoices" (detail, status, value, "updatedAt", "createdAt", "dueDate", "companyId")
          VALUES ('${plan.name}', 'open', '${plan.value}', '${timestamp}', '${timestamp}', '${date}', ${c.id});`

          const invoiceInsert = await sequelize.query(sql,
            { type: QueryTypes.INSERT }
          );

          /*           let transporter = nodemailer.createTransport({
                      service: 'gmail',
                      auth: {
                        user: 'email@gmail.com',
                        pass: 'senha'
                      }
                    });
 
                    const mailOptions = {
                      from: 'heenriquega@gmail.com', // sender address
                      to: `${c.email}`, // receiver (use array of string for a list)
                      subject: 'Fatura gerada - Sistema', // Subject line
                      html: `Olá ${c.name} esté é um email sobre sua fatura!<br>
          <br>
          Vencimento: ${vencimento}<br>
          Valor: ${plan.value}<br>
          Link: ${process.env.FRONTEND_URL}/financeiro<br>
          <br>
          Qualquer duvida estamos a disposição!
                      `// plain text body
                    };
 
                    transporter.sendMail(mailOptions, (err, info) => {
                      if (err)
                        console.log(err)
                      else
                        console.log(info);
                    }); */

        }





      }

    });
  });
  job.start()
}

handleCloseTicketsAutomatic()

handleInvoiceCreate()

export async function startQueueProcess() {
  logger.info("Iniciando processamento de filas");

  messageQueue.process("SendMessage", handleSendMessage);

  scheduleMonitor.process("Verify", handleVerifySchedules);

  sendScheduledMessages.process("SendMessage", handleSendScheduledMessage);

  campaignQueue.process("VerifyCampaigns", handleVerifyCampaigns);

  campaignQueue.process("ProcessCampaign", handleProcessCampaign);

  campaignQueue.process("PrepareContact", handlePrepareContact);

  campaignQueue.process("DispatchCampaign", handleDispatchCampaign);

  userMonitor.process("VerifyLoginStatus", handleLoginStatus);

  //queueMonitor.process("VerifyQueueStatus", handleVerifyQueue);



  scheduleMonitor.add(
    "Verify",
    {},
    {
      repeat: { cron: "*/5 * * * * *", key: "verify" },
      removeOnComplete: true
    }
  );

  campaignQueue.add(
    "VerifyCampaigns",
    {},
    {
      repeat: { cron: "*/20 * * * * *", key: "verify-campaing" },
      removeOnComplete: true
    }
  );

  userMonitor.add(
    "VerifyLoginStatus",
    {},
    {
      repeat: { cron: "* * * * *", key: "verify-login" },
      removeOnComplete: true
    }
  );

  queueMonitor.add(
    "VerifyQueueStatus",
    {},
    {
      repeat: { cron: "*/20 * * * * *" },
      removeOnComplete: true
    }
  );
}
