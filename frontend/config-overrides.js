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
  
  // Agregar variables de entorno al webpack
  config.plugins.push(
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(envVars)
    })
  );
  
  // Configurar Babel para excluir node_modules
  if (config.module && config.module.rules) {
    const babelRule = config.module.rules.find(rule => 
      rule.test && rule.test.toString().includes('js')
    );
    
    if (babelRule && babelRule.exclude) {
      // Asegurar que node_modules esté excluido
      if (!babelRule.exclude.toString().includes('node_modules')) {
        babelRule.exclude = /node_modules/;
      }
    } else if (babelRule) {
      babelRule.exclude = /node_modules/;
    }
  }
  
  return config;
}; 