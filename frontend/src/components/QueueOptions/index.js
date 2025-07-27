import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Stepper from "@material-ui/core/Stepper";
import Step from "@material-ui/core/Step";
import StepLabel from "@material-ui/core/StepLabel";
import Typography from "@material-ui/core/Typography";
import { Button, Grid, IconButton, StepContent, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel } from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import SaveIcon from "@material-ui/icons/Save";
import EditIcon from "@material-ui/icons/Edit";
import LinkIcon from "@material-ui/icons/Link";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AttachFile, DeleteOutline } from "@material-ui/icons";
import { head } from "lodash";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    //height: 400,
    [theme.breakpoints.down("sm")]: {
      maxHeight: "20vh",
    },
  },
  button: {
    marginRight: theme.spacing(1),
  },
  input: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  addButton: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
}));

export function QueueOptionStepper({ queueId, options, updateOptions }) {
  const classes = useStyles();
  const [activeOption, setActiveOption] = useState(-1);
  const [attachment, setAttachment] = useState(null);
  const attachmentFile = useRef(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedOptionForTransfer, setSelectedOptionForTransfer] = useState(null);
  const [queues, setQueues] = useState([]);


  // ✅ CARGAR DEPARTAMENTOS PARA TRANSFERENCIA
  const loadQueues = async () => {
    try {
      const { data } = await api.get("/queue");
      setQueues(data);
    } catch (e) {
      toastError(e);
    }
  };

  // ✅ ABRIR MODAL DE TRANSFERENCIA
  const openTransferModal = (option) => {
    setSelectedOptionForTransfer(option);
    setTransferModalOpen(true);
    loadQueues();
  };

  // ✅ ELIMINAR TRANSFERENCIA
  const handleRemoveTransfer = async (option) => {
    try {
      const optionToUpdate = { ...option, transferQueueId: null };
      
      await api.request({
        url: `/queue-options/${optionToUpdate.id}`,
        method: "PUT",
        data: optionToUpdate,
      });
      
      // ✅ ACTUALIZAR LA OPCIÓN EN EL ARRAY LOCAL
      const optionIndex = options.findIndex(opt => opt.id === optionToUpdate.id);
      if (optionIndex !== -1) {
        options[optionIndex] = optionToUpdate;
      }
      
      updateOptions();
      toastError("Transferencia eliminada correctamente");
    } catch (e) {
      toastError(e);
    }
  };

  // ✅ GUARDAR TRANSFERENCIA EN ESTADO TEMPORAL
  const handleSaveTransfer = async (transferQueueId) => {
    try {
      let optionToUpdate = { ...selectedOptionForTransfer, transferQueueId };
      
      // ✅ NO GUARDAR EN DB, SOLO MANTENER EN MEMORIA
      const optionIndex = options.findIndex(opt => opt === selectedOptionForTransfer);
      if (optionIndex !== -1) {
        options[optionIndex] = optionToUpdate;
      }
      
      setTransferModalOpen(false);
      setSelectedOptionForTransfer(null);
      updateOptions();
      
      // ✅ MOSTRAR MENSAJE TEMPORAL
      toastError("Transferencia configurada temporalmente. Presiona 'AGREGAR' para guardar el departamento completo.");
    } catch (e) {
      toastError(e);
    }
  };

  const handleOption = (index) => async () => {
    setActiveOption(index);
    const option = options[index];

    if (option !== undefined && option.id !== undefined) {
      try {
        const { data } = await api.request({
          url: "/queue-options",
          method: "GET",
          params: { queueId, parentId: option.id },
        });
        const optionList = data.map((option) => {
          return {
            ...option,
            children: [],
            edition: false,
          };
        });
        option.children = optionList;
        updateOptions();
      } catch (e) {
        toastError(e);
      }
    }
  };

  // ✅ GUARDAR OPCIÓN EN ESTADO TEMPORAL (NO EN DB)
  const handleSave = async (option) => {
    try {
      console.log("🔍 ANTES - option.queueId:", option.queueId);
      console.log("🔍 ANTES - queueId del componente:", queueId);
      
      // ✅ Verificar que tengamos queueId válido
      if (!queueId) {
        console.log("⚠️ No hay queueId - guardando temporalmente en memoria");
        option.edition = false;
        updateOptions();
        toastError("Opción guardada temporalmente. Guarde el departamento primero.");
        return;
      }
      
      // ✅ Asegurar que tenga queueId
      if (!option.queueId) {
        option.queueId = queueId;
        console.log("🔧 Asignando queueId:", queueId);
      }
      
      console.log("🔍 DESPUÉS - option.queueId:", option.queueId);
      console.log("🔍 DESPUÉS - datos a enviar:", option);
      
      if (option.id) {
        await api.request({
          url: `/queue-options/${option.id}`,
          method: "PUT",
          data: option,
        });
      } else {
        const { data } = await api.request({
          url: `/queue-options`,
          method: "POST",
          data: option,
        });
        option.id = data.id;
      }
      
      option.edition = false;
      updateOptions();
      toastError("Opción guardada correctamente.");
    } catch (e) {
      console.error("❌ Error al guardar:", e);
      toastError(e);
    }
  };



  const handleEdition = (index) => {
    options[index].edition = !options[index].edition;
    updateOptions();
  };

  const handleDeleteOption = async (index) => {
    const option = options[index];
    if (option !== undefined && option.id !== undefined) {
      try {
        await api.request({
          url: `/queue-options/${option.id}`,
          method: "DELETE",
        });
      } catch (e) {
        toastError(e);
      }
    }
    options.splice(index, 1);
    options.forEach(async (option, order) => {
      option.option = order + 1;
      await handleSave(option);
    });
    updateOptions();
  };

  const handleAttachmentFile = (e) => {
    const file = head(e.target.files);
    if (file) {
      setAttachment(file);
    }
  };

  const handleOptionChangeTitle = (event, index) => {
    options[index].title = event.target.value;
    updateOptions();
  };

  const handleOptionChangeMessage = (event, index) => {
    options[index].message = event.target.value;
    updateOptions();
  };

  const renderTitle = (index) => {
    const option = options[index];
    if (option.edition) {
      return (
        <>
          <TextField
            value={option.title}
            onChange={(event) => handleOptionChangeTitle(event, index)}
            size="small"
            className={classes.input}
            placeholder={i18n.t("queueOptions.placeholder.title")}
          />
                    <div style={{ display: "none" }}>
            <input
              type="file"
              ref={attachmentFile}
              onChange={(e) => handleAttachmentFile(e)}
            />
          </div>
          {option.edition && (
            <>
              <IconButton
                color="primary"
                variant="outlined"
                size="small"
                className={classes.button}
                onClick={() => handleSave(option)}
              >
                <SaveIcon />
              </IconButton>
              <IconButton
                variant="outlined"
                color="secondary"
                size="small"
                className={classes.button}
                onClick={() => handleDeleteOption(index)}
              >
                <DeleteOutlineIcon />
              </IconButton>
              {!attachment && !option.mediaPath && (
                <IconButton
                  variant="outlined"
                  color="primary"
                  size="small"
                  className={classes.button}
                    onClick={() => attachmentFile.current.click()}
                  >
                  <AttachFile/>
                </IconButton>
              )}
                             {(option.mediaPath || attachment) && (
                    <Grid xs={12} item>
                      <Button startIcon={<AttachFile />}>
                        {attachment != null
                          ? attachment.name
                          : option.mediaName}
                      </Button>
                      
                        <IconButton
                          color="secondary"
                        >
                          <DeleteOutline />
                        </IconButton>
                    </Grid>
                  )}
              
              {/* ✅ ICONO DE TRANSFERENCIA DENTRO DEL MODO EDICIÓN - TEMPORALMENTE COMENTADO
              <IconButton
                variant="outlined"
                size="small"
                className={classes.button}
                onClick={() => openTransferModal(option)}
                style={{ 
                  color: option.transferQueueId ? 'green' : 'gray',
                  marginLeft: '5px'
                }}
                title="Configurar transferencia de departamento"
              >
                <LinkIcon />
              </IconButton>
              */}
              
              {/* ✅ INDICADOR DE TRANSFERENCIA CONFIGURADA */}
              {option.transferQueueId && (
                <>
                  {/* Buscar el nombre del departamento destino */}
                  {(() => {
                    const transferQueue = queues.find(q => q.id === option.transferQueueId);
                    return transferQueue ? (
                      <Typography
                        variant="body2"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          marginLeft: '8px',
                          color: 'green',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                        onClick={() => openTransferModal(option)}
                        title="Click para editar transferencia"
                      >
                        → {transferQueue.name}
                      </Typography>
                    ) : null;
                  })()}
                  
                  {/* ✅ BOTÓN EDITAR TRANSFERENCIA */}
                  <IconButton
                    size="small"
                    className={classes.button}
                    onClick={() => openTransferModal(option)}
                    style={{ 
                      color: 'blue',
                      marginLeft: '4px'
                    }}
                    title="Editar transferencia"
                  >
                    <EditIcon />
                  </IconButton>
                  
                  {/* ✅ BOTÓN ELIMINAR TRANSFERENCIA */}
                  <IconButton
                    size="small"
                    className={classes.button}
                    onClick={() => handleRemoveTransfer(option)}
                    style={{ 
                      color: 'red',
                      marginLeft: '2px'
                    }}
                    title="Eliminar transferencia"
                  >
                    <DeleteOutlineIcon />
                  </IconButton>
                </>
              )}
            </>
          )}
        </>
      );
    }
    return (
      <>
        <Typography>
          {option.title !== "" ? option.title : i18n.t("queueOptions.undefinedTitle")}
          <IconButton
            variant="outlined"
            size="small"
            className={classes.button}
            onClick={() => handleEdition(index)}
          >
            <EditIcon />
          </IconButton>
        </Typography>
      </>
    );
  };

  const renderMessage = (index) => {
    const option = options[index];
    if (option.edition) {
      return (
        <>
          <TextField
            style={{ width: "100%" }}
            multiline
            value={option.message}
            onChange={(event) => handleOptionChangeMessage(event, index)}
            size="small"
            className={classes.input}
            placeholder={i18n.t("queueOptions.placeholder.message")}
          />
        </>
      );
    }
    return (
      <>
        <Typography onClick={() => handleEdition(index)}>
          {option.message}
        </Typography>
      </>
    );
  };

  const handleAddOption = (index) => {
    // ✅ SOLO AGREGAR UNA OPCIÓN HIJA SIMPLE
    const optionNumber = options[index].children.length + 1;
    const newChildOption = {
      title: "",
      message: "",
      edition: false,
      option: optionNumber,
      queueId,
      parentId: options[index].id,
      children: [], // ✅ SIN HIJOS RECURSIVOS
    };
    
    
    options[index].children.push(newChildOption);
    updateOptions();
  };

  const renderStep = (option, index) => {
    return (
      <Step key={index}>
        <StepLabel style={{ cursor: "pointer" }} onClick={handleOption(index)}>
          {renderTitle(index)}
        </StepLabel>
        <StepContent>
          {renderMessage(index)}

          {option.id !== undefined && (
            <>
              <Button
                color="primary"
                size="small"
                onClick={() => handleAddOption(index)}
                startIcon={<AddIcon />}
                variant="outlined"
                className={classes.addButton}
              >
                {i18n.t("queueOptions.add")}
              </Button>
            </>
          )}
          {/* ✅ TEMPORALMENTE COMENTADO PARA EVITAR RECURSIVIDAD
          <QueueOptionStepper
            queueId={queueId}
            options={option.children}
            updateOptions={updateOptions}
          />
          */}
        </StepContent>
      </Step>
    );
  };

  const renderStepper = () => {
    return (
      <Stepper
        style={{ marginBottom: 0, paddingBottom: 0 }}
        nonLinear
        activeStep={activeOption}
        orientation="vertical"
      >
        {options.map((option, index) => renderStep(option, index))}
      </Stepper>
    );
  };

  return (
    <>
      {renderStepper()}
      
      {/* ✅ MODAL DE TRANSFERENCIA */}
      <Dialog open={transferModalOpen} onClose={() => setTransferModalOpen(false)}>
        <DialogTitle>
          🔗 Configurar Transferencia - {selectedOptionForTransfer?.title}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" style={{ marginBottom: '16px' }}>
            Selecciona el departamento destino para esta opción:
          </Typography>
          
          <FormControl fullWidth>
            <InputLabel>Departamento Destino</InputLabel>
            <Select
              value={selectedOptionForTransfer?.transferQueueId || ""}
              onChange={(e) => {
                const updatedOption = { ...selectedOptionForTransfer, transferQueueId: e.target.value };
                setSelectedOptionForTransfer(updatedOption);
              }}
            >
              <MenuItem value="">
                <em>-- Sin transferencia --</em>
              </MenuItem>
              {queues.map((queue) => (
                <MenuItem key={queue.id} value={queue.id}>
                  {queue.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferModalOpen(false)} color="secondary">
            Cancelar
          </Button>
          <Button 
            onClick={() => handleSaveTransfer(selectedOptionForTransfer?.transferQueueId)}
            color="primary"
            variant="contained"
          >
            Guardar Transferencia
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export const QueueOptions = forwardRef(({ queueId }, ref) => {
  const classes = useStyles();
  const [options, setOptions] = useState([]);

  useEffect(() => {
    console.log("🔄 useEffect ejecutado - queueId:", queueId);
    if (queueId) {
      const fetchOptions = async () => {
        try {
          console.log("📡 Cargando opciones para queueId:", queueId);
          const { data } = await api.request({
            url: "/queue-options",
            method: "GET",
            params: { queueId, parentId: -1 },
          });
          console.log("📥 Opciones recibidas:", data);
          const optionList = data.map((option) => {
            return {
              ...option,
              children: [],
              edition: false,
            };
          });
          console.log("✅ Opciones procesadas:", optionList);
          setOptions(optionList);
        } catch (e) {
          console.error("❌ Error al cargar opciones:", e);
          toastError(e);
        }
      };
      fetchOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderStepper = () => {
    if (options.length > 0) {
      return (
        <QueueOptionStepper
          queueId={queueId}
          updateOptions={updateOptions}
          options={options}
          saveAllOptions={saveAllOptions}
        />
      );
    }
  };

  const saveAllOptions = useCallback(async (savedQueueId) => {
    console.log("🔄 saveAllOptions - Guardando opciones temporales para queueId:", savedQueueId);
    
    // ✅ Guardar todas las opciones que no tienen ID (temporales)
    for (let option of options) {
      if (!option.id && option.title.trim() !== "") {
        try {
          console.log("💾 Guardando opción temporal:", option.title);
          const { data } = await api.request({
            url: `/queue-options`,
            method: "POST",
            data: {
              ...option,
              queueId: savedQueueId
            },
          });
          option.id = data.id;
          console.log("✅ Opción temporal guardada con ID:", data.id);
        } catch (e) {
          console.error("❌ Error al guardar opción temporal:", e);
        }
      }
    }
    
    console.log("✅ Todas las opciones temporales guardadas");
  }, [options]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateOptions = () => {
    setOptions([...options]);
  };



  const addOption = () => {
    console.log("➕ addOption - queueId:", queueId);
    
    const newOption = {
      title: "",
      message: "",
      edition: false,
      option: options.length + 1,
      queueId: queueId || null, // ✅ Permitir null temporalmente
      parentId: null,
      children: [],
    };
    console.log("➕ newOption creado:", newOption);
    setOptions([...options, newOption]);
  };

  // ✅ Exponer funciones al componente padre
  useImperativeHandle(ref, () => ({
    saveAllOptions
  }));

  return (
    <div className={classes.root}>
      <br />
      <Typography>
        {i18n.t("queueOptions.title")}
        <Button
          color="primary"
          size="small"
          onClick={addOption}
          startIcon={<AddIcon />}
          style={{ marginLeft: 10 }}
          variant="outlined"
        >
          {i18n.t("queueOptions.add")}
        </Button>
      </Typography>
      {renderStepper()}
    </div>
  );
});
