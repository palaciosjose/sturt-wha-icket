import React, { useState, useEffect, useRef, useContext } from "react";
import { useHistory } from "react-router-dom";
import logger from "../../utils/logger";

import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import Select from "@material-ui/core/Select";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import { Grid, ListItemText, Typography, makeStyles } from "@material-ui/core";

import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Autocomplete from "@material-ui/lab/Autocomplete";
import CircularProgress from "@material-ui/core/CircularProgress";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import toastError from "../../errors/toastError";
import useQueues from "../../hooks/useQueues";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
  maxWidth: {
    width: "100%",
  },
}));



const TransferTicketModalCustom = ({ modalOpen, onClose, ticketid }) => {
  logger.transferModal.debug("🎯 TransferTicketModalCustom renderizado - modalOpen:", modalOpen);
  const history = useHistory();
  const [options, setOptions] = useState([]);
  const [queues, setQueues] = useState([]);
  const [allQueues, setAllQueues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedQueue, setSelectedQueue] = useState("");
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const classes = useStyles();
  const { findAll: findAllQueues } = useQueues();
  const isMounted = useRef(true);
  const [whatsapps, setWhatsapps] = useState([]);
  const [selectedWhatsapp, setSelectedWhatsapp] = useState("");
  const { user } = useContext(AuthContext);
  const { companyId, whatsappId } = user;

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchContacts = async () => {
        api
          .get(`/whatsapp`, { params: { companyId, session: 0 } })
          .then(({ data }) => setWhatsapps(data));
      };

      if (whatsappId !== null && whatsappId !== undefined) {
        setSelectedWhatsapp(whatsappId)
      }

      if (user.queues.length === 1) {
        setSelectedQueue(user.queues[0].id)
      }
      fetchContacts();
      setLoading(false);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [companyId, user.queues, whatsappId])

  useEffect(() => {
    if (isMounted.current) {
      const loadQueues = async () => {
        const list = await findAllQueues();
        setAllQueues(list);
        setQueues(list);
      };
      loadQueues();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ CARGAR USUARIOS AUTOMÁTICAMENTE AL ABRIR EL MODAL
  useEffect(() => {
    if (!modalOpen) {
      setLoading(false);
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      try {
        logger.transferModal.debug("🔍 Buscando usuarios...");
        const { data } = await api.get("/users/", {
          params: { 
            searchParam: searchParam || "", // Si no hay búsqueda, traer todos
            limit: 10 // Limitar a 10 usuarios inicialmente
          },
        });
        logger.transferModal.debug("✅ Usuarios encontrados:", data.users);
        setOptions(data.users);
        setLoading(false);
      } catch (err) {
        logger.transferModal.error("❌ Error al buscar usuarios:", err);
        setLoading(false);
        toastError(err);
      }
    };

    // ✅ CARGAR INMEDIATAMENTE AL ABRIR EL MODAL
    logger.transferModal.debug("🚀 Modal abierto, cargando usuarios...");
    fetchUsers();
  }, [modalOpen, searchParam]);

  // ✅ BÚSQUEDA CON DEBOUNCE
  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      const fetchUsers = async () => {
        setLoading(true);
        try {
          logger.transferModal.debug("🔍 Buscando usuarios con parámetro:", searchParam);
          const { data } = await api.get("/users/", {
            params: { 
              searchParam: searchParam || "", // Si está vacío, traer todos
              limit: 10
            },
          });
          logger.transferModal.debug("✅ Usuarios encontrados en búsqueda:", data.users);
          setOptions(data.users);
          setLoading(false);
        } catch (err) {
          logger.transferModal.error("❌ Error en búsqueda:", err);
          setLoading(false);
          toastError(err);
        }
      };

      fetchUsers();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, modalOpen]);

  const handleClose = () => {
    onClose();
    setSearchParam("");
    setSelectedUser(null);
    setAutocompleteOpen(false);
    setOptions([]);
  };

  const handleSaveTicket = async (e) => {
    e.preventDefault();
    if (!ticketid) return;
    if (!selectedQueue || selectedQueue === "") return;
    setLoading(true);
    try {
      let data = {};

      if (selectedUser) {
        data.userId = selectedUser.id;
      }

      if (selectedQueue && selectedQueue !== null) {
        data.queueId = selectedQueue;

        if (!selectedUser) {
          data.status = "pending";
          data.userId = null;
        }
      }

      if (selectedWhatsapp) {
        data.whatsappId = selectedWhatsapp
      }
      await api.put(`/tickets/${ticketid}`, data);

      history.push(`/tickets`);
    } catch (err) {
      setLoading(false);
      toastError(err);
    }
  };

  return (
    <Dialog open={modalOpen} onClose={handleClose} maxWidth="lg" scroll="paper">
      <form onSubmit={handleSaveTicket}>
        <DialogTitle id="form-dialog-title">
          {i18n.t("transferTicketModal.title")}
        </DialogTitle>
        <DialogContent dividers>
          <Autocomplete
            style={{ width: 400, marginBottom: 20 }}
            getOptionLabel={(option) => option?.name || ""}
                            value={selectedUser || ''}
            onChange={(e, newValue) => {
              logger.transferModal.debug("👤 Usuario seleccionado:", newValue);
              setSelectedUser(newValue);
              if (newValue != null && Array.isArray(newValue.queues)) {
                setQueues(newValue.queues);
              } else {
                setQueues(allQueues);
                setSelectedQueue("");
              }
            }}
            options={options}
            filterOptions={(options, { inputValue }) => {
              logger.transferModal.debug("🔍 Filtrando opciones, inputValue:", inputValue);
              // ✅ FILTRO MEJORADO: Buscar por nombre y email
              // Si el input está vacío, mostrar todas las opciones
              if (!inputValue || inputValue.trim() === "") {
                return options;
              }
              return options.filter(option => {
                const searchTerm = inputValue.toLowerCase();
                return (
                  option.name?.toLowerCase().includes(searchTerm) ||
                  option.email?.toLowerCase().includes(searchTerm)
                );
              });
            }}
            freeSolo={false}
            autoHighlight
            noOptionsText={i18n.t("transferTicketModal.noOptions")}
            loading={loading}
            open={autocompleteOpen}
            onOpen={() => {
              // ✅ ABRIR AUTCOMPLETE Y CARGAR USUARIOS
              logger.transferModal.debug("📱 Autocomplete abierto, options.length:", options.length);
              setAutocompleteOpen(true);
              if (options.length === 0) {
                logger.transferModal.debug("🔄 Cargando usuarios desde onOpen...");
                setSearchParam("");
              }
            }}
            onClose={() => {
              logger.transferModal.debug("📱 Autocomplete cerrado");
              setAutocompleteOpen(false);
            }}
            ListboxProps={{
              style: { maxHeight: 200 }, // ✅ SCROLL CON ALTURA MÁXIMA
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={i18n.t("transferTicketModal.fieldLabel")}
                variant="outlined"
                autoFocus
                onChange={(e) => {
                  const value = e.target.value;
                  logger.transferModal.debug("✏️ Input cambiado:", value);
                  setSearchParam(value);
                  // ✅ Si se borra todo el texto, forzar actualización
                  if (!value || value.trim() === "") {
                    logger.transferModal.debug("🔄 Campo vacío, actualizando lista...");
                  }
                }}
                placeholder="Click aquí para ver usuarios disponibles"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <React.Fragment>
                      {loading ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </React.Fragment>
                  ),
                }}
              />
            )}
            renderOption={(option) => (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                padding: '8px 0'
              }}>
                <div style={{ fontWeight: 'bold' }}>
                  {option.name}
                </div>
                {option.email && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#666',
                    marginTop: '2px'
                  }}>
                    {option.email}
                  </div>
                )}
              </div>
            )}
          />
          <FormControl variant="outlined" className={classes.maxWidth}>
            <InputLabel>
              {i18n.t("transferTicketModal.fieldQueueLabel")}
            </InputLabel>
            <Select
              value={selectedQueue}
              onChange={(e) => setSelectedQueue(e.target.value)}
              label={i18n.t("transferTicketModal.fieldQueuePlaceholder")}
            >
              {queues.map((queue) => (
                <MenuItem key={queue.id} value={queue.id}>
                  {queue.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {/* CONEXAO */}
          <Grid container spacing={2} style={{marginTop: '15px'}}>
            <Grid xs={12} item>
              <Select
                required
                fullWidth
                displayEmpty
                variant="outlined"
                value={selectedWhatsapp}
                onChange={(e) => {
                  setSelectedWhatsapp(e.target.value)
                }}
                MenuProps={{
                  anchorOrigin: {
                    vertical: "bottom",
                    horizontal: "left",
                  },
                  transformOrigin: {
                    vertical: "top",
                    horizontal: "left",
                  },
                  getContentAnchorEl: null,
                }}
                renderValue={() => {
                  if (selectedWhatsapp === "") {
                    return "Selecione uma Conexão"
                  }
                  const whatsapp = whatsapps.find(w => w.id === selectedWhatsapp)
                  return whatsapp.name
                }}
              >
                {whatsapps?.length > 0 &&
                  whatsapps.map((whatsapp, key) => (
                    <MenuItem dense key={key} value={whatsapp.id}>
                      <ListItemText
                        primary={
                          <>
                            {/* {IconChannel(whatsapp.channel)} */}
                            <Typography component="span" style={{ fontSize: 14, marginLeft: "10px", display: "inline-flex", alignItems: "center", lineHeight: "2" }}>
                              {whatsapp.name} &nbsp; <p className={(whatsapp.status) === 'CONNECTED' ? classes.online : classes.offline} >({whatsapp.status})</p>
                            </Typography>
                          </>
                        }
                      />
                    </MenuItem>
                  ))}
              </Select>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleClose}
            color="secondary"
            disabled={loading}
            variant="outlined"
          >
            {i18n.t("transferTicketModal.buttons.cancel")}
          </Button>
          <ButtonWithSpinner
            variant="contained"
            type="submit"
            color="primary"
            loading={loading}
          >
            {i18n.t("transferTicketModal.buttons.ok")}
          </ButtonWithSpinner>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TransferTicketModalCustom;
