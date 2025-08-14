import React, { useState, useEffect } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
import { makeStyles } from "@material-ui/core/styles";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  CircularProgress,
  FormControlLabel,
  Switch,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Box,
  Typography,
  Paper
} from "@material-ui/core";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import QueueSelect from "../QueueSelect";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  multFieldLine: {
    display: "flex",
    "& > *:not(:last-child)": {
      marginRight: theme.spacing(1),
    },
  },
  btnWrapper: {
    position: "relative",
  },
  buttonProgress: {
    color: theme.palette.success.main,
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
  tabPanel: {
    padding: theme.spacing(3),
  },
  tabContent: {
    marginTop: theme.spacing(2),
  },
  sectionHeader: {
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.grey[50],
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.grey[300]}`,
  },
  checkboxSection: {
    marginBottom: theme.spacing(3),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
  },
  fieldGroup: {
    marginTop: theme.spacing(2),
  },
  textField: {
    minWidth: 200,
  },
}));

// Componente para el contenido de las pestañas
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box className={props.className}>
          {children}
        </Box>
      )}
    </div>
  );
}

const SessionSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Too Short!")
    .max(50, "Too Long!")
    .required("Required"),
});

const initialState = {
  name: "",
  greetingMessage: "",
  complationMessage: "",
  outOfHoursMessage: "",
  ratingMessage: "",
  isDefault: false,
  token: "",
  status: "OPENING",
  provider: "beta",
  expiresInactiveMessage: "",
  expiresTicket: 0,
  timeUseBotQueues: 0,
  maxUseBotQueues: 3,
  timeToTransfer: ""
};

const WhatsAppModal = ({ open, onClose, whatsAppId, onSave }) => {
  const classes = useStyles();
  const [whatsApp, setWhatsApp] = useState(initialState);
  const [selectedQueueIds, setSelectedQueueIds] = useState([]);
  const [selectedQueueId, setSelectedQueueId] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [prompts, setPrompts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para las pestañas
  const [activeTab, setActiveTab] = useState(0);
  const [tabStates, setTabStates] = useState({
    chatbotEnabled: true,      // Por defecto ACTIVADO
    transfersEnabled: true,    // Por defecto ACTIVADO
    inactivityEnabled: true    // Por defecto ACTIVADO
  });

  // ✅ MEJORAR CARGA DE DATOS
  useEffect(() => {
    const fetchSession = async () => {
      if (!whatsAppId) return;

      try {
        setIsLoading(true);
        const { data } = await api.get(`whatsapp/${whatsAppId}?session=0`);
        
        // ✅ Asegurar que no haya valores null en los campos
        const sanitizedData = {
          ...initialState,
          ...data,
          name: data.name || '',
          greetingMessage: data.greetingMessage || '',
          complationMessage: data.complationMessage || '',
          outOfHoursMessage: data.outOfHoursMessage || '',
          ratingMessage: data.ratingMessage || '',
          token: data.token || '',
          status: data.status || 'OPENING',
          provider: data.provider || 'beta',
          expiresInactiveMessage: data.expiresInactiveMessage || '',
          expiresTicket: data.expiresTicket || 0,
          timeUseBotQueues: data.timeUseBotQueues || 0,
          maxUseBotQueues: data.maxUseBotQueues || 3,
          isDefault: data.isDefault || false,
          timeToTransfer: data.timeToTransfer || ''
        };
        setWhatsApp(sanitizedData);

        // ✅ CARGAR DEPARTAMENTOS CORRECTAMENTE PARA SELECCIÓN ÚNICA
        const whatsQueueIds = data.queues?.map((queue) => queue.id) || [];
        const singleQueueId = whatsQueueIds.length > 0 ? whatsQueueIds[0] : null;
        setSelectedQueueIds(singleQueueId || '');
        setSelectedQueueId(data.transferQueueId || '');
        
        // ✅ CARGAR CORRECTAMENTE EL PROMPT ID
        if (data.promptId) {
          setSelectedPrompt(data.promptId);
        } else {
          setSelectedPrompt('');
        }

        // ✅ DETERMINAR ESTADO DE LAS PESTAÑAS BASADO EN DATOS EXISTENTES
        const newTabStates = {
          chatbotEnabled: !(data.greetingMessage || data.complationMessage || data.outOfHoursMessage || data.ratingMessage),
          transfersEnabled: !(data.timeToTransfer && data.transferQueueId),
          inactivityEnabled: !(data.expiresTicket && data.expiresInactiveMessage)
        };
        setTabStates(newTabStates);

      } catch (err) {
        console.error("❌ ERROR AL CARGAR DATOS:", err);
        toastError(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSession();
  }, [whatsAppId]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/prompt");
        setPrompts(data.prompts);
      } catch (err) {
        toastError(err);
      }
    })();
  }, [whatsAppId]);

  // ✅ MANEJAR CAMBIO DE PESTAÑA
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // ✅ MANEJAR CAMBIO DE ESTADO DE CHECKBOXES
  const handleCheckboxChange = (field, checked) => {
    setTabStates(prev => ({
      ...prev,
      [field]: checked
    }));

    // ✅ LIMPIAR CAMPOS SI SE ACTIVA EL CHECKBOX
    if (checked) {
      if (field === 'chatbotEnabled') {
        setWhatsApp(prev => ({
          ...prev,
          greetingMessage: '',
          complationMessage: '',
          outOfHoursMessage: '',
          ratingMessage: ''
        }));
      } else if (field === 'transfersEnabled') {
        setWhatsApp(prev => ({
          ...prev,
          timeToTransfer: ''
        }));
        setSelectedQueueId('');
      } else if (field === 'inactivityEnabled') {
        setWhatsApp(prev => ({
          ...prev,
          expiresTicket: 0,
          expiresInactiveMessage: ''
        }));
      }
    }
  };

  const handleSaveWhatsApp = async (values) => {
    try {
      setIsLoading(true);
      
      // ✅ VALIDACIÓN MEJORADA: Solo requerir nombre y estatus para conexión básica
      let currentQueueIds = selectedQueueIds;
      let currentPrompt = selectedPrompt;
      
      // ✅ FORZAR LIMPIEZA ANTES DE VALIDAR
      if (currentQueueIds && currentQueueIds !== null && currentQueueIds !== "" && 
          (Array.isArray(currentQueueIds) ? currentQueueIds.length > 0 : currentQueueIds > 0)) {
        currentPrompt = '';
      }
      if (currentPrompt && currentPrompt !== null && currentPrompt !== "") {
        currentQueueIds = [];
      }
      
      // ✅ VALIDACIÓN MEJORADA: Solo requerir nombre y estatus para conexión básica
      const hasDepartment = currentQueueIds && currentQueueIds !== null && currentQueueIds !== "" && 
                           (Array.isArray(currentQueueIds) ? currentQueueIds.length > 0 : currentQueueIds > 0);
      const hasPrompt = currentPrompt && currentPrompt !== null && currentPrompt !== "";
      
      console.log("🔍 VALIDACIÓN FINAL - Departamento:", hasDepartment, "Prompt:", hasPrompt);
      
      // ✅ PERMITIR CONEXIONES BÁSICAS SIN DEPARTAMENTOS NI PROMPTS
      // Solo validar que NO se seleccionen ambos simultáneamente
      if (hasDepartment && hasPrompt) {
        toast.error("❌ Error: No puedes seleccionar departamento y prompt simultáneamente. Selecciona solo uno.");
        setIsLoading(false);
        return;
      }
      
      // ✅ ELIMINAR VALIDACIÓN OBLIGATORIA DE DEPARTAMENTO/PROMPT
      // Una conexión puede existir solo con nombre y estatus
      // if (!hasDepartment && !hasPrompt) {
      //   toast.error("❌ Error: Debes seleccionar un departamento O un prompt para continuar.");
      //   setIsLoading(false);
      //   return;
      // }

      // ✅ VALIDAR CAMPOS OBLIGATORIOS SEGÚN ESTADO DE CHECKBOXES
      if (!tabStates.chatbotEnabled) {
        if (!values.greetingMessage && !values.complationMessage && !values.outOfHoursMessage && !values.ratingMessage) {
          toast.error("❌ Error: Si desactivas Chatbot Inicial, debes configurar al menos un mensaje.");
          setIsLoading(false);
          return;
        }
      }

      if (!tabStates.transfersEnabled) {
        if (!values.timeToTransfer || !selectedQueueId) {
          toast.error("❌ Error: Si desactivas Transferencias, debes configurar tiempo y departamento destino.");
          setIsLoading(false);
          return;
        }
      }

      if (!tabStates.inactivityEnabled) {
        if (!values.expiresTicket || !values.expiresInactiveMessage) {
          toast.error("❌ Error: Si desactivas Cierre por Inactividad, debes configurar tiempo y mensaje.");
          setIsLoading(false);
          return;
        }
      }
      
      // ✅ PREPARAR DATOS CORRECTAMENTE
      const whatsappData = {
        ...values, 
        queueIds: hasDepartment ? (Array.isArray(currentQueueIds) ? currentQueueIds : [currentQueueIds]) : [],
        transferQueueId: selectedQueueId,
        promptId: hasPrompt ? currentPrompt : null,
        timeToTransfer: selectedQueueId ? values.timeToTransfer : null,
        // ✅ LIMPIAR CAMPOS SI LOS CHECKBOXES ESTÁN ACTIVADOS
        greetingMessage: tabStates.chatbotEnabled ? '' : values.greetingMessage,
        complationMessage: tabStates.chatbotEnabled ? '' : values.complationMessage,
        outOfHoursMessage: tabStates.chatbotEnabled ? '' : values.outOfHoursMessage,
        ratingMessage: tabStates.chatbotEnabled ? '' : values.ratingMessage,
        expiresTicket: tabStates.inactivityEnabled ? 0 : values.expiresTicket,
        expiresInactiveMessage: tabStates.inactivityEnabled ? '' : values.expiresInactiveMessage
      };
      
      console.log("📤 DATOS A ENVIAR:", whatsappData);
      
      delete whatsappData["queues"];
      delete whatsappData["session"];

      if (whatsAppId) {
        await api.put(`/whatsapp/${whatsAppId}`, whatsappData);
      } else {
        await api.post("/whatsapp", whatsappData);
      }
      
      toast.success(i18n.t("whatsappModal.success"));
      
      if (onSave) {
        onSave();
      }
      
      handleClose();
    } catch (err) {
      console.error("❌ ERROR AL GUARDAR:", err);
      toastError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeQueue = (e) => {
    console.log("🔄 CAMBIO DE DEPARTAMENTO:", e);
    
    if (e && e !== null && e !== "" && e !== 0) {
      setSelectedPrompt('');
      setSelectedQueueIds(e);
      console.log("✅ Prompt limpiado y departamento establecido:", e);
    } else if (!e || e === null || e === "" || e === 0) {
      setSelectedPrompt('');
      setSelectedQueueIds(e);
      console.log("✅ Prompt limpiado y departamento deseleccionado");
    }
  };

  const handleChangePrompt = (e) => {
    console.log("🔄 CAMBIO DE PROMPT:", e.target.value);
    
    if (e.target.value && e.target.value !== null && e.target.value !== "") {
      setSelectedQueueIds([]);
      setSelectedPrompt(e.target.value);
      console.log("✅ Departamentos limpiados y prompt establecido:", e.target.value);
    } else if (!e.target.value || e.target.value === null || e.target.value === "") {
      setSelectedQueueIds([]);
      setSelectedPrompt(e.target.value);
      console.log("✅ Departamentos limpiados y prompt deseleccionado");
    }
  };

  const handleClose = () => {
    onClose();
    setWhatsApp(initialState);
    setSelectedQueueId('');
    setSelectedQueueIds([]);
    setSelectedPrompt('');
    setIsLoading(false);
    setActiveTab(0);
    setTabStates({
      chatbotEnabled: true,
      transfersEnabled: true,
      inactivityEnabled: true
    });
  };

  return (
    <div className={classes.root}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        scroll="paper"
        disableEnforceFocus
        disableAutoFocus
      >
        <DialogTitle>
          {whatsAppId
            ? i18n.t("whatsappModal.title.edit")
            : i18n.t("whatsappModal.title.add")}
        </DialogTitle>
        
        <Formik
          initialValues={{
            ...whatsApp,
            name: whatsApp.name || '',
            greetingMessage: whatsApp.greetingMessage || '',
            complationMessage: whatsApp.complationMessage || '',
            outOfHoursMessage: whatsApp.outOfHoursMessage || '',
            ratingMessage: whatsApp.ratingMessage || '',
            token: whatsApp.token || '',
            status: whatsApp.status || 'OPENING',
            provider: whatsApp.provider || 'beta',
            expiresInactiveMessage: whatsApp.expiresInactiveMessage || '',
            expiresTicket: whatsApp.expiresTicket || 0,
            timeUseBotQueues: whatsApp.timeUseBotQueues || 0,
            maxUseBotQueues: whatsApp.maxUseBotQueues || 3,
            isDefault: whatsApp.isDefault || false,
            timeToTransfer: selectedQueueId ? (whatsApp.timeToTransfer || '') : ''
          }}
          enableReinitialize={true}
          validationSchema={SessionSchema}
          onSubmit={(values, actions) => {
            setTimeout(() => {
              handleSaveWhatsApp(values);
              actions.setSubmitting(false);
            }, 400);
          }}
        >
          {({ values, touched, errors, isSubmitting }) => (
            <Form>
              <DialogContent dividers>
                {/* ✅ PESTAÑAS DE NAVEGACIÓN */}
                <Paper square>
                  <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    indicatorColor="primary"
                    textColor="primary"
                    aria-label="Configuración de WhatsApp"
                  >
                    <Tab label="Conexión" />
                    <Tab label="Chatbot Inicial" />
                    <Tab label="Transferencias" />
                  </Tabs>
                </Paper>

                {/* ✅ PESTAÑA 1: CONEXIÓN */}
                <TabPanel value={activeTab} index={0} className={classes.tabPanel}>
                  <div className={classes.sectionHeader}>
                    <Typography variant="h6" color="primary">
                      <span role="img" aria-label="conexión">🔌</span> Configuración de Conexión
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Configuración básica de la conexión de WhatsApp
                    </Typography>
                  </div>

                  <div className={classes.tabContent}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Field
                          as={TextField}
                          label={i18n.t("whatsappModal.form.name")}
                          autoFocus
                          name="name"
                          value={values.name || ''}
                          error={touched.name && Boolean(errors.name)}
                          helperText={touched.name && errors.name}
                          variant="outlined"
                          margin="dense"
                          fullWidth
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Field
                          as={TextField}
                          label="Token (Opcional)"
                          name="token"
                          value={values.token || ''}
                          variant="outlined"
                          margin="dense"
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl variant="outlined" margin="dense" fullWidth>
                          <InputLabel>Status</InputLabel>
                          <Field
                            as={Select}
                            name="status"
                            value={values.status || 'OPENING'}
                            label="Status"
                            required
                          >
                            <MenuItem value="OPENING">Abriendo</MenuItem>
                            <MenuItem value="CONNECTED">Conectado</MenuItem>
                            <MenuItem value="DISCONNECTED">Desconectado</MenuItem>
                          </Field>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Field
                              as={Switch}
                              color="primary"
                              name="isDefault"
                              checked={values.isDefault}
                            />
                          }
                          label={i18n.t("whatsappModal.form.default")}
                        />
                      </Grid>
                    </Grid>

                    <div className={classes.fieldGroup}>
                      <QueueSelect
                        selectedQueueIds={selectedQueueIds}
                        onChange={(selectedIds) => handleChangeQueue(selectedIds)}
                        multiple={false}
                        title="Departamentos (Opcional)"
                      />
                    </div>

                    <div className={classes.fieldGroup}>
                      <FormControl margin="dense" variant="outlined" fullWidth>
                        <InputLabel>
                          {i18n.t("whatsappModal.form.prompt")} (Opcional)
                        </InputLabel>
                        <Select
                          labelId="dialog-select-prompt-label"
                          id="dialog-select-prompt"
                          name="promptId"
                          value={selectedPrompt || ""}
                          onChange={handleChangePrompt}
                          label={i18n.t("whatsappModal.form.prompt")}
                          fullWidth
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
                        >
                          <MenuItem value="">
                            Ninguna
                          </MenuItem>
                          {prompts.map((prompt) => (
                            <MenuItem
                              key={prompt.id}
                              value={prompt.id}
                            >
                              {prompt.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>

                    {/* ✅ INFORMACIÓN SOBRE LÓGICA DE EXCLUSIVIDAD */}
                    <div style={{ 
                      background: '#e3f2fd', 
                      padding: '12px', 
                      borderRadius: '6px', 
                      marginTop: '16px',
                      border: '1px solid #2196f3',
                      borderLeft: '4px solid #2196f3'
                    }}>
                      <p style={{ 
                        color: '#1565c0', 
                        fontSize: '12px', 
                        margin: '0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span role="img" aria-label="información">ℹ️</span>
                        <strong>Configuración flexible:</strong> Los departamentos y prompts son <strong>opcionales</strong>. 
                        Puedes crear una conexión básica solo con nombre y estatus, o configurar departamentos O prompts según tus necesidades.
                      </p>
                    </div>

                    {/* ✅ INFORMACIÓN SOBRE CAMPOS OBLIGATORIOS */}
                    <div style={{ 
                      background: '#f3e5f5', 
                      padding: '12px', 
                      borderRadius: '6px', 
                      marginTop: '12px',
                      border: '1px solid #9c27b0',
                      borderLeft: '4px solid #9c27b0'
                    }}>
                      <p style={{ 
                        color: '#6a1b9a', 
                        fontSize: '12px', 
                        margin: '0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span role="img" aria-label="campos obligatorios">📋</span>
                        <strong>Campos obligatorios:</strong> Solo <strong>Nombre</strong> y <strong>Estatus</strong> son requeridos para crear una conexión. 
                        El resto de configuraciones son opcionales y se pueden configurar después.
                      </p>
                    </div>
                  </div>
                </TabPanel>

                {/* ✅ PESTAÑA 2: CHATBOT INICIAL */}
                <TabPanel value={activeTab} index={1} className={classes.tabPanel}>
                  <div className={classes.checkboxSection}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={tabStates.chatbotEnabled}
                          onChange={(e) => handleCheckboxChange('chatbotEnabled', e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Typography variant="h6" color="primary">
                          <span role="img" aria-label="robot">🤖</span> Activar Chatbot Inicial
                        </Typography>
                      }
                    />
                    <Typography variant="body2" color="textSecondary" style={{ marginLeft: 24 }}>
                      {tabStates.chatbotEnabled 
                        ? "Chatbot inicial desactivado - Los mensajes automáticos están habilitados para edición"
                        : "Chatbot inicial activado - Los mensajes automáticos están deshabilitados y se mantendrán vacíos"
                      }
                    </Typography>
                  </div>

                  {!tabStates.chatbotEnabled && (
                    <div className={classes.tabContent}>
                      <div className={classes.fieldGroup}>
                        <Field
                          as={TextField}
                          label={i18n.t("queueModal.form.greetingMessage")}
                          type="greetingMessage"
                          multiline
                          rows={4}
                          fullWidth
                          name="greetingMessage"
                          value={values.greetingMessage || ''}
                          error={touched.greetingMessage && Boolean(errors.greetingMessage)}
                          helperText={touched.greetingMessage && errors.greetingMessage}
                          variant="outlined"
                          margin="dense"
                          required
                        />
                      </div>

                      <div className={classes.fieldGroup}>
                        <Field
                          as={TextField}
                          label={i18n.t("queueModal.form.complationMessage")}
                          type="complationMessage"
                          multiline
                          rows={4}
                          fullWidth
                          name="complationMessage"
                          value={values.complationMessage || ''}
                          error={touched.complationMessage && Boolean(errors.complationMessage)}
                          helperText={touched.complationMessage && errors.complationMessage}
                          variant="outlined"
                          margin="dense"
                        />
                      </div>

                      <div className={classes.fieldGroup}>
                        <Field
                          as={TextField}
                          label={i18n.t("queueModal.form.outOfHoursMessage")}
                          type="outOfHoursMessage"
                          multiline
                          rows={4}
                          fullWidth
                          name="outOfHoursMessage"
                          value={values.outOfHoursMessage || ''}
                          error={touched.outOfHoursMessage && Boolean(errors.outOfHoursMessage)}
                          helperText={touched.outOfHoursMessage && errors.outOfHoursMessage}
                          variant="outlined"
                          margin="dense"
                        />
                      </div>

                      <div className={classes.fieldGroup}>
                        <Field
                          as={TextField}
                          label={i18n.t("queueModal.form.ratingMessage")}
                          type="ratingMessage"
                          multiline
                          rows={4}
                          fullWidth
                          name="ratingMessage"
                          value={values.ratingMessage || ''}
                          error={touched.ratingMessage && Boolean(errors.ratingMessage)}
                          helperText={touched.ratingMessage && errors.ratingMessage}
                          variant="outlined"
                          margin="dense"
                        />
                      </div>
                    </div>
                  )}
                </TabPanel>

                {/* ✅ PESTAÑA 3: TRANSFERENCIAS */}
                <TabPanel value={activeTab} index={2} className={classes.tabPanel}>
                  {/* ✅ AGRUPACIÓN 1: TRANSFERENCIAS POR TIEMPO */}
                  <div className={classes.checkboxSection}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={tabStates.transfersEnabled}
                          onChange={(e) => handleCheckboxChange('transfersEnabled', e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Typography variant="h6" color="primary">
                          <span role="img" aria-label="transferencia">🔄</span> Activar Transferencias por Tiempo
                        </Typography>
                      }
                    />
                    <Typography variant="body2" color="textSecondary" style={{ marginLeft: 24 }}>
                      {tabStates.transfersEnabled 
                        ? "Transferencias por tiempo desactivadas - Los campos están habilitados para edición"
                        : "Transferencias por tiempo activadas - Los campos están deshabilitados y se mantendrán vacíos"
                      }
                    </Typography>
                  </div>

                  {!tabStates.transfersEnabled && (
                    <div className={classes.tabContent}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Field
                            fullWidth
                            type="number"
                            as={TextField}
                            label={<span><span role="img" aria-label="cronómetro">⏱️</span> Minutos para transferir</span>}
                            name="timeToTransfer"
                            value={values.timeToTransfer || ''}
                            error={touched.timeToTransfer && Boolean(errors.timeToTransfer)}
                            helperText={(touched.timeToTransfer && errors.timeToTransfer) || "Ej: 30 = transferir después de 30 minutos"}
                            variant="outlined"
                            margin="dense"
                            required
                            inputProps={{ min: 1, step: 1 }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <QueueSelect
                            selectedQueueIds={selectedQueueId}
                            onChange={(selectedId) => {
                              setSelectedQueueId(selectedId)
                              if (!selectedId) {
                                setWhatsApp(prev => ({ ...prev, timeToTransfer: '' }));
                              }
                            }}
                            multiple={false}
                            title={<span><span role="img" aria-label="diana">🎯</span> Departamento destino</span>}
                            required
                          />
                        </Grid>
                      </Grid>
                    </div>
                  )}

                  {/* ✅ AGRUPACIÓN 2: CIERRE POR INACTIVIDAD */}
                  <div className={classes.checkboxSection} style={{ marginTop: '24px' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={tabStates.inactivityEnabled}
                          onChange={(e) => handleCheckboxChange('inactivityEnabled', e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Typography variant="h6" color="primary">
                          <span role="img" aria-label="reloj">⏰</span> Activar Cierre por Inactividad
                        </Typography>
                      }
                    />
                    <Typography variant="body2" color="textSecondary" style={{ marginLeft: 24 }}>
                      {tabStates.inactivityEnabled 
                        ? "Cierre por inactividad desactivado - Los campos están habilitados para edición"
                        : "Cierre por inactividad activado - Los campos están deshabilitados y se mantendrán vacíos"
                      }
                    </Typography>
                  </div>

                  {!tabStates.inactivityEnabled && (
                    <div className={classes.tabContent}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Field
                            fullWidth
                            type="number"
                            as={TextField}
                            label={<span><span role="img" aria-label="reloj">⏰</span> Cerrar chats abiertos después de X minutos</span>}
                            name="expiresTicket"
                            value={values.expiresTicket || ''}
                            variant="outlined"
                            margin="dense"
                            error={touched.expiresTicket && Boolean(errors.expiresTicket)}
                            helperText={(touched.expiresTicket && errors.expiresTicket) || "Ej: 60 = cerrar después de 60 minutos de inactividad"}
                            required
                            inputProps={{ min: 1, step: 1 }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Field
                            as={TextField}
                            label={<span><span role="img" aria-label="mensaje">💬</span> Mensaje de cierre por inactividad</span>}
                            multiline
                            rows={2}
                            fullWidth
                            name="expiresInactiveMessage"
                            value={values.expiresInactiveMessage || ''}
                            error={touched.expiresInactiveMessage && Boolean(errors.expiresInactiveMessage)}
                            helperText={(touched.expiresInactiveMessage && errors.expiresInactiveMessage) || "Mensaje que se envía antes de cerrar el chat por inactividad"}
                            variant="outlined"
                            margin="dense"
                            required
                          />
                        </Grid>
                      </Grid>
                    </div>
                  )}
                </TabPanel>
              </DialogContent>

              {/* ✅ BOTONES FUERA DE LAS PESTAÑAS */}
              <DialogActions>
                <Button
                  onClick={handleClose}
                  color="secondary"
                  disabled={isSubmitting || isLoading}
                  variant="outlined"
                >
                  {i18n.t("whatsappModal.buttons.cancel")}
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  disabled={isSubmitting || isLoading}
                  variant="contained"
                  className={classes.btnWrapper}
                >
                  {whatsAppId
                    ? i18n.t("whatsappModal.buttons.okEdit")
                    : i18n.t("whatsappModal.buttons.okAdd")}
                  {((isSubmitting || isLoading)) && (
                    <CircularProgress
                      size={24}
                      className={classes.buttonProgress}
                    />
                  )}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </div>
  );
};

export default React.memo(WhatsAppModal);
