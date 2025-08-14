import { Op } from "sequelize";
import TicketTraking from "./models/TicketTraking";
import { format } from "date-fns";
import moment from "moment";
import Ticket from "./models/Ticket";
import Whatsapp from "./models/Whatsapp";
import Queue from "./models/Queue";
import { getIO } from "./libs/socket";
import { logger } from "./utils/logger";
import ShowTicketService from "./services/TicketServices/ShowTicketService";
import Prompt from "./models/Prompt";
import Contact from "./models/Contact";
import GetTicketWbot from "./helpers/GetTicketWbot";
import { verifyMessage } from "./services/WbotServices/wbotMessageListener";
import QueueOption from "./models/QueueOption";

// ✅ MEJORADO: Sistema de transferencias automáticas inteligente
export const TransferTicketQueue = async (): Promise<void> => {
  const io = getIO();

  try {
    // ✅ BUSCAR TICKETS PENDIENTES SIN DEPARTAMENTO
    const tickets = await Ticket.findAll({
      where: {
        status: "pending",
        queueId: {
          [Op.is]: null
        },
      },
      include: [
        {
          model: Whatsapp,
          as: "whatsapp",
          include: [
            {
              model: Queue,
              as: "queues"
            }
          ]
        }
      ]
    });

    logger.info(`[Transfer] Verificando ${tickets.length} tickets pendientes sin departamento`);

    // ✅ PROCESAR CADA TICKET
    for (const ticket of tickets) {
      try {
        // ✅ OBTENER WHATSAPP ASOCIADO
        const wpp = await Whatsapp.findByPk(ticket.whatsappId, {
          include: [
            {
              model: Queue,
              as: "queues"
            }
          ]
        });
        
        if (!wpp) {
          logger.warn(`[Transfer] Ticket ${ticket.id} sin WhatsApp asociado`);
          continue;
        }

        // ✅ TRANSFERENCIA POR TIEMPO (Sistema existente mejorado)
        if (wpp.timeToTransfer && wpp.transferQueueId && wpp.timeToTransfer > 0) {
          const dataLimite = new Date(ticket.updatedAt);
          dataLimite.setMinutes(dataLimite.getMinutes() + wpp.timeToTransfer);
          
          const ahora = new Date();
          const tiempoTranscurrido = Math.floor((ahora.getTime() - ticket.updatedAt.getTime()) / (1000 * 60)); // minutos
          
          logger.info(`[Transfer] Verificando transferencia por tiempo - Ticket ${ticket.id}:`);
          logger.info(`  - Última actualización: ${ticket.updatedAt.toLocaleTimeString()}`);
          logger.info(`  - Tiempo configurado: ${wpp.timeToTransfer} minutos`);
          logger.info(`  - Tiempo transcurrido: ${tiempoTranscurrido} minutos`);
          logger.info(`  - Límite: ${dataLimite.toLocaleTimeString()}`);
          logger.info(`  - Ahora: ${ahora.toLocaleTimeString()}`);

          if (tiempoTranscurrido >= wpp.timeToTransfer) {
            logger.info(`[Transfer] ✅ TRANSFERENCIA POR TIEMPO - Ticket ${ticket.id} → Departamento ${wpp.transferQueueId}`);
            logger.info(`  - Tiempo transcurrido: ${tiempoTranscurrido} minutos >= ${wpp.timeToTransfer} minutos`);
            
            await performTransfer(ticket, wpp.transferQueueId, "tiempo", io);
            continue;
          } else {
            logger.info(`[Transfer] ⏳ ESPERANDO - Ticket ${ticket.id} aún no cumple tiempo: ${tiempoTranscurrido}/${wpp.timeToTransfer} minutos`);
            logger.info(`[Transfer] 🚫 NO ejecutando asignación automática - Esperando transferencia por tiempo`);
            continue; // ✅ SALIR DEL BUCLE - NO ejecutar asignación automática
          }
        }

        // ✅ TRANSFERENCIA INTELIGENTE: Solo si NO hay transferencia por tiempo configurada
        if (wpp.queues && wpp.queues.length > 0) {
          logger.info(`[Transfer] 🔍 Verificando asignación automática para ticket ${ticket.id}`);
          logger.info(`[Transfer]   - Transferencia por tiempo configurada: ${wpp.timeToTransfer ? 'SÍ' : 'NO'}`);
          logger.info(`[Transfer]   - Departamento destino configurado: ${wpp.transferQueueId ? 'SÍ' : 'NO'}`);
          
          // ✅ SOLO asignar automáticamente si NO hay transferencia por tiempo
          if (!wpp.timeToTransfer || !wpp.transferQueueId) {
            const defaultQueueId = wpp.queues[0].id;
            
            logger.info(`[Transfer] ✅ Asignación automática - Ticket ${ticket.id} → Departamento ${defaultQueueId}`);
            
            await performTransfer(ticket, defaultQueueId, "automática", io);
          } else {
            logger.info(`[Transfer] 🚫 NO ejecutando asignación automática - Transferencia por tiempo configurada`);
          }
        }

      } catch (error) {
        logger.error(`[Transfer] Error procesando ticket ${ticket.id}:`, error);
      }
    }



  } catch (error) {
    logger.error("[Transfer] Error en proceso de transferencias:", error);
  }
};

// ✅ FUNCIÓN MEJORADA: Realizar transferencia con notificaciones y activación automática de chatbot
const performTransfer = async (ticket: Ticket, newQueueId: number, reason: string, io: any) => {
  try {
    // ✅ OBTENER DEPARTAMENTO DESTINO CON CONFIGURACIÓN COMPLETA
    const targetQueue = await Queue.findByPk(newQueueId, {
      include: [
        {
          model: Prompt,
          as: 'prompt'
        },
        {
          model: QueueOption,
          as: 'options'
        }
      ]
    });
    
    if (!targetQueue) {
      logger.error(`[Transfer] Departamento ${newQueueId} no encontrado`);
      return;
    }

    // ✅ VERIFICAR SI EL DEPARTAMENTO TIENE CHATBOT CONFIGURADO
    const hasChatbot = targetQueue.options && targetQueue.options.length > 0;
    const hasPrompt = targetQueue.promptId || (targetQueue.prompt && targetQueue.prompt.id);
    const hasGreeting = targetQueue.greetingMessage && targetQueue.greetingMessage.trim() !== "";

    logger.info(`[Transfer] 🔍 Configuración del departamento ${targetQueue.name}:`);
    logger.info(`  - Tiene opciones: ${hasChatbot ? 'SÍ' : 'NO'}`);
    logger.info(`  - Tiene prompt: ${hasPrompt ? 'SÍ' : 'NO'}`);
    logger.info(`  - Tiene mensaje de saludo: ${hasGreeting ? 'SÍ' : 'NO'}`);

    // ✅ DETERMINAR SI SE DEBE ACTIVAR CHATBOT
    let shouldActivateChatbot = false;
    let chatbotType = "ninguno";

    if (hasChatbot && hasGreeting) {
      shouldActivateChatbot = true;
      chatbotType = "opciones";
      logger.info(`[Transfer] 🤖 ACTIVANDO CHATBOT EXISTENTE CON OPCIONES para departamento ${targetQueue.name}`);
    } else if (hasPrompt) {
      shouldActivateChatbot = true;
      chatbotType = "IA";
      logger.info(`[Transfer] 🤖 ACTIVANDO CHATBOT EXISTENTE IA para departamento ${targetQueue.name}`);
    } else if (hasGreeting) {
      shouldActivateChatbot = true;
      chatbotType = "saludo";
      logger.info(`[Transfer] 🤖 ACTIVANDO CHATBOT EXISTENTE CON SALUDO para departamento ${targetQueue.name}`);
    }

    // ✅ ACTUALIZAR TICKET CON CONFIGURACIÓN DE CHATBOT
    const updateData: any = {
      queueId: newQueueId,
      status: "pending"
    };

    if (shouldActivateChatbot) {
      updateData.chatbot = true;
      updateData.promptId = hasPrompt ? (targetQueue.promptId || targetQueue.prompt?.id) : null;
      updateData.useIntegration = hasPrompt ? true : false;
      
      logger.info(`[Transfer] ✅ Ticket ${ticket.id} configurado con chatbot tipo: ${chatbotType}`);
      logger.info(`[Transfer] ℹ️ El chatbot existente del departamento ${targetQueue.name} se activará automáticamente`);
    }

    await ticket.update(updateData);

    // ✅ ENVIAR SALUDO + OPCIONES DEL DEPARTAMENTO (REUTILIZANDO CONFIGURACIÓN EXISTENTE)
    if (shouldActivateChatbot && hasGreeting) {
      try {
        const freshTicket = await Ticket.findByPk(ticket.id, {
          include: [{ model: Contact, as: "contact" }]
        });
        
        if (freshTicket?.contact?.number) {
          const wbot = await GetTicketWbot(freshTicket);
          
          if (hasChatbot && targetQueue.options && targetQueue.options.length > 0) {
            // ✅ ENVIAR SALUDO + OPCIONES
            let options = "";
            targetQueue.options.forEach((option, index) => {
              options += `*[ ${index + 1} ]* - ${option.title}\n`;
            });
            
            const body = `${targetQueue.greetingMessage}\n\n${options}`;
            const jid = `${freshTicket.contact.number}@${freshTicket.isGroup ? "g.us" : "s.whatsapp.net"}`;
            const sentMessage = await wbot.sendMessage(jid, { text: body });
            await verifyMessage(sentMessage, freshTicket, freshTicket.contact);
            
            logger.info(`[Transfer] ✅ Mensaje de saludo + opciones enviado a ticket ${freshTicket.id}`);
          } else {
            // ✅ ENVIAR SOLO SALUDO
            const body = `${targetQueue.greetingMessage}`;
            const jid = `${freshTicket.contact.number}@${freshTicket.isGroup ? "g.us" : "s.whatsapp.net"}`;
            const sentMessage = await wbot.sendMessage(jid, { text: body });
            await verifyMessage(sentMessage, freshTicket, freshTicket.contact);
            
            logger.info(`[Transfer] ✅ Mensaje de saludo enviado a ticket ${freshTicket.id}`);
          }
        }
      } catch (err) {
        logger.error(`[Transfer] Error enviando mensaje automático:`, err);
      }
    }

    // ✅ ACTUALIZAR TRACKING
    const ticketTraking = await TicketTraking.findOne({
      where: {
        ticketId: ticket.id
      },
      order: [["createdAt", "DESC"]]
    });

    if (ticketTraking) {
      await ticketTraking.update({
        queuedAt: moment().toDate(),
        queueId: newQueueId,
      });
    }

    // (El saludo ya fue enviado arriba cuando corresponde)

    // ✅ NOTIFICAR TRANSFERENCIA
    const currentTicket = await ShowTicketService(ticket.id, ticket.companyId);

    io.to(ticket.status)
      .to("notification")
      .to(ticket.id.toString())
      .emit(`company-${ticket.companyId}-ticket`, {
        action: "update",
        ticket: currentTicket,
        traking: `Transferencia ${reason} a ${targetQueue.name}${shouldActivateChatbot ? ` + Chatbot ${chatbotType} activado` : ''}`
      });

    logger.info(`✅ [Transfer] Ticket ${ticket.id} transferido a ${targetQueue.name} (${reason})`);
    if (shouldActivateChatbot) {
      logger.info(`🤖 [Transfer] Chatbot ${chatbotType} activado automáticamente`);
    }

  } catch (error) {
    logger.error(`[Transfer] Error en transferencia del ticket ${ticket.id}:`, error);
  }
};




