import gracefulShutdown from "http-graceful-shutdown";
import app from "./app";
import { initIO } from "./libs/socket";
import { logger } from "./utils/logger";
import { StartAllWhatsAppsSessions } from "./services/WbotServices/StartAllWhatsAppsSessions";
import Company from "./models/Company";
import { startQueueProcess } from "./queues";
import { TransferTicketQueue } from "./wbotTransferTicketQueue";
import cron from "node-cron";
import { diagnoseCampaignSystem } from "./utils/campaignDiagnostic";
import { initializeConfigurations } from "./config/init";

const server = app.listen(process.env.PORT, async () => {
  try {
    // ✅ Inicializar configuraciones del sistema
    initializeConfigurations();
    
    const companies = await Company.findAll();
    const sessionPromises = [];

    for (const c of companies) {
      sessionPromises.push(StartAllWhatsAppsSessions(c.id));
    }

    await Promise.all(sessionPromises);
    startQueueProcess();
    
    // Ejecutar diagnóstico del sistema de campañas
    setTimeout(async () => {
      await diagnoseCampaignSystem();
    }, 5000); // Esperar 5 segundos para que todo se inicialice
    
    logger.info(`Server started on port: ${process.env.PORT}`);
  } catch (error) {
    logger.error("Error starting server:", error);
    process.exit(1);
  }
});

process.on("uncaughtException", err => {
  logger.error(`${new Date().toUTCString()} uncaughtException:`, err.message);
  logger.error(err.stack);
  // Remove process.exit(1); to avoid abrupt shutdowns
});

process.on("unhandledRejection", (reason, p) => {
  logger.error(`${new Date().toUTCString()} unhandledRejection:`, reason);
  // Log the promise for debugging
  if (p) {
    logger.error("Promise details:", p);
  }
  // Don't exit the process, just log the error
  // This prevents the server from crashing due to unhandled promises
});

cron.schedule("* * * * *", async () => {
  try {
    // Solo log en desarrollo para evitar spam
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`[Transfer] Verificando transferencias de tickets`);
    }
    await TransferTicketQueue();
  } catch (error) {
    logger.error("Error in cron job:", error);
    // Asegurar que el error no se propague como unhandledRejection
    return Promise.resolve();
  }
});

initIO(server);

// Configure graceful shutdown to handle all outstanding promises
gracefulShutdown(server, {
  signals: "SIGINT SIGTERM",
  timeout: 30000, // 30 seconds
  onShutdown: async () => {
    logger.info("Gracefully shutting down...");
    // Add any other cleanup code here, if necessary
  },
  finally: () => {
    logger.info("Server shutdown complete.");
  }
});
