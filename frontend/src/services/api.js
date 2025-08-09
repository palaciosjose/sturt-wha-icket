import axios from "axios";
import { clearAuthData, validateAndCleanAuth } from "../utils/clearAuthData";

const api = axios.create({
	baseURL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080',
	withCredentials: true,
});

// ✅ INTERCEPTOR MEJORADO PARA MANEJO AUTOMÁTICO DE TOKENS
api.interceptors.request.use(
  (config) => {
    // Solo verificar token si NO es una ruta de autenticación
    if (!config.url.includes('/auth/') && !config.url.includes('/login')) {
      // Verificar token antes de cada request
      if (!validateAndCleanAuth()) {
        // Si el token es inválido, cancelar el request
        return Promise.reject(new Error("Token inválido - redirigiendo al login"));
      }
      // Adjuntar token al header Authorization si existe
      const token = localStorage.getItem("token");
      if (token) {
        config.headers = config.headers || {};
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.log("🔄 Error de autenticación detectado - limpieza automática");
      
      // ✅ LIMPIEZA AUTOMÁTICA COMPLETA
      clearAuthData();
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

export const openApi = axios.create({
	baseURL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080'
});

export default api;
