import React, { useState, useEffect, useContext, useCallback } from "react";
import { makeStyles } from "@material-ui/core/styles";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
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
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useContext(AuthContext);
  const jsonString = user.queues.map(queue => queue.UserQueue.queueId);

  const fetchTags = useCallback(async (retryCount = 0) => {
    if (isLoading) return; // Evitar requests múltiples
    
    try {
      setIsLoading(true);
      logger.dashboard.debug("🔄 Cargando tags de Kanban...");
      const response = await api.get("/tags/kanban");
      const fetchedTags = response.data.lista || []; 
      setTags(fetchedTags);
      logger.dashboard.debug("✅ Tags cargados:", fetchedTags.length);
      // Fetch tickets after fetching tags
      await fetchTickets(jsonString);
    } catch (error) {
      // ✅ MANEJO SILENCIOSO DE ERRORES DE AUTENTICACIÓN
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        logger.dashboard.debug("🔄 Error de autenticación silenciado:", error.response.status);
        // No mostrar error en consola para evitar spam
        return;
      }
      
      // Solo mostrar errores que no sean de autenticación
      logger.dashboard.error("❌ Error cargando tags:", error);
      
      // Retry con backoff exponencial para errores de red
      if (retryCount < 3 && (error.code === 'ERR_INSUFFICIENT_RESOURCES' || error.message?.includes('ERR_INSUFFICIENT_RESOURCES'))) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        logger.dashboard.warn(`🔄 Reintentando en ${delay}ms (intento ${retryCount + 1}/3)`);
        setTimeout(() => {
          fetchTags(retryCount + 1);
        }, delay);
        return;
      }
      
      // Continuar sin tags si hay error después de retries
      logger.dashboard.warn("⚠️ Continuando sin tags después de errores");
      await fetchTickets(jsonString);
    } finally {
      setIsLoading(false);
    }
  }, [jsonString, isLoading]);

  useEffect(() => {
    // Agregar delay para evitar requests simultáneos
    const timer = setTimeout(() => {
      fetchTags();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [fetchTags]);

  const fetchTickets = async (jsonString) => {
    try {
      logger.dashboard.debug("🔄 Cargando tickets de Kanban...");
      const { data } = await api.get("/ticket/kanban", {
        params: {
          queueIds: JSON.stringify(jsonString),
          teste: true
        }
      });
      setTickets(data.tickets);
      logger.dashboard.debug("✅ Tickets cargados:", data.tickets?.length || 0);
    } catch (err) {
      logger.dashboard.error("❌ Error cargando tickets:", err);
      // Si es error de autenticación, no hacer nada (ya manejado por interceptor)
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        logger.dashboard.warn("🔄 Error de autenticación, manejado por interceptor");
        return;
      }
      setTickets([]);
    }
  };

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
        
        // Recargar datos después del movimiento
        setTimeout(() => {
          fetchTags();
        }, 500);
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
      
      // Recargar datos después del movimiento
      setTimeout(() => {
        fetchTags();
      }, 500);
      
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
