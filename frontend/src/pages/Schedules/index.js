import React, { useState, useEffect, useReducer, useCallback, useContext } from "react";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import ScheduleModal from "../../components/ScheduleModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import moment from "moment";
import { SocketContext } from "../../context/Socket/SocketContext";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Calendar, momentLocalizer } from "react-big-calendar";
import "moment/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";
import SearchIcon from "@material-ui/icons/Search";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import IconButton from "@material-ui/core/IconButton";
import Chip from "@material-ui/core/Chip";

import "./Schedules.css"; // Importe o arquivo CSS

// Defina a função getUrlParam antes de usá-la
function getUrlParam(paramName) {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get(paramName);
}

const eventTitleStyle = {
  fontSize: "14px", // Defina um tamanho de fonte menor
  overflow: "hidden", // Oculte qualquer conteúdo excedente
  whiteSpace: "nowrap", // Evite a quebra de linha do texto
  textOverflow: "ellipsis", // Exiba "..." se o texto for muito longo
};

const localizer = momentLocalizer(moment);
var defaultMessages = {
  date: "Fecha",
  time: "Hora",
  event: "Evento",
  allDay: "Día Completo",
  week: "Semana",
  work_week: "Agendamientos",
  day: "Día",
  month: "Mes",
  previous: "Anterior",
  next: "Siguiente",
  yesterday: "Ayer",
  tomorrow: "Mañana",
  today: "Hoy",
  agenda: "Agenda",
  noEventsInRange: "No hay agendamientos en este período.",
  showMore: function showMore(total) {
    return "+" + total + " más";
  }
};

const reducer = (state, action) => {
  if (action.type === "LOAD_SCHEDULES") {
    // Si es la primera página, reemplazar completamente
    if (action.payload.pageNumber === 1) {
      return action.payload.schedules;
    }
    // Si es paginación, concatenar
    return [...state, ...action.payload.schedules];
  }

  if (action.type === "UPDATE_SCHEDULES") {
    const schedule = action.payload;
    const scheduleIndex = state.findIndex((s) => s.id === schedule.id);

    if (scheduleIndex !== -1) {
      state[scheduleIndex] = schedule;
      return [...state];
    } else {
      return [schedule, ...state];
    }
  }

  if (action.type === "DELETE_SCHEDULE") {
    const scheduleId = action.payload;
    return state.filter((s) => s.id !== scheduleId);
  }

  if (action.type === "RESET") {
    return [];
  }

  return state;
};

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
}));

const Schedules = () => {
  const classes = useStyles();

  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [deletingSchedule, setDeletingSchedule] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [schedules, dispatch] = useReducer(reducer, []);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [contactId, setContactId] = useState(+getUrlParam("contactId"));
  const [viewMode, setViewMode] = useState("calendar"); // "calendar" o "table"


  const fetchSchedules = useCallback(async () => {
    try {
      const { data } = await api.get("/schedules/", {
        params: { searchParam, pageNumber },
      });

      dispatch({ type: "LOAD_SCHEDULES", payload: { schedules: data.schedules, pageNumber } });
      setHasMore(data.hasMore);
      setLoading(false);
    } catch (err) {
      toastError(err);
    }
  }, [searchParam, pageNumber]);

  const handleOpenScheduleModalFromContactId = useCallback(() => {
    if (contactId) {
      handleOpenScheduleModal();
    }
  }, [contactId]);

  const socketManager = useContext(SocketContext);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetchSchedules();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [
    searchParam,
    pageNumber,
    contactId,
    fetchSchedules,
    handleOpenScheduleModalFromContactId,
  ]);

  useEffect(() => {
    handleOpenScheduleModalFromContactId();
    const socket = socketManager.getSocket(user.companyId);

    socket.on(`company${user.companyId}-schedule`, (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_SCHEDULES", payload: data.schedule });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_SCHEDULE", payload: +data.scheduleId });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [handleOpenScheduleModalFromContactId, socketManager, user]);

  const cleanContact = () => {
    setContactId("");
  };

  const handleOpenScheduleModal = () => {
    setSelectedSchedule(null);
    setScheduleModalOpen(true);
  };

  const handleCloseScheduleModal = () => {
    setSelectedSchedule(null);
    setScheduleModalOpen(false);
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleEditSchedule = (schedule) => {
    setSelectedSchedule(schedule);
    setScheduleModalOpen(true);
  };

  const handleDeleteSchedule = async (scheduleId) => {
    try {
      // Buscar el schedule para verificar su estado
      const schedule = schedules.find(s => s.id === scheduleId);
      
      if (schedule && schedule.isReminderSystem) {
        // Si es del sistema de recordatorios, usar la lógica de cancelar
        await api.post(`/schedules/${scheduleId}/cancel-reminder`);
        toast.success("Reunión cancelada exitosamente");
      } else {
        // Cancelar agendamiento normal (sin eliminar)
        await api.post(`/schedules/${scheduleId}/cancel`);
        toast.success("Agendamiento cancelado exitosamente");
      }
      
      setDeletingSchedule(null);
      setSearchParam("");
      setPageNumber(1);

      dispatch({ type: "RESET" });
      setPageNumber(1);
      await fetchSchedules();
      
      // Forzar actualización de página para eliminar residuos
      window.location.reload();
    } catch (err) {
      toastError(err);
    }
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  const truncate = (str, len) => {
    if (str.length > len) {
      return str.substring(0, len) + "...";
    }
    return str;
  };

  const getScheduleStatus = (schedule) => {
    const now = new Date();
    const scheduleDate = new Date(schedule.sendAt);
    
    // Verificar estado específico del agendamiento
    if (schedule.status === "CANCELADO") {
      return { text: "Cancelado", color: "gray" };
    } else if (schedule.sentAt) {
      return { text: "Enviado", color: "green" };
    } else if (scheduleDate < now) {
      return { text: "Vencido", color: "red" };
    } else {
      return { text: "Pendiente", color: "orange" };
    }
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          deletingSchedule &&
          (deletingSchedule.isReminderSystem 
            ? "¿Cancelar reunión?" 
            : "¿Cancelar agendamiento?")
        }
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => handleDeleteSchedule(deletingSchedule.id)}
      >
        {deletingSchedule && deletingSchedule.isReminderSystem 
          ? "¿Estás seguro de que deseas cancelar esta reunión? Se eliminarán todos los recordatorios asociados."
          : "¿Estás seguro de que deseas cancelar este agendamiento? Se enviará un mensaje de cancelación al contacto."
        }
      </ConfirmationModal>
      <ScheduleModal
        open={scheduleModalOpen}
        onClose={handleCloseScheduleModal}
        reload={fetchSchedules}
        aria-labelledby="form-dialog-title"
        scheduleId={selectedSchedule && selectedSchedule.id}
        contactId={contactId}
        cleanContact={cleanContact}
      />
      <MainHeader>
        <Title>Agendamientos ({schedules.length})</Title>
        <MainHeaderButtonsWrapper>
          <TextField
            placeholder={i18n.t("contacts.searchPlaceholder")}
            type="search"
            value={searchParam}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: "gray" }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="outlined"
            color="primary"
            onClick={() => setViewMode(viewMode === "calendar" ? "table" : "calendar")}
            style={{ marginRight: 8 }}
          >
            {viewMode === "calendar" ? "Vista Tabla" : "Vista Calendario"}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenScheduleModal}
          >
            Nuevo Agendamiento
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper className={classes.mainPaper} variant="outlined" onScroll={handleScroll}>
        {viewMode === "calendar" ? (
          <Calendar
            messages={defaultMessages}
            formats={{
            agendaDateFormat: "DD/MM ddd",
            weekdayFormat: "dddd"
        }}
            localizer={localizer}
            events={schedules.map((schedule) => ({
                          title: (
              <div className="event-container">
                <div style={eventTitleStyle}>{schedule.contact.name}{schedule.contactList ? ` (${schedule.contactList.name})` : ""}</div>
                <DeleteOutlineIcon
                  onClick={() => {
                    setDeletingSchedule(schedule);
                    setConfirmModalOpen(true);
                  }}
                  className="delete-icon"
                  style={{ 
                    opacity: (schedule.sentAt || new Date(schedule.sendAt) < new Date()) ? 0.3 : 1,
                    cursor: (schedule.sentAt || new Date(schedule.sendAt) < new Date()) ? 'not-allowed' : 'pointer'
                  }}
                />
                <EditIcon
                  onClick={() => {
                    handleEditSchedule(schedule);
                    setScheduleModalOpen(true);
                  }}
                  className="edit-icon"
                  style={{ 
                    opacity: new Date(schedule.sendAt) < new Date() ? 0.3 : 1,
                    cursor: new Date(schedule.sendAt) < new Date() ? 'not-allowed' : 'pointer'
                  }}
                />
              </div>
            ),
              start: new Date(schedule.sendAt),
              end: new Date(schedule.sendAt),
            }))}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 500 }}
          />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell align="center">Fecha</TableCell>
                <TableCell align="center">Hora</TableCell>
                <TableCell align="center">Contacto</TableCell>
                <TableCell align="center">Grupo</TableCell>
                <TableCell align="center">Conexión</TableCell>
                <TableCell align="center">Mensaje</TableCell>
                <TableCell align="center">Recurrencia</TableCell>
                <TableCell align="center">Estado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {schedules.map((schedule) => {
                const status = getScheduleStatus(schedule);
                const scheduleDate = new Date(schedule.sendAt);
                return (
                  <TableRow key={schedule.id}>
                    <TableCell align="center">
                      {scheduleDate.toLocaleDateString('es-ES', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric' 
                      })}
                    </TableCell>
                    <TableCell align="center">
                      {scheduleDate.toLocaleTimeString('es-ES', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </TableCell>
                    <TableCell align="center">
                      {schedule.contact?.name || 'N/A'}
                    </TableCell>
                    <TableCell align="center">
                      {schedule.contactList ? <Chip size="small" label={schedule.contactList.name} /> : '-'}
                    </TableCell>
                <TableCell align="center">
                  {schedule.whatsapp?.name || 'N/A'}
                </TableCell>
                <TableCell align="center">
                  {truncate(schedule.body, 50)}
                </TableCell>
                <TableCell align="center">
                  {schedule.repeatCount ? `${schedule.repeatCount}x cada ${schedule.intervalValue} ${schedule.intervalUnit}` : '-'}
                </TableCell>
                <TableCell align="center">
                  <span style={{
                    color: status.color,
                    fontWeight: 'bold',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: status.color === 'green' ? '#e8f5e8' : 
                                       status.color === 'red' ? '#ffe8e8' : '#fff3e0'
                      }}>
                        {status.text}
                      </span>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        onClick={() => handleEditSchedule(schedule)}
                        disabled={Boolean(scheduleDate < new Date() || schedule.status === "CANCELADO")}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => {
                          setDeletingSchedule(schedule);
                          setConfirmModalOpen(true);
                        }}
                        disabled={Boolean(schedule.sentAt || scheduleDate < new Date() || schedule.status === "CANCELADO")}
                        size="small"
                        title={schedule.status === "CANCELADO" ? "Ya cancelado" : "Cancelar agendamiento"}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>
    </MainContainer>
  );
};

export default Schedules;