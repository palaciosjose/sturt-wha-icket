import { createContext } from "react";
import { io } from "socket.io-client";
import { isExpired } from "../../utils/isExpired";

class ManagedSocket {
  constructor(socketManager) {
    this.socketManager = socketManager;
    this.socket = socketManager.currentSocket;
    this.pendingJoins = [];
    this.pendingEmits = [];
    this.registeredListeners = new Map(); // ✅ TRACKING DE LISTENERS REGISTRADOS
    
    const refreshJoinsOnReady = () => {
      // ✅ RE-REGISTRAR TODOS LOS LISTENERS DESPUÉS DE RECONEXIÓN
      this.registeredListeners.forEach((callback, event) => {
        this.socket.on(event, callback);
        console.debug(`🔄 Re-registrando listener: ${event}`);
      });
      
      this.pendingJoins.forEach(({ event, callback }) => {
        this.socket.on(event, callback);
        this.registeredListeners.set(event, callback); // ✅ GUARDAR PARA RE-REGISTRO
      });
      this.pendingEmits.forEach(({ event, params }) => {
        this.socket.emit(event, ...params);
      });
      this.pendingJoins = [];
      this.pendingEmits = [];
    };
    
    this.socket.on("ready", refreshJoinsOnReady);
    if (this.socketManager.socketReady) {
      refreshJoinsOnReady();
    }
  }

  on(event, callback) {
    // ✅ CONFIGURAR LISTENERS INMEDIATAMENTE, NO ESPERAR A SOCKET READY
    this.socket.on(event, callback);
    // ✅ GUARDAR PARA RE-REGISTRO DESPUÉS DE RECONEXIÓN
    this.registeredListeners.set(event, callback);
  }

  off(event, callback) {
    this.socket.off(event, callback);
    // ✅ REMOVER DEL TRACKING
    this.registeredListeners.delete(event);
  }

  emit(event, ...params) {
    // ✅ EMITIR INMEDIATAMENTE, NO ESPERAR A SOCKET READY
    this.socket.emit(event, ...params);
  }

  disconnect() {
    // ✅ SOLO LIMPIAR LISTENERS, NO DESCONECTAR EL SOCKET COMPARTIDO
    if (this.socket && typeof this.socket.off === 'function') {
      this.socket.removeAllListeners();
    }
  }
}

class DummySocket {
  on(..._) {}
  off(..._) {}
  emit(..._) {}
  disconnect() {}
}

const SocketManager = {
  currentCompanyId: -1,
  currentUserId: -1,
  currentSocket: null,
  socketReady: false,

  getSocket: function(companyId) {
    // ✅ MÉTODO PARA DESCONECTAR MANUALMENTE CUANDO SEA NECESARIO
    this.disconnectSocket = function() {
      if (this.currentSocket) {
        console.warn("Desconectando socket manualmente");
        this.currentSocket.disconnect();
        this.currentSocket = null;
        this.currentCompanyId = null;
        this.currentUserId = null;
      }
    };

    // ✅ MÉTODO PARA LIMPIAR LISTENERS SIN DESCONECTAR
    this.cleanupListeners = function() {
      if (this.currentSocket) {
        console.warn("Limpiando listeners del socket");
        this.currentSocket.removeAllListeners();
      }
    };
    let userId = null;
    if (localStorage.getItem("userId")) {
      userId = localStorage.getItem("userId");
    }

    if (!companyId && !this.currentSocket) {
      return new DummySocket();
    }

    if (companyId && typeof companyId !== "string") {
      companyId = `${companyId}`;
    }

    if (companyId !== this.currentCompanyId || userId !== this.currentUserId) {
      if (this.currentSocket) {
        console.warn("closing old socket - company or user changed");
        this.currentSocket.removeAllListeners();
        // ✅ NO DESCONECTAR AUTOMÁTICAMENTE - SOLO LIMPIAR LISTENERS
        // this.currentSocket.disconnect();
        this.currentSocket = null;
        this.currentCompanyId = null;
		    this.currentUserId = null;
      }

      let token = localStorage.getItem("token");
      if (!token) {
        console.warn("No token found, returning dummy socket");
        return new DummySocket();
      }
      
      if ( isExpired(token) ) {
        console.warn("Expired token, reload after refresh");
        setTimeout(() => {
          window.location.reload();
        },1000);
        return new DummySocket();
      }

      this.currentCompanyId = companyId;
      this.currentUserId = userId;
      
      // Configuración optimizada para producción
      const socketConfig = {
        transports: ["websocket", "polling"], // Fallback a polling si WebSocket falla
        pingTimeout: 60000, // 60 segundos para producción
        pingInterval: 25000, // 25 segundos para producción
        upgradeTimeout: 10000, // 10 segundos
        maxReconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: true,
        query: { token },
      };

      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      if (!backendUrl) {
        throw new Error('REACT_APP_BACKEND_URL no está configurado');
      }
      this.currentSocket = io(backendUrl, socketConfig);

      this.currentSocket.io.on("reconnect_attempt", () => {
        this.currentSocket.io.opts.query.r = 1;
        token = localStorage.getItem("token");
        if ( isExpired(token) ) {
          console.warn("Token expirado - redirigiendo al login");
          localStorage.removeItem("token");
          window.location.href = "/login";
        } else {
          console.warn("Reconectando socket...");
        }
      });
      
      this.currentSocket.on("disconnect", (reason) => {
        // Solo mostrar en desarrollo para evitar spam en producción
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined) {
          console.debug(`Socket desconectado: ${reason}`);
        }
        
        if (reason.startsWith("io server disconnect")) {
          console.warn("Socket desconectado por el servidor");
          token = localStorage.getItem("token");
          
          if ( isExpired(token) ) {
            console.warn("Token expirado - redirigiendo al login");
            localStorage.removeItem("token");
            window.location.href = "/login";
            return;
          }
          console.warn("Intentando reconectar socket...");
          return;
        }        
      });
      
      this.currentSocket.on("connect", (...params) => {
        console.debug("socket connected", params);
        // ✅ RE-REGISTRAR LISTENERS DESPUÉS DE RECONEXIÓN
        this.socketReady = false;
        this.onReady(() => {
          this.socketReady = true;
        });
      });

      this.currentSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
      });
      
      // ✅ LISTENERS PARA HEARTBEAT
      this.currentSocket.on("heartbeat", () => {
        console.debug("💓 Heartbeat recibido del servidor");
        // Responder al heartbeat
        this.currentSocket.emit("heartbeat");
      });
      
      this.currentSocket.on("pong", () => {
        console.debug("🏓 Pong recibido del servidor");
      });
      
      this.currentSocket.onAny((event, ...args) => {
        console.debug("Event: ", { socket: this.currentSocket, event, args });
      });
      
      this.onReady(() => {
        this.socketReady = true;
      });

    }
    
    return new ManagedSocket(this);
  },
  
  onReady: function( callbackReady ) {
    if (this.socketReady) {
      callbackReady();
      return
    }
    
    this.currentSocket.once("ready", () => {
      callbackReady();
    });
  },
  
  onConnect: function( callbackReady ) { this.onReady( callbackReady ) },

};

const SocketContext = createContext()

export { SocketContext, SocketManager };
