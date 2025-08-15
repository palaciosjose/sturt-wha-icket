import React, { useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { 
  Paper, 
  Typography, 
  Avatar, 
  IconButton, 
  Card, 
  CardContent
} from "@material-ui/core";
import { 
  Schedule as ScheduleIcon, 
  Chat as ChatIcon,
  DragIndicator as DragIcon
} from "@material-ui/icons";
import { useHistory } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import ScheduleModal from "../ScheduleModal";
import { getInitials } from "../../helpers/getInitials";
import { generateColor } from "../../helpers/colorGenerator";
import logger from "../../utils/logger";

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    height: "100%",
    padding: theme.spacing(2),
    gap: theme.spacing(2),
  },

  column: {
    flex: 1,
    minWidth: 300,
    maxWidth: 400,
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.spacing(1),
    border: `1px solid ${theme.palette.divider}`,
  },

  columnHeader: {
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  columnTitle: {
    fontWeight: "bold",
    fontSize: "1.1rem",
  },

  columnCount: {
    backgroundColor: theme.palette.primary.main,
    color: "white",
    borderRadius: "50%",
    width: 24,
    height: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.8rem",
    fontWeight: "bold",
  },

  cardsContainer: {
    padding: theme.spacing(1),
    maxHeight: "calc(100vh - 200px)",
    minHeight: 100,
    // Removido overflowY para evitar scroll containers anidados
  },

  card: {
    marginBottom: theme.spacing(1),
    cursor: "grab",
    transition: "all 0.2s ease",
    border: `2px solid ${theme.palette.divider}`,
    borderRadius: theme.spacing(1),
    backgroundColor: theme.palette.background.paper,
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: theme.shadows[4],
      borderColor: theme.palette.primary.main,
    },
    "&:active": {
      cursor: "grabbing",
    },
  },

  cardContent: {
    padding: theme.spacing(1.5),
    "&:last-child": {
      paddingBottom: theme.spacing(1.5),
    },
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: theme.spacing(1),
  },

  avatar: {
    width: 32,
    height: 32,
    marginRight: theme.spacing(1),
    backgroundColor: theme.palette.primary.main,
    border: `2px solid ${theme.palette.divider}`,
  },

  contactInfo: {
    flex: 1,
    minWidth: 0,
  },

  contactName: {
    fontWeight: "bold",
    fontSize: "0.9rem",
    marginBottom: 2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  contactNumber: {
    fontSize: "0.8rem",
    color: theme.palette.text.secondary,
  },

  lastMessage: {
    fontSize: "0.8rem",
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.5),
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "100%",
  },

  quickActions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: theme.spacing(1),
    gap: theme.spacing(0.5),
  },

  actionButton: {
    padding: 4,
    minWidth: 32,
    height: 32,
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
  },

  dragIcon: {
    color: theme.palette.text.disabled,
    fontSize: "1rem",
    marginRight: theme.spacing(0.5),
  },

  tagChip: {
    marginTop: theme.spacing(0.5),
    height: 20,
    fontSize: "0.7rem",
  },
}));

const KanbanBoard = ({ tickets, tags, onCardMove, onCardClick }) => {
  const classes = useStyles();
  const history = useHistory();
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [localTickets, setLocalTickets] = useState(tickets);
  const [isMoving, setIsMoving] = useState(false);

  // ✅ Actualizar tickets locales cuando cambien los props
  React.useEffect(() => {
    setLocalTickets(tickets);
  }, [tickets]);

  // ✅ LÓGICA DINÁMICA: Separar tickets por etiquetas que tienen kanban=true
  const ticketsSinEtiquetas = localTickets.filter(ticket => ticket.tags.length === 0);
  
  // ✅ DEBUG INMEDIATO: Verificar tickets sin etiquetas
  console.log('🔍 [DEBUG INMEDIATO] KanbanBoard - Tickets sin etiquetas:', {
    totalTickets: localTickets.length,
    ticketsSinEtiquetas: ticketsSinEtiquetas.length,
    sampleTickets: localTickets.slice(0, 3).map(t => ({
      id: t.id,
      hasTags: !!t.tags,
      tagsLength: t.tags?.length || 0,
      tagsType: typeof t.tags,
      tagsIsArray: Array.isArray(t.tags),
      rawTags: t.tags
    }))
  });
  
  // ✅ Filtrar solo etiquetas que tienen kanban activado
  const etiquetasKanban = tags.filter(tag => tag.kanban === 1);
  
  // ✅ Crear un objeto para mapear etiquetas a sus tickets
  const ticketsPorEtiqueta = {};
  etiquetasKanban.forEach(tag => {
    ticketsPorEtiqueta[tag.id] = localTickets.filter(ticket => 
      ticket.tags.some(ticketTag => ticketTag.id === tag.id)
    );
  });

  // ✅ Debug para verificar etiquetas kanban y tickets
  React.useEffect(() => {
    logger.dashboard.debug('🔄 Kanban dinámico actualizado:', {
      totalTickets: localTickets.length,
      sinEtiquetas: ticketsSinEtiquetas.length,
      etiquetasKanban: etiquetasKanban.map(tag => ({
        id: tag.id,
        name: tag.name,
        kanban: tag.kanban,
        tickets: ticketsPorEtiqueta[tag.id]?.length || 0
      }))
    });
    
    // ✅ DEBUG EXTENDIDO: Verificar tickets sin etiquetas
    if (ticketsSinEtiquetas.length > 0) {
      logger.dashboard.debug('🔄 [KanbanBoard] Tickets ABIERTOS encontrados:', 
        ticketsSinEtiquetas.slice(0, 5).map(t => ({
          id: t.id,
          contactName: t.contact?.name,
          tags: t.tags?.length || 0,
          tagNames: t.tags?.map(tag => tag.name) || []
        }))
      );
    } else {
      logger.dashboard.warn('⚠️ [KanbanBoard] NO HAY TICKETS SIN ETIQUETAS - ABIERTOS estará vacío');
      
      // ✅ DEBUG: Verificar estructura de tickets recibidos
      if (localTickets.length > 0) {
        logger.dashboard.debug('🔄 [KanbanBoard] Estructura de tickets recibidos:', 
          localTickets.slice(0, 3).map(t => ({
            id: t.id,
            hasTags: !!t.tags,
            tagsLength: t.tags?.length || 0,
            tagsType: typeof t.tags,
            tagsIsArray: Array.isArray(t.tags),
            rawTags: t.tags
          }))
        );
      }
    }
  }, [localTickets, etiquetasKanban, ticketsPorEtiqueta, ticketsSinEtiquetas.length]);

  // ✅ CREAR COLUMNAS DINÁMICAMENTE
  const columns = [
    // Columna fija de ABIERTOS (tickets sin etiquetas)
    {
      id: "abiertos",
      title: "ABIERTOS",
      tickets: ticketsSinEtiquetas,
      color: "#1976d2"
    },
    // Columnas dinámicas basadas en etiquetas con kanban=true
    ...etiquetasKanban.map(tag => ({
      id: `tag-${tag.id}`,
      title: tag.name.toUpperCase(),
      tickets: ticketsPorEtiqueta[tag.id] || [],
      color: tag.color || "#666666"
    }))
  ];

  const handleScheduleClick = (e, ticket) => {
    e.stopPropagation();
    setSelectedTicket(ticket);
    setScheduleModalOpen(true);
  };



  const handleCardClick = (ticket) => {
    history.push(`/tickets/${ticket.uuid}`);
  };

  const handleScheduleModalClose = () => {
    setScheduleModalOpen(false);
    setSelectedTicket(null);
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) {
      // Mismo column, solo reordenar
      return;
    }

    // Diferente column, mover ticket
    try {
      setIsMoving(true);
      const ticketId = parseInt(draggableId);
      const sourceLaneId = source.droppableId;
      const targetLaneId = destination.droppableId;

      // ✅ ACTUALIZACIÓN INMEDIATA LOCAL
      const ticketToMove = localTickets.find(t => t.id === ticketId);
      if (ticketToMove) {
        logger.dashboard.debug('🔄 Moviendo ticket local:', {
          ticketId,
          sourceLaneId,
          targetLaneId,
          etiquetasActuales: ticketToMove.tags.map(t => t.name)
        });

        // Crear una copia del ticket con las etiquetas actualizadas
        const updatedTicket = { ...ticketToMove };
        
        // ✅ LÓGICA DINÁMICA: Remover etiquetas del origen
        if (sourceLaneId.startsWith('tag-')) {
          const sourceTagId = parseInt(sourceLaneId.replace('tag-', ''));
          const sourceTag = etiquetasKanban.find(tag => tag.id === sourceTagId);
          if (sourceTag) {
            updatedTicket.tags = updatedTicket.tags.filter(tag => tag.id !== sourceTag.id);
            logger.dashboard.debug(`✅ Removida etiqueta: ${sourceTag.name}`);
          }
        }
        
        // ✅ LÓGICA DINÁMICA: Agregar etiquetas al destino
        if (targetLaneId.startsWith('tag-')) {
          const targetTagId = parseInt(targetLaneId.replace('tag-', ''));
          const targetTag = etiquetasKanban.find(tag => tag.id === targetTagId);
          if (targetTag) {
            // Verificar que la etiqueta no esté ya presente
            const alreadyHasTag = updatedTicket.tags.some(tag => tag.id === targetTag.id);
            if (!alreadyHasTag) {
              updatedTicket.tags = [...updatedTicket.tags, targetTag];
              logger.dashboard.debug(`✅ Agregada etiqueta: ${targetTag.name}`);
            }
          }
        }
        
        // Actualizar estado local inmediatamente
        setLocalTickets(prev => {
          const newTickets = prev.map(t => t.id === ticketId ? updatedTicket : t);
          logger.dashboard.debug('🔄 Estado local actualizado:', {
            ticketsActualizados: newTickets.length,
            etiquetasNuevas: updatedTicket.tags.map(t => t.name)
          });
          return newTickets;
        });
      }

      // Llamar a la función de movimiento existente
      await onCardMove(ticketId, sourceLaneId, targetLaneId);
      
      // ✅ Confirmación visual de movimiento exitoso
      logger.dashboard.debug('✅ Movimiento completado exitosamente');
      
    } catch (error) {
      logger.dashboard.error("Error moving card:", error);
      // Si hay error, revertir el cambio local
      setLocalTickets(tickets);
    } finally {
      setIsMoving(false);
    }
  };

  const truncateText = (text, maxLength = 50) => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  const getContactAvatar = (contact) => {
    // ✅ LOG SILENCIOSO - Solo en modo debug y cuando el logger esté habilitado
    if ((process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined) && logger.config.get().enableDashboard) {
      logger.dashboard.debug('🔍 Contact Avatar Debug:', {
        name: contact?.name,
        profilePicUrl: contact?.profilePicUrl,
        hasImage: contact?.profilePicUrl && 
                  contact?.profilePicUrl !== "" && 
                  !contact?.profilePicUrl.includes("nopicture.png")
      });
    }
    
    // Usar la imagen de perfil real del contacto si existe y no es la imagen por defecto
    if (contact.profilePicUrl && 
        contact.profilePicUrl !== "" && 
        !contact.profilePicUrl.includes("nopicture.png")) {
      return contact.profilePicUrl;
    }
    // Si no hay imagen válida, usar null para que se muestren las iniciales
    return null;
  };

  const getContactInitials = (name) => {
    if (!name) return "?";
    return getInitials(name);
  };

  const handleAvatarError = (event) => {
    // Si la imagen falla al cargar, ocultar la imagen para mostrar las iniciales
    event.target.style.display = 'none';
  };

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className={classes.root}>
          {columns.map(column => (
            <Paper key={column.id} className={classes.column} elevation={1}>
              <div className={classes.columnHeader}>
                <Typography className={classes.columnTitle} style={{ color: column.color }}>
                  {column.title}
                </Typography>
                <div className={classes.columnCount}>
                  {column.tickets.length}
                </div>
              </div>
              
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div 
                    className={classes.cardsContainer}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {column.tickets.map((ticket, index) => (
                      <Draggable 
                        key={ticket.id.toString()} 
                        draggableId={ticket.id.toString()} 
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <Card 
                              className={classes.card}
                              style={{
                                transform: snapshot.isDragging ? 'rotate(5deg)' : 'none',
                                boxShadow: snapshot.isDragging ? '0 5px 10px rgba(0,0,0,0.15)' : 'none',
                                opacity: isMoving ? 0.6 : 1,
                                pointerEvents: isMoving ? 'none' : 'auto',
                                transition: 'all 0.3s ease',
                                border: snapshot.isDragging ? '2px solid #1976d2' : undefined
                              }}
                            >
                              <CardContent className={classes.cardContent}>
                                <div className={classes.cardHeader}>
                                  <DragIcon className={classes.dragIcon} />
                                  <Avatar 
                                    className={classes.avatar}
                                    src={getContactAvatar(ticket.contact)}
                                    onError={handleAvatarError}
                                    style={{ 
                                      backgroundColor: generateColor(ticket.contact?.number),
                                      color: "white",
                                      fontWeight: "bold"
                                    }}
                                  >
                                    {getContactInitials(ticket.contact.name)}
                                  </Avatar>
                                  <div className={classes.contactInfo}>
                                    <div className={classes.contactName}>
                                      {ticket.contact.name}
                                    </div>
                                    <div className={classes.contactNumber}>
                                      {ticket.contact.number}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className={classes.lastMessage}>
                                  {truncateText(ticket.lastMessage, 50)}
                                </div>
                                
                                <div className={classes.quickActions}>
                                  <IconButton
                                    className={classes.actionButton}
                                    onClick={(e) => handleScheduleClick(e, ticket)}
                                    title="Agendar"
                                  >
                                    <ScheduleIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    className={classes.actionButton}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCardClick(ticket);
                                    }}
                                    title="Ver conversación"
                                  >
                                    <ChatIcon fontSize="small" />
                                  </IconButton>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </Paper>
          ))}
        </div>
      </DragDropContext>

      {/* Modal de Agendamiento */}
      {selectedTicket && (
        <ScheduleModal
          open={scheduleModalOpen}
          onClose={handleScheduleModalClose}
          contactId={selectedTicket.contactId}
          ticketId={selectedTicket.id}
          reload={() => {
            // Recargar datos si es necesario
            logger.dashboard.debug("Recargando datos del KANBAN");
          }}
        />
      )}
    </>
  );
};

export default KanbanBoard; 