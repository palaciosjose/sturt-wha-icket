import { Server as SocketIO } from "socket.io";
import { Server } from "http";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";
import User from "../models/User";
import Queue from "../models/Queue";
import Ticket from "../models/Ticket";
import { verify } from "jsonwebtoken";
import authConfig from "../config/auth";
import { CounterManager } from "./counter";

let io: SocketIO;

export const initIO = (httpServer: Server): SocketIO => {
  io = new SocketIO(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL
    },
    // ✅ CONFIGURACIÓN MEJORADA PARA CONEXIÓN ESTABLE
    pingTimeout: 60000, // 60 segundos para producción
    pingInterval: 25000, // 25 segundos para producción
    upgradeTimeout: 10000, // 10 segundos
    allowEIO3: true, // Compatibilidad con versiones anteriores
    transports: ['websocket', 'polling'], // Fallback a polling
    maxHttpBufferSize: 1e8, // 100MB para archivos grandes
    allowRequest: (req, callback) => {
      // ✅ VERIFICACIÓN ADICIONAL DE SEGURIDAD
      const origin = req.headers.origin;
      if (origin && origin !== process.env.FRONTEND_URL) {
        return callback('Origin not allowed', false);
      }
      callback(null, true);
    }
  });

  io.on("connection", async socket => {
    logger.info("Client Connected");
    const { token } = socket.handshake.query;
    let tokenData = null;
    try {
      tokenData = verify(token as string, authConfig.secret);
      logger.debug(tokenData, "io-onConnection: tokenData");
    } catch (error) {
      logger.warn(`[libs/socket.ts] Error decoding token: ${error?.message}`);
      socket.disconnect();
      return io;
    }
    const counters = new CounterManager();

    let user: User = null;
    let userId = tokenData.id;

    if (userId && userId !== "undefined" && userId !== "null") {
      user = await User.findByPk(userId, { include: [ Queue ] });
      if (user) {
        user.online = true;
        await user.save();
      } else {
        logger.info(`onConnect: User ${userId} not found`);
        socket.disconnect();
        return io;
      }
    } else {
      logger.info("onConnect: Missing userId");
      socket.disconnect();
      return io;
    }

    socket.join(`company-${user.companyId}-mainchannel`);
    socket.join(`user-${user.id}`);

    // ✅ HEARTBEAT PARA MANTENER CONEXIÓN ACTIVA
    let heartbeatInterval: NodeJS.Timeout;
    
    // Función para enviar heartbeat
    const sendHeartbeat = () => {
      if (socket.connected) {
        socket.emit("heartbeat");
        logger.debug(`💓 Heartbeat enviado a usuario ${user.id}`);
      }
    };
    
    // Iniciar heartbeat cada 30 segundos
    heartbeatInterval = setInterval(sendHeartbeat, 30000);
    
    // Listener para ping del cliente
    socket.on("ping", () => {
      socket.emit("pong");
      logger.debug(`🏓 Pong enviado a usuario ${user.id}`);
    });
    
    // Listener para heartbeat del cliente
    socket.on("heartbeat", () => {
      logger.debug(`💓 Heartbeat recibido de usuario ${user.id}`);
    });

    socket.on("joinChatBox", async (ticketId: string) => {
      if (!ticketId || ticketId === "undefined") {
        return;
      }
      Ticket.findByPk(ticketId).then(
        (ticket) => {
          if (ticket && ticket.companyId === user.companyId
            && (ticket.userId === user.id || user.profile === "admin")) {
            let c: number;
            if ((c = counters.incrementCounter(`ticket-${ticketId}`)) === 1) {
              socket.join(ticketId);
            }
            logger.info(`💬 Chat iniciado - Ticket: ${ticketId}, Usuario: ${user.id}`)
          } else {
            logger.info(`Invalid attempt to join channel of ticket ${ticketId} by user ${user.id}`)
          }
        },
        (error) => {
          logger.error(error, `Error fetching ticket ${ticketId}`);
        }
      );
    });
    
    socket.on("leaveChatBox", async (ticketId: string) => {
      if (!ticketId || ticketId === "undefined") {
        return;
      }

      let c: number;
      // o último que sair apaga a luz

      if ((c = counters.decrementCounter(`ticket-${ticketId}`)) === 0) {
        socket.leave(ticketId);
      }
      logger.info(`💬 Chat finalizado - Ticket: ${ticketId}, Usuario: ${user.id}`)
    });

    socket.on("joinNotification", async () => {
      let c: number;
      if ((c = counters.incrementCounter("notification")) === 1) {
        if (user.profile === "admin") {
          socket.join(`company-${user.companyId}-notification`);
        } else {
          user.queues.forEach((queue) => {
            logger.debug(`User ${user.id} of company ${user.companyId} joined queue ${queue.id} channel.`);
            socket.join(`queue-${queue.id}-notification`);
          });
          if (user.allTicket === "enabled") {
            socket.join("queue-null-notification");
          }

        }
      }
      logger.debug(`joinNotification[${c}]: User: ${user.id}`);
    });
    
    socket.on("leaveNotification", async () => {
      let c: number;
      if ((c = counters.decrementCounter("notification")) === 0) {
        if (user.profile === "admin") {
          socket.leave(`company-${user.companyId}-notification`);
        } else {
          user.queues.forEach((queue) => {
            logger.debug(`User ${user.id} of company ${user.companyId} leaved queue ${queue.id} channel.`);
            socket.leave(`queue-${queue.id}-notification`);
          });
          if (user.allTicket === "enabled") {
            socket.leave("queue-null-notification");
          }
        }
      }
      logger.debug(`leaveNotification[${c}]: User: ${user.id}`);
    });
 
    socket.on("joinTickets", (status: string) => {
      if (counters.incrementCounter(`status-${status}`) === 1) {
        if (user.profile === "admin") {
          logger.debug(`Admin ${user.id} of company ${user.companyId} joined ${status} tickets channel.`);
          socket.join(`company-${user.companyId}-${status}`);
        } else if (status === "pending") {
          user.queues.forEach((queue) => {
            logger.debug(`User ${user.id} of company ${user.companyId} joined queue ${queue.id} pending tickets channel.`);
            socket.join(`queue-${queue.id}-pending`);
          });
          if (user.allTicket === "enabled") {
            socket.join("queue-null-pending");
          }
        } else {
          logger.debug(`User ${user.id} cannot subscribe to ${status}`);
        }
      }
    });
    
    socket.on("leaveTickets", (status: string) => {
      if (counters.decrementCounter(`status-${status}`) === 0) {
        if (user.profile === "admin") {
          logger.debug(`Admin ${user.id} of company ${user.companyId} leaved ${status} tickets channel.`);
          socket.leave(`company-${user.companyId}-${status}`);
        } else if (status === "pending") {
          user.queues.forEach((queue) => {
            logger.debug(`User ${user.id} of company ${user.companyId} leaved queue ${queue.id} pending tickets channel.`);
            socket.leave(`queue-${queue.id}-pending`);
          });
          if (user.allTicket === "enabled") {
            socket.leave("queue-null-pending");
          }
        }
      }
    });
    
    socket.emit("ready");
    
    // ✅ LIMPIAR HEARTBEAT AL DESCONECTAR
    socket.on("disconnect", (reason) => {
      logger.info(`🔌 Usuario ${user.id} desconectado: ${reason}`);
      
      // Limpiar heartbeat
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        logger.debug(`🧹 Heartbeat limpiado para usuario ${user.id}`);
      }
      
      // Marcar usuario como offline
      if (user) {
        user.online = false;
        user.save().catch(err => {
          logger.error(`Error marcando usuario ${user.id} como offline: ${err.message}`);
        });
      }
    });
  });
  return io;
};

export const getIO = (): SocketIO => {
  if (!io) {
    throw new AppError("Socket IO not initialized");
  }
  return io;
};
