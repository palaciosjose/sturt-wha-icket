/**
 * Utilidad para limpiar datos de autenticación
 * Se ejecuta automáticamente cuando se detectan errores de token
 */

export const clearAuthData = () => {
  try {
    // Limpiar todos los datos de autenticación
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("companyId");
    localStorage.removeItem("user");
    localStorage.removeItem("cshow");
    
    // Limpiar cookies relacionadas
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    console.log("🧹 Datos de autenticación limpiados automáticamente");
    
    // Redirigir al login
    window.location.href = "/login";
  } catch (error) {
    console.error("Error limpiando datos de autenticación:", error);
  }
};

/**
 * Verificar si el token es válido
 */
export const isTokenValid = (token) => {
  if (!token) return false;
  
  try {
    // Verificar si el token tiene el formato correcto (JWT)
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Verificar si no está expirado (timestamp básico)
    const payload = JSON.parse(atob(parts[1]));
    const currentTime = Date.now() / 1000;
    
    if (payload.exp && payload.exp < currentTime) {
      console.log("⏰ Token expirado automáticamente");
      return false;
    }
    
    return true;
  } catch (error) {
    console.log("❌ Token inválido detectado automáticamente");
    return false;
  }
};

/**
 * Verificar y limpiar automáticamente si es necesario
 */
export const validateAndCleanAuth = () => {
  const token = localStorage.getItem("token");
  
  // Verificar si estamos en una ruta que no requiere autenticación
  const publicRoutes = ['/login', '/forget-password', '/signup'];
  const currentPath = window.location.pathname;
  
  if (publicRoutes.includes(currentPath)) {
    return true; // Permitir acceso a rutas públicas
  }
  
  if (!token) {
    console.log("🔄 No hay token - redirigiendo al login");
    clearAuthData();
    return false;
  }
  
  if (!isTokenValid(token)) {
    console.log("🔄 Token inválido detectado - limpieza automática");
    clearAuthData();
    return false;
  }
  
  return true;
}; 