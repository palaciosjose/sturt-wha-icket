import React, { useState, useEffect, useCallback } from "react";
import { makeStyles } from "@material-ui/core/styles";
import api from "../../services/api";
// ✅ AuthContext comentado para uso futuro
// import { AuthContext } from "../../context/Auth/AuthContext";
import { toast } from "react-toastify";
import { useHistory } from 'react-router-dom';
import KanbanBoard from "../../components/KanbanBoard";
import logger from "../../utils/logger";

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    alignItems: "center",
    padding: theme.spacing(1),
    height: "100%",
  },
  button: {
    background: "#10a110",
    border: "none",
    padding: "10px",
    color: "white",
    fontWeight: "bold",
    borderRadius: "5px",
  },
}));

const Kanban = () => {
  const classes = useStyles();
  const history = useHistory();

  const [tags, setTags] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  // ✅ Variable user disponible para uso futuro
  // const { user } = useContext(AuthContext);

  // ✅ CORREGIDO: Función simplificada sin dependencias circulares
  const fetchTags = useCallback(async () => {
    try {
      logger.dashboard.debug("🔄 Cargando tags de Kanban...");
      const response = await api.get("/tags/kanban");
      const fetchedTags = response.data.lista || []; 
      setTags(fetchedTags);
      logger.dashboard.debug("✅ Tags cargados:", fetchedTags.length);
      return fetchedTags;
    } catch (error) {
      // ✅ MANEJO SILENCIOSO DE ERRORES DE AUTENTICACIÓN
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        logger.dashboard.debug("🔄 Error de autenticación silenciado:", error.response.status);
        return [];
      }
      
      logger.dashboard.error("❌ Error cargando tags:", error);
      return [];
    }
  }, []);

  // ✅ CORREGIDO: Función simplificada sin dependencias circulares
  const fetchTickets = useCallback(async () => {
    try {
      logger.dashboard.debug("🔄 Cargando tickets de Kanban...");
      
      const { data } = await api.get("/ticket/kanban", {
        params: {
          teste: true
        }
      });
      
      // ✅ DEBUG: Solo una vez al cargar
      if (!isInitialized) {
        logger.dashboard.debug("🔄 [Frontend] Datos recibidos del backend:", {
          totalTickets: data.tickets?.length || 0,
          count: data.count,
          hasMore: data.hasMore
        });
        
        const ticketsConEtiquetas = data.tickets?.filter(t => t.tags && t.tags.length > 0) || [];
        const ticketsSinEtiquetas = data.tickets?.filter(t => !t.tags || t.tags.length === 0) || [];
        
        logger.dashboard.debug("🔄 [Frontend] Distribución de tickets:", {
          conEtiquetas: ticketsConEtiquetas.length,
          sinEtiquetas: ticketsSinEtiquetas.length,
          total: data.tickets?.length || 0
        });
      }
      
      setTickets(data.tickets || []);
      logger.dashboard.debug("✅ Tickets cargados:", data.tickets?.length || 0);
      
    } catch (err) {
      logger.dashboard.error("❌ Error cargando tickets:", err);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        logger.dashboard.warn("🔄 Error de autenticación, manejado por interceptor");
        return;
      }
      setTickets([]);
    }
  }, [isInitialized]);

  // ✅ CORREGIDO: useEffect optimizado sin bucle infinito y con dependencias correctas
  useEffect(() => {
    let isMounted = true;
    
    const initializeData = async () => {
      if (isMounted && !isInitialized) {
        try {
          // Cargar tags primero
          await fetchTags();
          // Luego cargar tickets
          await fetchTickets();
          if (isMounted) {
            setIsInitialized(true);
          }
        } catch (error) {
          if (isMounted) {
            logger.dashboard.error("❌ Error inicializando datos:", error);
          }
        }
      }
    };

    // Delay inicial para evitar requests simultáneos
    const timer = setTimeout(() => {
      initializeData();
    }, 500);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [fetchTags, fetchTickets, isInitialized]); // ✅ Dependencias correctas

  const handleCardMove = async (cardId, sourceLaneId, targetLaneId) => {
    try {
      logger.dashboard.debug("🔄 Moviendo ticket:", { cardId, sourceLaneId, targetLaneId });
      
      // ✅ MANEJAR CASO ESPECIAL: ABIERTOS (sin etiquetas)
      if (targetLaneId === 'abiertos') {
        // Solo eliminar etiquetas existentes para mover a ABIERTOS
        if (sourceLaneId && sourceLaneId !== targetLaneId) {
          try {
            const sourceTag = tags.find(tag => {
              if (sourceLaneId === 'atencion') return tag.name === 'Atención';
              if (sourceLaneId === 'cerrado') return tag.name === 'Cerrado';
              return false;
            });
            
            if (sourceTag) {
              await api.delete(`/ticket-tags/${cardId}`);
              logger.dashboard.debug("✅ Etiqueta eliminada para mover a ABIERTOS");
            }
          } catch (deleteErr) {
            logger.dashboard.debug("ℹ️ Etiqueta no existía en origen:", deleteErr.response?.status);
          }
        }
        
        toast.success('Ticket movido a ABIERTOS exitosamente!');
        logger.dashboard.debug("✅ Ticket movido a ABIERTOS");
        return;
      }
      
      // ✅ MANEJAR ETIQUETAS DINÁMICAS
      let targetTag = null;
      
      // Si el targetLaneId es dinámico (formato: tag-123)
      if (targetLaneId.startsWith('tag-')) {
        const targetTagId = parseInt(targetLaneId.replace('tag-', ''));
        targetTag = tags.find(tag => tag.id === targetTagId);
      }
      
      if (!targetTag) {
        logger.dashboard.error("❌ Tag no encontrado para:", targetLaneId);
        toast.error('Error: Tag no encontrado');
        return;
      }
      
      // Solo eliminar el tag si existe en el origen
      if (sourceLaneId && sourceLaneId !== targetLaneId) {
        try {
          // Encontrar el tag del origen (dinámico)
          let sourceTag = null;
          if (sourceLaneId.startsWith('tag-')) {
            const sourceTagId = parseInt(sourceLaneId.replace('tag-', ''));
            sourceTag = tags.find(tag => tag.id === sourceTagId);
          }
          
          if (sourceTag) {
            await api.delete(`/ticket-tags/${cardId}`);
            logger.dashboard.debug("✅ Tag eliminado del origen");
          }
        } catch (deleteErr) {
          // Si el tag no existe, no es un error
          logger.dashboard.debug("ℹ️ Tag no existía en origen:", deleteErr.response?.status);
        }
      }
      
      // Agregar el tag al destino
      if (targetTag) {
        await api.put(`/ticket-tags/${cardId}/${targetTag.id}`);
        logger.dashboard.debug("✅ Tag agregado al destino");
        toast.success('Ticket movido exitosamente!');
      }
      
      logger.dashboard.debug("✅ Ticket movido exitosamente");
      
    } catch (err) {
      logger.dashboard.error("❌ Error moviendo ticket:", err);
      toast.error('Error al mover el ticket');
    }
  };

  const handleCardClick = (ticket) => {
    history.push('/tickets/' + ticket.uuid);
  };

  return (
    <div className={classes.root}>
      <KanbanBoard 
        tickets={tickets}
        tags={tags}
        onCardMove={handleCardMove}
        onCardClick={handleCardClick}
      />
    </div>
  );
};

export default Kanban;
