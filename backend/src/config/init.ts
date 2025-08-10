import { validateNotificaMeConfig } from "./notificame";
import { logger } from "../utils/logger";

// ✅ Inicializar todas las configuraciones
export const initializeConfigurations = (): void => {
  try {
    logger.info("🔧 Inicializando configuraciones del sistema...");

    // ✅ Validar configuración de NotificaMe
    validateNotificaMeConfig();

    // ✅ Log de configuración cargada
    logger.info("✅ Configuraciones inicializadas correctamente");

    // ✅ Log de variables críticas (solo en desarrollo)
    if (process.env.NODE_ENV === "development") {
      logger.info("🔍 Configuración de desarrollo activada");
      logger.debug(`📡 API URL: ${process.env.NOTIFICAME_API_URL || "Valor por defecto"}`);
      logger.debug(`🔐 Webhook habilitado: ${process.env.NOTIFICAME_WEBHOOK_ENABLED || "false"}`);
    }

  } catch (error) {
    logger.error(`❌ Error inicializando configuraciones: ${error}`);
    // No lanzar error para permitir que la aplicación continúe
  }
};

// ✅ Verificar configuración mínima requerida
export const checkMinimumConfig = (): boolean => {
  try {
    const requiredConfigs = [
      { name: "NotificaMe", check: () => validateNotificaMeConfig() }
    ];

    let allValid = true;

    for (const config of requiredConfigs) {
      try {
        config.check();
        logger.info(`✅ Configuración ${config.name} válida`);
      } catch (error) {
        logger.error(`❌ Configuración ${config.name} inválida: ${error}`);
        allValid = false;
      }
    }

    return allValid;
  } catch (error) {
    logger.error(`❌ Error verificando configuración mínima: ${error}`);
    return false;
  }
};
