import pino from 'pino';
import moment from 'moment-timezone';

// Función para obtener el timestamp con zona horaria
const timezoned = () => {
  // Por defecto usar America/Lima, pero esto se puede hacer dinámico
  return moment().tz('America/Lima').format('DD-MM-YYYY HH:mm:ss');
};

// Configurar nivel de log basado en variables de entorno
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const logger = pino({
  level: logLevel,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      levelFirst: true,
      translateTime: 'SYS:dd-mm-yyyy HH:MM:ss',
      ignore: "pid,hostname",
      // Filtrar logs de Sequelize en producción
      messageFormat: process.env.NODE_ENV === 'production' ? 
        '{msg} {req.url} {req.method} {req.id} {res.statusCode}' : 
        '{msg}'
    },
  },
  timestamp: () => `,"time":"${timezoned()}"`,
  // Configurar filtros para reducir spam
  filters: {
    // Filtrar logs de consultas SQL en producción
    log: (object) => {
      if (process.env.NODE_ENV === 'production' && 
          object.msg && 
          (object.msg.includes('Executing') || object.msg.includes('SELECT'))) {
        return false;
      }
      return object;
    }
  }
});

export { logger };
