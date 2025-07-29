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
  InputLabel
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
    color: theme.palette.success.main, // Changed to success color
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
}));

const SessionSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Too Short!")
    .max(50, "Too Long!")
    .required("Required"),
});

const WhatsAppModal = ({ open, onClose, whatsAppId, onSave }) => {
  const classes = useStyles();

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
    //timeSendQueue: 0,
    //sendIdQueue: 0,
    expiresInactiveMessage: "",
    expiresTicket: 0,
    timeUseBotQueues: 0,
    maxUseBotQueues: 3
  };
  const [whatsApp, setWhatsApp] = useState(initialState);
  const [selectedQueueIds, setSelectedQueueIds] = useState([]);

  const [selectedQueueId, setSelectedQueueId] = useState(null)
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // ✅ MEJORAR CARGA DE DATOS
  useEffect(() => {
    const fetchSession = async () => {
      if (!whatsAppId) return;

      try {
        setIsLoading(true);
        		const { data } = await api.get(`whatsapp/${whatsAppId}?session=0`);
        
        setWhatsApp(data);

        // ✅ CARGAR DEPARTAMENTOS CORRECTAMENTE PARA SELECCIÓN ÚNICA
        const whatsQueueIds = data.queues?.map((queue) => queue.id) || [];
        
        // ✅ PARA SELECCIÓN ÚNICA, TOMAR SOLO EL PRIMER DEPARTAMENTO
        const singleQueueId = whatsQueueIds.length > 0 ? whatsQueueIds[0] : null;
        setSelectedQueueIds(singleQueueId);
		setSelectedQueueId(data.transferQueueId);
        
        // ✅ CARGAR CORRECTAMENTE EL PROMPT ID
        if (data.promptId) {
          setSelectedPrompt(data.promptId);
        } else {
          setSelectedPrompt(null);
        }
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



  const handleSaveWhatsApp = async (values) => {
    try {
      setIsLoading(true);
      
      // ✅ VALIDACIÓN: Verificar que solo uno esté seleccionado
      const hasDepartment = selectedQueueIds && selectedQueueIds !== null && selectedQueueIds !== "";
      const hasPrompt = selectedPrompt && selectedPrompt !== null;
      
      if (hasDepartment && hasPrompt) {
        toast.error("❌ Error: No puedes seleccionar departamento y prompt simultáneamente. Selecciona solo uno.");
        setIsLoading(false);
        return;
      }
      
      if (!hasDepartment && !hasPrompt) {
        toast.error("❌ Error: Debes seleccionar un departamento o un prompt.");
        setIsLoading(false);
        return;
      }
      

      
      // ✅ PREPARAR DATOS CORRECTAMENTE
      const whatsappData = {
        ...values, 
        queueIds: selectedQueueIds ? [selectedQueueIds] : [], // ✅ CONVERTIR A ARRAY
        transferQueueId: selectedQueueId,
        promptId: selectedPrompt ? selectedPrompt : null
      };
      delete whatsappData["queues"];
      delete whatsappData["session"];

      if (whatsAppId) {
        await api.put(`/whatsapp/${whatsAppId}`, whatsappData);
      } else {
        await api.post("/whatsapp", whatsappData);
      }
      
      toast.success(i18n.t("whatsappModal.success"));
      
      // ✅ AGREGAR CALLBACK PARA REFRESCAR CONEXIONES
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
    // ✅ VALIDACIÓN: Si se selecciona un departamento, limpiar prompt
    if (e && e !== null) {
      setSelectedPrompt(null);
    }
    
    // ✅ PARA SELECCIÓN ÚNICA, GUARDAR EL VALOR DIRECTO
    setSelectedQueueIds(e);
  };

  const handleChangePrompt = (e) => {
    // ✅ VALIDACIÓN: Si se selecciona un prompt, limpiar departamento
    if (e.target.value && e.target.value !== null) {
      setSelectedQueueIds(null);
    }
    
    setSelectedPrompt(e.target.value);
  };

  const handleClose = () => {
    onClose();
    setWhatsApp(initialState);
	  setSelectedQueueId(null);
    setSelectedQueueIds([]);
    setSelectedPrompt(null);
    setIsLoading(false);
  };



  return (
    <div className={classes.root}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>
          {whatsAppId
            ? i18n.t("whatsappModal.title.edit")
            : i18n.t("whatsappModal.title.add")}
        </DialogTitle>
        <Formik
          initialValues={whatsApp}
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
                <div className={classes.multFieldLine}>
                  <Grid spacing={2} container>
                    <Grid item>
                      <Field
                        as={TextField}
                        label={i18n.t("whatsappModal.form.name")}
                        autoFocus
                        name="name"
                        error={touched.name && Boolean(errors.name)}
                        helperText={touched.name && errors.name}
                        variant="outlined"
                        margin="dense"
                        className={classes.textField}
                      />
                    </Grid>
                    <Grid item>
                      <Field
                        as={TextField}
                        label="Token (Opcional)"
                        name="token"
                        variant="outlined"
                        margin="dense"
                        className={classes.textField}
                      />
                    </Grid>
                    <Grid item>
                      <FormControl variant="outlined" margin="dense" className={classes.textField}>
                        <InputLabel>Status</InputLabel>
                        <Field
                          as={Select}
                          name="status"
                          label="Status"
                        >
                          <MenuItem value="OPENING">Abriendo</MenuItem>
                          <MenuItem value="CONNECTED">Conectado</MenuItem>
                          <MenuItem value="DISCONNECTED">Desconectado</MenuItem>
                        </Field>
                      </FormControl>
                    </Grid>
                    <Grid style={{ paddingTop: 15 }} item>
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
                </div>
                <div>
                  <Field
                    as={TextField}
                    label={i18n.t("queueModal.form.greetingMessage")}
                    type="greetingMessage"
                    multiline
                    rows={4}
                    fullWidth
                    name="greetingMessage"
                    error={
                      touched.greetingMessage && Boolean(errors.greetingMessage)
                    }
                    helperText={
                      touched.greetingMessage && errors.greetingMessage
                    }
                    variant="outlined"
                    margin="dense"
                  />
                </div>
                <div>
                  <Field
                    as={TextField}
                    label={i18n.t("queueModal.form.complationMessage")}
                    type="complationMessage"
                    multiline
                    rows={4}
                    fullWidth
                    name="complationMessage"
                    error={
                      touched.complationMessage &&
                      Boolean(errors.complationMessage)
                    }
                    helperText={
                      touched.complationMessage && errors.complationMessage
                    }
                    variant="outlined"
                    margin="dense"
                  />
                </div>
                <div>
                  <Field
                    as={TextField}
                    label={i18n.t("queueModal.form.outOfHoursMessage")}
                    type="outOfHoursMessage"
                    multiline
                    rows={4}
                    fullWidth
                    name="outOfHoursMessage"
                    error={
                      touched.outOfHoursMessage &&
                      Boolean(errors.outOfHoursMessage)
                    }
                    helperText={
                      touched.outOfHoursMessage && errors.outOfHoursMessage
                    }
                    variant="outlined"
                    margin="dense"
                  />
                </div>
                <div>
                  <Field
                    as={TextField}
                    label={i18n.t("queueModal.form.ratingMessage")}
                    type="ratingMessage"
                    multiline
                    rows={4}
                    fullWidth
                    name="ratingMessage"
                    error={
                      touched.ratingMessage && Boolean(errors.ratingMessage)
                    }
                    helperText={touched.ratingMessage && errors.ratingMessage}
                    variant="outlined"
                    margin="dense"
                  />
                </div>
                <div>
                  <Field
                    as={TextField}
                    label={i18n.t("queueModal.form.token")}
                    type="token"
                    fullWidth
                    name="token"
                    variant="outlined"
                    margin="dense"
                  />
                </div>
                <QueueSelect
                  selectedQueueIds={selectedQueueIds}
                  onChange={(selectedIds) => handleChangeQueue(selectedIds)}
                  multiple={false}
                  title="Departamentos"
                />
                <FormControl
                  margin="dense"
                  variant="outlined"
                  fullWidth
                >
                  <InputLabel>
                    {i18n.t("whatsappModal.form.prompt")}
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
                <div>
                  <h3 style={{ color: '#2196f3', marginBottom: '8px' }}>
                    <span role="img" aria-label="transferencia automática">🔄</span> {i18n.t("whatsappModal.form.queueRedirection")} - TRANSFERENCIAS AUTOMÁTICAS
                  </h3>
                  <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
                    {i18n.t("whatsappModal.form.queueRedirectionDesc")}
                  </p>
                  
                  {/* ✅ SECCIÓN: TRANSFERENCIAS POR TIEMPO */}
                  <div style={{ 
                    background: '#f5f5f5', 
                    padding: '16px', 
                    borderRadius: '8px', 
                    marginBottom: '16px',
                    border: '1px solid #e0e0e0'
                  }}>
                    <h4 style={{ color: '#333', marginBottom: '8px' }}>
                      <span role="img" aria-label="reloj">⏰</span> Transferencia por Tiempo
                    </h4>
                    <p style={{ color: '#666', fontSize: '12px', marginBottom: '12px' }}>
                      Transferir tickets automáticamente después de X minutos sin respuesta
                    </p>
                    
                    <Grid container spacing={2}>
                      <Grid item sm={6}>
                        <Field
                          fullWidth
                          type="number"
                          as={TextField}
                          label={<span><span role="img" aria-label="cronómetro">⏱️</span> Minutos para transferir</span>}
                          name="timeToTransfer"
                          error={touched.timeToTransfer && Boolean(errors.timeToTransfer)}
                          helperText={(touched.timeToTransfer && errors.timeToTransfer) || "Ej: 30 = transferir después de 30 minutos"}
                          variant="outlined"
                          margin="dense"
                          className={classes.textField}
                          InputLabelProps={{ shrink: values.timeToTransfer ? true : false }}
                        />
                      </Grid>

                      <Grid item sm={6}>
                        <QueueSelect
                          selectedQueueIds={selectedQueueId}
                          onChange={(selectedId) => {
                            setSelectedQueueId(selectedId)
                          }}
                          multiple={false}
                          title={<span><span role="img" aria-label="diana">🎯</span> Departamento destino</span>}
                        />
                      </Grid>
                    </Grid>
                  </div>

                  {/* ✅ SECCIÓN: TRANSFERENCIAS INTELIGENTES */}
                  <div style={{ 
                    background: '#e8f5e8', 
                    padding: '16px', 
                    borderRadius: '8px', 
                    marginBottom: '16px',
                    border: '1px solid #c8e6c9'
                  }}>
                    <h4 style={{ color: '#2e7d32', marginBottom: '8px' }}>
                      <span role="img" aria-label="robot">🤖</span> Transferencias Inteligentes
                    </h4>
                    <p style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>
                      <strong>Automático:</strong> Los tickets se transfieren entre departamentos según el contenido del mensaje:
                    </p>
                    <ul style={{ color: '#666', fontSize: '12px', marginLeft: '20px', marginBottom: '8px' }}>
                      <li><span role="img" aria-label="gráfico creciente">📈</span> <strong>VENTAS:</strong> Palabras como "precio", "comprar", "oferta", "producto"</li>
                      <li><span role="img" aria-label="herramienta">🔧</span> <strong>SOPORTE:</strong> Palabras como "error", "problema", "ayuda", "técnico"</li>
                      <li><span role="img" aria-label="reloj">⏰</span> <strong>Tiempo:</strong> Sin respuesta por más de 30 minutos</li>
                    </ul>
                    <p style={{ color: '#2e7d32', fontSize: '11px', fontStyle: 'italic' }}>
                      <span role="img" aria-label="verificado">✅</span> Sistema activo automáticamente cuando hay múltiples departamentos configurados
                    </p>
                  </div>
                  <Grid spacing={2} container>
                    {/* ENCERRAR CHATS ABERTOS APÓS X HORAS */}
                    <Grid xs={12} md={12} item>
                      <Field
                        as={TextField}
                        label={i18n.t("whatsappModal.form.expiresTicket")}
                        fullWidth
                        name="expiresTicket"
                        variant="outlined"
                        margin="dense"
                        error={touched.expiresTicket && Boolean(errors.expiresTicket)}
                        helperText={touched.expiresTicket && errors.expiresTicket}
                      />
                    </Grid>
                  </Grid>
                  {/* MENSAGEM POR INATIVIDADE*/}
                  <div>
                    <Field
                      as={TextField}
                      label={i18n.t("whatsappModal.form.expiresInactiveMessage")}
                      multiline
                      rows={4}
                      fullWidth
                      name="expiresInactiveMessage"
                      error={touched.expiresInactiveMessage && Boolean(errors.expiresInactiveMessage)}
                      helperText={touched.expiresInactiveMessage && errors.expiresInactiveMessage}
                      variant="outlined"
                      margin="dense"
                    />
                  </div>
                </div>
              </DialogContent>
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
