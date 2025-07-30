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

          if (new Date() > dataLimite) {
            logger.info(`[Transfer] Transferencia por tiempo - Ticket ${ticket.id} → Departamento ${wpp.transferQueueId}`);
            
            await performTransfer(ticket, wpp.transferQueueId, "tiempo", io);
            continue;
          }
        }

        // ✅ TRANSFERENCIA INTELIGENTE: Si el WhatsApp tiene departamentos configurados
        if (wpp.queues && wpp.queues.length > 0) {
          const defaultQueueId = wpp.queues[0].id;
          
          logger.info(`[Transfer] Asignación automática - Ticket ${ticket.id} → Departamento ${defaultQueueId}`);
          
          await performTransfer(ticket, defaultQueueId, "automática", io);
        }

      } catch (error) {
        logger.error(`[Transfer] Error procesando ticket ${ticket.id}:`, error);
      }
    }

    // ✅ TRANSFERENCIAS ENTRE DEPARTAMENTOS ESPECÍFICOS
    await handleInterDepartmentTransfers();

  } catch (error) {
    logger.error("[Transfer] Error en proceso de transferencias:", error);
  }
};

// ✅ FUNCIÓN MEJORADA: Realizar transferencia con notificaciones
const performTransfer = async (ticket: Ticket, newQueueId: number, reason: string, io: any) => {
  try {
    // ✅ OBTENER DEPARTAMENTO DESTINO
    const targetQueue = await Queue.findByPk(newQueueId);
    if (!targetQueue) {
      logger.error(`[Transfer] Departamento ${newQueueId} no encontrado`);
      return;
    }

    // ✅ ACTUALIZAR TICKET
    await ticket.update({
      queueId: newQueueId,
      status: "pending"
    });

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

    // ✅ NOTIFICAR TRANSFERENCIA
    const currentTicket = await ShowTicketService(ticket.id, ticket.companyId);

    io.to(ticket.status)
      .to("notification")
      .to(ticket.id.toString())
      .emit(`company-${ticket.companyId}-ticket`, {
        action: "update",
        ticket: currentTicket,
        traking: `Transferencia ${reason} a ${targetQueue.name}`
      });

    logger.info(`✅ [Transfer] Ticket ${ticket.id} transferido a ${targetQueue.name} (${reason})`);

  } catch (error) {
    logger.error(`[Transfer] Error en transferencia del ticket ${ticket.id}:`, error);
  }
};

// ✅ NUEVA FUNCIÓN: Transferencias entre departamentos específicos
const handleInterDepartmentTransfers = async () => {
  try {
    // ✅ BUSCAR TICKETS EN DEPARTAMENTOS ESPECÍFICOS QUE NECESITAN TRANSFERENCIA
    const ticketsForTransfer = await Ticket.findAll({
      where: {
        status: "pending",
        queueId: {
          [Op.not]: null
        },
        userId: {
          [Op.is]: null
        }
      },
      include: [
        {
          model: Queue,
          as: "queue"
        }
      ]
    });

    for (const ticket of ticketsForTransfer) {
      try {
        const currentQueue = ticket.queue;

        if (!currentQueue) {
          continue;
        }

        // ✅ OBTENER WHATSAPP Y SUS DEPARTAMENTOS
        const wpp = await Whatsapp.findByPk(ticket.whatsappId, {
          include: [
            {
              model: Queue,
              as: "queues"
            }
          ]
        });

        if (!wpp || !wpp.queues || wpp.queues.length === 0) {
          continue;
        }

        // ✅ LÓGICA DE TRANSFERENCIA ENTRE DEPARTAMENTOS
        // Ejemplo: Si está en SOPORTE y no hay agentes disponibles, transferir a VENTAS
        if (currentQueue.name.includes("SOPORTE") && wpp.queues.length > 1) {
          const ventasQueue = wpp.queues.find(q => q.name.includes("VENTAS"));
          
          if (ventasQueue && shouldTransferToVentas(ticket)) {
            logger.info(`[Transfer] Transferencia SOPORTE → VENTAS - Ticket ${ticket.id}`);
            await performTransfer(ticket, ventasQueue.id, "SOPORTE→VENTAS", getIO());
          }
        }

        // ✅ LÓGICA DE TRANSFERENCIA VENTAS → SOPORTE
        if (currentQueue.name.includes("VENTAS") && wpp.queues.length > 1) {
          const soporteQueue = wpp.queues.find(q => q.name.includes("SOPORTE"));
          
          if (soporteQueue && shouldTransferToSoporte(ticket)) {
            logger.info(`[Transfer] Transferencia VENTAS → SOPORTE - Ticket ${ticket.id}`);
            await performTransfer(ticket, soporteQueue.id, "VENTAS→SOPORTE", getIO());
          }
        }

      } catch (error) {
        logger.error(`[Transfer] Error en transferencia inter-departamental ticket ${ticket.id}:`, error);
      }
    }

  } catch (error) {
    logger.error("[Transfer] Error en transferencias inter-departamentales:", error);
  }
};

// ✅ FUNCIONES DE LÓGICA DE TRANSFERENCIA
const shouldTransferToVentas = (ticket: Ticket): boolean => {
  // ✅ LÓGICA: Transferir a VENTAS si:
  // - El mensaje contiene palabras clave de ventas
  // - Ha pasado mucho tiempo sin respuesta
  // - El usuario pregunta por precios/productos
  
  const messageBody = ticket.lastMessage?.toLowerCase() || "";
  const salesKeywords = ["precio", "costo", "comprar", "venta", "producto", "servicio", "oferta", "descuento"];
  
  const hasSalesKeywords = salesKeywords.some(keyword => messageBody.includes(keyword));
  
  if (hasSalesKeywords) {
    logger.info(`[Transfer] Ticket ${ticket.id} contiene palabras clave de ventas`);
    return true;
  }

  // ✅ TRANSFERENCIA POR TIEMPO SIN RESPUESTA
  const timeSinceLastMessage = new Date().getTime() - new Date(ticket.updatedAt).getTime();
  const minutesWithoutResponse = timeSinceLastMessage / (1000 * 60);
  
  if (minutesWithoutResponse > 30) { // 30 minutos sin respuesta
    logger.info(`[Transfer] Ticket ${ticket.id} sin respuesta por ${Math.round(minutesWithoutResponse)} minutos`);
    return true;
  }

  return false;
};

const shouldTransferToSoporte = (ticket: Ticket): boolean => {
  // ✅ LÓGICA: Transferir a SOPORTE si:
  // - El mensaje contiene palabras clave de soporte técnico
  // - Problemas técnicos mencionados
  // - Solicitudes de ayuda técnica
  
  const messageBody = ticket.lastMessage?.toLowerCase() || "";
  const supportKeywords = ["error", "problema", "no funciona", "ayuda", "soporte", "técnico", "falla", "bug"];
  
  const hasSupportKeywords = supportKeywords.some(keyword => messageBody.includes(keyword));
  
  if (hasSupportKeywords) {
    logger.info(`[Transfer] Ticket ${ticket.id} contiene palabras clave de soporte`);
    return true;
  }

  return false;
};
