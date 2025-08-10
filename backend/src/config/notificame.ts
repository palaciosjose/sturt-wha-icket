export const notificameConfig = {
  // ✅ Configuración de la API
  api: {
    baseUrl: process.env.NOTIFICAME_API_URL || "https://api.notificame.com",
    timeout: parseInt(process.env.NOTIFICAME_API_TIMEOUT || "10000"),
    retryAttempts: parseInt(process.env.NOTIFICAME_RETRY_ATTEMPTS || "3"),
    retryDelay: parseInt(process.env.NOTIFICAME_RETRY_DELAY || "1000")
  },

  // ✅ Configuración de webhooks
  webhook: {
    enabled: process.env.NOTIFICAME_WEBHOOK_ENABLED === "true",
    secret: process.env.NOTIFICAME_WEBHOOK_SECRET || "",
    maxRetries: parseInt(process.env.NOTIFICAME_WEBHOOK_MAX_RETRIES || "5")
  },

  // ✅ Configuración de mensajes
  messages: {
    maxLength: parseInt(process.env.NOTIFICAME_MAX_MESSAGE_LENGTH || "1000"),
    defaultChannel: process.env.NOTIFICAME_DEFAULT_CHANNEL || "whatsapp",
    supportedChannels: ["whatsapp", "telegram", "facebook", "instagram", "sms"]
  },

  // ✅ Configuración de logs
  logging: {
    enabled: process.env.NOTIFICAME_LOGGING_ENABLED !== "false",
    level: process.env.NOTIFICAME_LOG_LEVEL || "info",
    includeApiCalls: process.env.NOTIFICAME_LOG_API_CALLS === "true"
  },

  // ✅ Configuración de seguridad
  security: {
    validateTokens: process.env.NOTIFICAME_VALIDATE_TOKENS !== "false",
    rateLimit: {
      enabled: process.env.NOTIFICAME_RATE_LIMIT_ENABLED === "true",
      maxRequests: parseInt(process.env.NOTIFICAME_RATE_LIMIT_MAX || "100"),
      windowMs: parseInt(process.env.NOTIFICAME_RATE_LIMIT_WINDOW || "900000") // 15 minutos
    }
  },

  // ✅ Configuración de base de datos
  database: {
    autoCleanup: process.env.NOTIFICAME_AUTO_CLEANUP === "true",
    cleanupInterval: parseInt(process.env.NOTIFICAME_CLEANUP_INTERVAL || "86400000"), // 24 horas
    maxMessageAge: parseInt(process.env.NOTIFICAME_MAX_MESSAGE_AGE || "2592000000") // 30 días
  }
};

// ✅ Validar configuración crítica
export const validateNotificaMeConfig = (): boolean => {
  const requiredEnvVars = [
    "NOTIFICAME_API_URL"
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`⚠️ [NotificaMe] Variables de entorno faltantes: ${missingVars.join(", ")}`);
    console.warn(`⚠️ [NotificaMe] Usando valores por defecto`);
  }

  return true;
};

// ✅ Obtener configuración para un canal específico
export const getChannelConfig = (channel: string) => {
  const channelConfigs = {
    whatsapp: {
      maxLength: 4096,
      supportsMedia: true,
      supportsReplies: true
    },
    telegram: {
      maxLength: 4096,
      supportsMedia: true,
      supportsReplies: true
    },
    facebook: {
      maxLength: 2000,
      supportsMedia: true,
      supportsReplies: false
    },
    instagram: {
      maxLength: 2000,
      supportsMedia: true,
      supportsReplies: false
    },
    sms: {
      maxLength: 160,
      supportsMedia: false,
      supportsReplies: false
    }
  };

  return channelConfigs[channel as keyof typeof channelConfigs] || channelConfigs.whatsapp;
};

// ✅ Configuración de desarrollo
export const isDevelopment = process.env.NODE_ENV === "development";
export const isProduction = process.env.NODE_ENV === "production";
export const isTest = process.env.NODE_ENV === "test";
