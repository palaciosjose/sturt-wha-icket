const webpack = require('webpack');
const dotenv = require('dotenv');
const path = require('path');

module.exports = function override(config, env) {
  // Cargar variables de entorno desde .env
  const envPath = path.resolve(__dirname, '.env');
  const envConfig = dotenv.config({ path: envPath });
  
  // Variables por defecto SOLO para desarrollo
  const defaultEnv = env === 'development' ? {
    REACT_APP_BACKEND_URL: 'http://localhost:8080',
    REACT_APP_HOURS_CLOSE_TICKETS_AUTO: '24',
    REACT_APP_NAME_SYSTEM: 'WATOOLX',
    PORT: '3000'
  } : {};
  
  // Combinar variables de entorno con valores por defecto
  const envVars = {
    ...defaultEnv,
    ...process.env,
    ...(envConfig.parsed || {})
  };
  
  config.plugins = (config.plugins || []).concat([
    new webpack.DefinePlugin({
      'process.env.REACT_APP_BACKEND_URL': JSON.stringify(envVars.REACT_APP_BACKEND_URL),
      'process.env.REACT_APP_HOURS_CLOSE_TICKETS_AUTO': JSON.stringify(envVars.REACT_APP_HOURS_CLOSE_TICKETS_AUTO),
      'process.env.REACT_APP_NAME_SYSTEM': JSON.stringify(envVars.REACT_APP_NAME_SYSTEM),
      'process.env.PORT': JSON.stringify(envVars.PORT)
    })
  ]);

  return config;
}; 