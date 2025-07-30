// Configuración de versión de la aplicación
export const APP_VERSION = "1.1.0";
export const VERSION_LABEL = "Versión";

// Configuración del nombre de la aplicación
export const APP_NAME = "Watoolx";
export const APP_SUBTITLE = "Saas";
export const APP_FULL_NAME = `${APP_NAME} ${APP_SUBTITLE}`;

// Función para obtener el texto completo de la versión
export const getVersionText = () => {
  return `${VERSION_LABEL} ${APP_VERSION}`;
};

// Función para obtener solo el número de versión
export const getVersionNumber = () => {
  return APP_VERSION;
};

// Función para obtener solo el label de versión
export const getVersionLabel = () => {
  return VERSION_LABEL;
};

// Función para obtener el nombre completo de la aplicación
export const getAppFullName = () => {
  return APP_FULL_NAME;
};

// Función para obtener solo el nombre de la aplicación
export const getAppName = () => {
  return APP_NAME;
};

// Función para obtener solo el subtítulo
export const getAppSubtitle = () => {
  return APP_SUBTITLE;
};