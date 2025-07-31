/**
 * Verifica si un token JWT ha expirado
 * @param {string} token - Token JWT a verificar
 * @returns {boolean} - true si el token ha expirado, false si es válido
 */
export const isExpired = (token) => {
  if (!token) {
    return true;
  }

  try {
    // Decodificar el token JWT (solo la parte del payload)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const payload = JSON.parse(jsonPayload);
    
    // Verificar si el token tiene exp (expiration time)
    if (!payload.exp) {
      return false; // Si no tiene exp, asumimos que no expira
    }
    
    // Comparar con el tiempo actual
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
    
  } catch (error) {
    console.error('Error al verificar token:', error);
    return true; // Si hay error al decodificar, asumimos que está expirado
  }
}; 