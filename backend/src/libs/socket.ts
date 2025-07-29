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
  // Configuración optimizada para producción
  const corsOrigins = process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, 'https://localhost:3000', 'http://localhost:3000'].filter(Boolean)
    : ['http://localhost:3000', 'https://localhost:3000', process.env.FRONTEND_URL].filter(Boolean);

  io = new SocketIO(httpServer, {
    cors: {
      origin: corsOrigins,
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"]
    },
    // Configuración optimizada para producción
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000, // 60 segundos para producción
    pingInterval: 25000, // 25 segundos para producción
    upgradeTimeout: 10000, // 10 segundos
    maxHttpBufferSize: 1e8, // 100MB
    allowRequest: (req, callback) => {
      // Log para debugging en producción
      logger.debug(`WebSocket connection attempt from: ${req.headers.origin}`);
      callback(null, true);
    }
  });

  io.on("connection", async socket => {
    logger.info(`Client Connected - ID: ${socket.id}`);
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
        logger.info(`User ${user.id} connected and marked as online`);
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

    // Emitir evento de ready para el frontend
    socket.emit("ready");

    socket.on("joinChatBox", async (ticketId: string) => {
      if (!ticketId || ticketId === "undefined") {
        return;
      }
      
      try {
        const ticket = await Ticket.findByPk(ticketId);
        if (ticket && ticket.companyId === user.companyId
          && (ticket.userId === user.id || user.profile === "admin")) {
          let c: number;
          if ((c = counters.incrementCounter(`ticket-${ticketId}`)) === 1) {
            socket.join(ticketId);
            logger.info(`💬 Chat iniciado - Ticket: ${ticketId}, Usuario: ${user.id}`);
          }
        } else {
          logger.info(`Invalid attempt to join channel of ticket ${ticketId} by user ${user.id}`);
        }
      } catch (error) {
        logger.error(`Error joining chat box for ticket ${ticketId}:`, error);
      }
    });
    
    socket.on("leaveChatBox", async (ticketId: string) => {
      if (!ticketId || ticketId === "undefined") {
        return;
      }

      let c: number;
      if ((c = counters.decrementCounter(`ticket-${ticketId}`)) === 0) {
        socket.leave(ticketId);
        logger.info(`💬 Chat finalizado - Ticket: ${ticketId}, Usuario: ${user.id}`);
      }
    });

    socket.on("joinNotification", async () => {
      let c: number;
      if ((c = counters.incrementCounter("notification")) === 1) {
        if (user.profile === "admin") {
          socket.join(`company-${user.companyId}-notification`);
        } else {
          user.queues.forEach((queue) => {
            socket.join(`queue-${queue.id}-notification`);
          });
        }
      }
    });

    socket.on("leaveNotification", async () => {
      let c: number;
      if ((c = counters.decrementCounter("notification")) === 0) {
        if (user.profile === "admin") {
          socket.leave(`company-${user.companyId}-notification`);
        } else {
          user.queues.forEach((queue) => {
            socket.leave(`queue-${queue.id}-notification`);
          });
        }
      }
    });

    socket.on("disconnect", async () => {
      logger.info(`Client Disconnected - ID: ${socket.id}, User: ${user?.id}`);
      if (user) {
        user.online = false;
        await user.save();
      }
    });

    socket.on("error", (error) => {
      logger.error(`Socket error for user ${user?.id}:`, error);
    });
  });

  // Log de eventos del servidor Socket.IO
  io.engine.on("connection_error", (err) => {
    logger.error("Socket.IO connection error:", err);
  });

  return io;
};

export const getIO = (): SocketIO => {
  if (!io) {
    throw new AppError("Socket.IO not initialized");
  }
  return io;
};
