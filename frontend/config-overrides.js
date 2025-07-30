const webpack = require('webpack');

module.exports = function override(config, env) {
  // Agregar plugin para process (solución más simple)
  config.plugins = (config.plugins || []).concat([
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(process.env)
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser'
    })
  ]);

  return config;
}; 