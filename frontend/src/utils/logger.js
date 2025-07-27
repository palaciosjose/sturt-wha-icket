// Sistema de logging configurable
// Permite activar/desactivar logs según el entorno

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Configuración por defecto
const DEFAULT_CONFIG = {
  level: LOG_LEVELS.DEBUG, // Siempre debug para desarrollo
  enableConsole: true, // Siempre habilitado en desarrollo
  enableServiceWorker: false,
  enableSocket: false,
  enableWhatsApp: false,
  enableTransferModal: false,
  enableDashboard: false
};

// Configuración desde localStorage (permite cambiar en tiempo real)
const getConfig = () => {
  try {
    const savedConfig = localStorage.getItem('loggerConfig');
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig);
      return { ...DEFAULT_CONFIG, ...parsedConfig };
    }
    return DEFAULT_CONFIG;
  } catch (error) {
    return DEFAULT_CONFIG;
  }
};

// Función principal de logging
const log = (level, category, message, ...args) => {
  const config = getConfig();
  
  // Verificar si el nivel está habilitado
  if (level > config.level) return;
  
  // Verificar si la categoría está habilitada
  const categoryEnabled = config[`enable${category}`] !== undefined ? config[`enable${category}`] : true;
  if (!categoryEnabled) return;
  
  // Verificar si console está habilitado
  if (!config.enableConsole) return;
  
  // Generar el mensaje con timestamp
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = `[${timestamp}] [${category}]`;
  
  // Usar el método de console apropiado
  switch (level) {
    case LOG_LEVELS.ERROR:
      console.error(prefix, message, ...args);
      break;
    case LOG_LEVELS.WARN:
      console.warn(prefix, message, ...args);
      break;
    case LOG_LEVELS.INFO:
      console.info(prefix, message, ...args);
      break;
    case LOG_LEVELS.DEBUG:
      console.log(prefix, message, ...args);
      break;
    default:
      console.log(prefix, message, ...args);
  }
};

// Funciones específicas por categoría
export const logger = {
  // Logs generales
  error: (message, ...args) => log(LOG_LEVELS.ERROR, 'General', message, ...args),
  warn: (message, ...args) => log(LOG_LEVELS.WARN, 'General', message, ...args),
  info: (message, ...args) => log(LOG_LEVELS.INFO, 'General', message, ...args),
  debug: (message, ...args) => log(LOG_LEVELS.DEBUG, 'General', message, ...args),
  
  // Logs de Service Worker
  sw: {
    error: (message, ...args) => log(LOG_LEVELS.ERROR, 'ServiceWorker', message, ...args),
    warn: (message, ...args) => log(LOG_LEVELS.WARN, 'ServiceWorker', message, ...args),
    info: (message, ...args) => log(LOG_LEVELS.INFO, 'ServiceWorker', message, ...args),
    debug: (message, ...args) => log(LOG_LEVELS.DEBUG, 'ServiceWorker', message, ...args),
  },
  
  // Logs de Socket
  socket: {
    error: (message, ...args) => log(LOG_LEVELS.ERROR, 'Socket', message, ...args),
    warn: (message, ...args) => log(LOG_LEVELS.WARN, 'Socket', message, ...args),
    info: (message, ...args) => log(LOG_LEVELS.INFO, 'Socket', message, ...args),
    debug: (message, ...args) => log(LOG_LEVELS.DEBUG, 'Socket', message, ...args),
  },
  
  // Logs de WhatsApp
  whatsapp: {
    error: (message, ...args) => log(LOG_LEVELS.ERROR, 'WhatsApp', message, ...args),
    warn: (message, ...args) => log(LOG_LEVELS.WARN, 'WhatsApp', message, ...args),
    info: (message, ...args) => log(LOG_LEVELS.INFO, 'WhatsApp', message, ...args),
    debug: (message, ...args) => log(LOG_LEVELS.DEBUG, 'WhatsApp', message, ...args),
  },
  
  // Logs de TransferModal
  transferModal: {
    error: (message, ...args) => log(LOG_LEVELS.ERROR, 'TransferModal', message, ...args),
    warn: (message, ...args) => log(LOG_LEVELS.WARN, 'TransferModal', message, ...args),
    info: (message, ...args) => log(LOG_LEVELS.INFO, 'TransferModal', message, ...args),
    debug: (message, ...args) => log(LOG_LEVELS.DEBUG, 'TransferModal', message, ...args),
  },
  
  // Logs de Dashboard
  dashboard: {
    error: (message, ...args) => log(LOG_LEVELS.ERROR, 'Dashboard', message, ...args),
    warn: (message, ...args) => log(LOG_LEVELS.WARN, 'Dashboard', message, ...args),
    info: (message, ...args) => log(LOG_LEVELS.INFO, 'Dashboard', message, ...args),
    debug: (message, ...args) => log(LOG_LEVELS.DEBUG, 'Dashboard', message, ...args),
  },
  
  // Configuración
  config: {
    get: getConfig,
    set: (newConfig) => {
      try {
        const currentConfig = getConfig();
        const updatedConfig = { ...currentConfig, ...newConfig };
        localStorage.setItem('loggerConfig', JSON.stringify(updatedConfig));
        
        // Actualizar control de logs nativos
        if (!updatedConfig.enableConsole) {
          setupNativeLogControl();
        }
        
        return true;
      } catch (error) {
        console.error('Error saving logger config:', error);
        return false;
      }
    },
    reset: () => {
      try {
        localStorage.removeItem('loggerConfig');
        return true;
      } catch (error) {
        console.error('Error resetting logger config:', error);
        return false;
      }
    }
  }
};

// Sistema de control de logs nativos
const setupNativeLogControl = () => {
  const config = getConfig();
  
  if (!config.enableConsole) {
    // Deshabilitar logs nativos cuando el sistema está deshabilitado
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    const originalConsoleInfo = console.info;
    
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};
    console.info = () => {};
    
    // Restaurar después de un tiempo para no romper el sistema
    setTimeout(() => {
      console.log = originalConsoleLog;
      console.warn = originalConsoleWarn;
      console.error = originalConsoleError;
      console.info = originalConsoleInfo;
    }, 100);
  }
};

// Log de prueba al cargar el logger
const currentConfig = getConfig();
console.log("🔧 DEBUG: Configuración del logger cargada:", currentConfig);
console.log("🔧 DEBUG: enableConsole =", currentConfig.enableConsole);
console.log("🔧 DEBUG: level =", currentConfig.level);

// Logs de prueba directos para verificar funcionamiento
if (currentConfig.enableConsole) {
  console.log("✅ LOGS HABILITADOS - Sistema funcionando");
  logger.debug("🚀 Sistema de logging inicializado");
  logger.debug("📋 Configuración actual:", currentConfig);
  logger.sw.debug("🧪 LOG DE PRUEBA - Service Worker inicializado");
  logger.socket.debug("🧪 LOG DE PRUEBA - Socket inicializado");
  logger.whatsapp.debug("🧪 LOG DE PRUEBA - WhatsApp inicializado");
  logger.transferModal.debug("🧪 LOG DE PRUEBA - Transfer Modal inicializado");
  logger.dashboard.debug("🧪 LOG DE PRUEBA - Dashboard inicializado");
} else {
  console.log("❌ LOGS DESHABILITADOS - Revisar configuración");
  setupNativeLogControl();
}

export default logger; 