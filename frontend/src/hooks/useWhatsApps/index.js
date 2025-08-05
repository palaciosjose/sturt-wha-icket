import { useState, useEffect, useReducer, useRef } from "react";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import logger from "../../utils/logger";

const reducer = (state, action) => {
  if (action.type === "LOAD_WHATSAPPS") {
    const whatsApps = action.payload;

    return [...whatsApps];
  }

  if (action.type === "ADD_WHATSAPPS") {
    const whatsApp = action.payload;
    return [whatsApp, ...state];
  }

  if (action.type === "UPDATE_WHATSAPPS") {
    const whatsApp = action.payload;
    const whatsAppIndex = state.findIndex((s) => s.id === whatsApp.id);

    if (whatsAppIndex !== -1) {
      state[whatsAppIndex] = whatsApp;
      return [...state];
    } else {
      return [whatsApp, ...state];
    }
  }

  if (action.type === "UPDATE_SESSION") {
    const whatsApp = action.payload;
    const whatsAppIndex = state.findIndex((s) => s.id === whatsApp.id);

    if (whatsAppIndex !== -1) {
      state[whatsAppIndex].status = whatsApp.status;
      state[whatsAppIndex].updatedAt = whatsApp.updatedAt;
      state[whatsAppIndex].qrcode = whatsApp.qrcode;
      state[whatsAppIndex].retries = whatsApp.retries;
      return [...state];
    } else {
      return [...state];
    }
  }

  if (action.type === "DELETE_WHATSAPPS") {
    const whatsAppId = action.payload;

    const whatsAppIndex = state.findIndex((s) => s.id === whatsAppId);
    if (whatsAppIndex !== -1) {
      state.splice(whatsAppIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const useWhatsApps = () => {
  const [whatsApps, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  // const socketManager = useContext(SocketContext); // ✅ TEMPORALMENTE COMENTADO

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ✅ FUNCIÓN PARA REFRESCAR DATOS
  const refreshWhatsApps = async () => {
    if (isMounted.current) {
      try {
        setLoading(true);
        logger.whatsapp.debug("🔄 REFRESCANDO DATOS DE WHATSAPP...");
        const { data } = await api.get("/whatsapp/?session=0");
        if (isMounted.current) {
          dispatch({ type: "REFRESH_WHATSAPPS", payload: data });
          logger.whatsapp.debug("✅ DATOS REFRESCADOS:", data.length, "conexiones");
        }
      } catch (err) {
        if (isMounted.current) {
          logger.whatsapp.error("❌ ERROR AL REFRESCAR:", err);
          toastError(err);
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    }
  };

  useEffect(() => {
    if (isMounted.current) {
      setLoading(true);
      const fetchSession = async () => {
        try {
          logger.whatsapp.debug("🔄 CARGANDO CONEXIONES...");
          const { data } = await api.get("/whatsapp/?session=0");
          if (isMounted.current) {
            dispatch({ type: "LOAD_WHATSAPPS", payload: data });
            logger.whatsapp.debug("✅ CONEXIONES CARGADAS:", data.length);
            setLoading(false);
          }
        } catch (err) {
          if (isMounted.current) {
            logger.whatsapp.error("❌ ERROR AL CARGAR CONEXIONES:", err);
            setLoading(false);
            toastError(err);
          }
        }
      };
      fetchSession();
    }
  }, []);

  // ✅ TEMPORALMENTE DESHABILITADO PARA PROBAR FORMULARIO
  /*
  useEffect(() => {
    if (isMounted.current) {
      const companyId = localStorage.getItem("companyId");
      const socket = socketManager.getSocket(companyId);

      console.log("🔌 CONFIGURANDO LISTENER WHATSAPP PARA COMPANY:", companyId);
      console.log("🔌 SOCKET CONECTADO:", socket.connected);

      socket.on(`company-${companyId}-whatsapp`, (data) => {
        if (isMounted.current) {
          console.log("📡 EVENTO WHATSAPP RECIBIDO:", data.action, data);
          logger.whatsapp.debug("📡 EVENTO WHATSAPP RECIBIDO:", data.action);
          
          if (data.action === "create") {
            logger.whatsapp.debug("➕ CREANDO NUEVA CONEXIÓN:", data.whatsapp.id);
            dispatch({ type: "ADD_WHATSAPPS", payload: data.whatsapp });
          }
          
          if (data.action === "update") {
            logger.whatsapp.debug("🔄 ACTUALIZANDO CONEXIÓN:", data.whatsapp.id);
            dispatch({ type: "UPDATE_WHATSAPPS", payload: data.whatsapp });
          }
          
          if (data.action === "delete") {
            logger.whatsapp.debug("🗑️ ELIMINANDO CONEXIÓN:", data.whatsappId);
            dispatch({ type: "DELETE_WHATSAPPS", payload: data.whatsappId });
          }
          
          // ✅ MANEJAR EVENTO DE REFRESCO
          if (data.action === "refresh") {
            logger.whatsapp.debug("🔄 EVENTO DE REFRESCO RECIBIDO");
            refreshWhatsApps();
          }
        }
      });

      socket.on(`company-${companyId}-whatsappSession`, (data) => {
        if (isMounted.current) {
          if (data.action === "update") {
            logger.whatsapp.debug("🔄 ACTUALIZANDO SESIÓN:", data.session.id);
            dispatch({ type: "UPDATE_SESSION", payload: data.session });
          }
        }
      });

      return () => {
        if (isMounted.current) {
          // ✅ SOLO REMOVER LISTENERS, NO DESCONECTAR EL SOCKET COMPARTIDO
          if (socket && typeof socket.off === 'function') {
            socket.off(`company-${companyId}-whatsapp`);
            socket.off(`company-${companyId}-whatsappSession`);
          }
        }
      };
    }
  }, [socketManager]);
  */

  return { whatsApps, loading, refreshWhatsApps };
};

export default useWhatsApps;
