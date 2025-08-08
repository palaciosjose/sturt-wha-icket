import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Stepper from "@material-ui/core/Stepper";
import Step from "@material-ui/core/Step";
import StepLabel from "@material-ui/core/StepLabel";
import Typography from "@material-ui/core/Typography";
import { Button, Grid, IconButton, StepContent, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from "@material-ui/core";
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
import TransferQueueModal from "../TransferQueueModal";

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
  const [deleteTransferModalOpen, setDeleteTransferModalOpen] = useState(false);
  const [optionToDeleteTransfer, setOptionToDeleteTransfer] = useState(null);
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
      // ✅ ABRIR MODAL DE CONFIRMACIÓN
      setOptionToDeleteTransfer(option);
      setDeleteTransferModalOpen(true);
    } catch (e) {
      toastError(e);
    }
  };

  const confirmDeleteTransfer = async () => {
    try {
      const option = optionToDeleteTransfer;
      
      const optionToUpdate = { 
        ...option, 
        transferQueueId: null,
        transferQueue: null // ✅ TAMBIÉN LIMPIAR EL OBJETO transferQueue
      };
      
      // ✅ GUARDAR TEMPORALMENTE EN MEMORIA
      const optionIndex = options.findIndex(opt => opt === option);
      if (optionIndex !== -1) {
        options[optionIndex] = optionToUpdate;
        updateOptions(); // ✅ ACTUALIZAR EL ESTADO
      }
      
      toastError("Transferencia eliminada correctamente");
      
      // ✅ CERRAR MODAL
      setDeleteTransferModalOpen(false);
      setOptionToDeleteTransfer(null);
    } catch (e) {
      toastError(e);
    }
  };

  const cancelDeleteTransfer = () => {
    setDeleteTransferModalOpen(false);
    setOptionToDeleteTransfer(null);
  };

  // ✅ GUARDAR TRANSFERENCIA EN ESTADO TEMPORAL
  const handleSaveTransfer = async (transferQueueId) => {
    try {
      // ✅ Buscar el departamento seleccionado para obtener sus datos completos
      const selectedQueue = queues.find(q => q.id === transferQueueId);
      
      let optionToUpdate = { 
        ...selectedOptionForTransfer, 
        transferQueueId,
        transferQueue: selectedQueue || null // ✅ ACTUALIZAR TAMBIÉN EL OBJETO transferQueue
      };
      
      // ✅ GUARDAR TEMPORALMENTE EN MEMORIA
      const optionIndex = options.findIndex(opt => opt === selectedOptionForTransfer);
      if (optionIndex !== -1) {
        options[optionIndex] = optionToUpdate;
        updateOptions(); // ✅ ACTUALIZAR EL ESTADO
      }
      
      // ✅ MOSTRAR MENSAJE DE CONFIRMACIÓN
      if (transferQueueId) {
        toastError(`Transferencia configurada: → ${selectedQueue?.name || 'Departamento'}`);
      } else {
        toastError("Transferencia eliminada");
      }
      
      setTransferModalOpen(false);
      setSelectedOptionForTransfer(null);
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
      // ✅ Verificar que tengamos queueId válido
      if (!queueId) {
        option.edition = false;
        updateOptions();
        toastError("Opción guardada temporalmente. Guarde el departamento primero.");
        return;
      }
      
      // ✅ Asegurar que tenga queueId
      if (!option.queueId) {
        option.queueId = queueId;
      }
      
      // ✅ Asegurar que transferQueueId se envíe correctamente
      const dataToSend = {
        ...option,
        transferQueueId: option.transferQueueId || null
      };
      
      if (option.id) {
        await api.request({
          url: `/queue-options/${option.id}`,
          method: "PUT",
          data: dataToSend,
        });
      } else {
        const { data } = await api.request({
          url: `/queue-options`,
          method: "POST",
          data: dataToSend,
        });
        option.id = data.id;
      }
      
      option.edition = false;
      updateOptions();
      toastError("Opción guardada correctamente.");
    } catch (e) {
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
              
              {/* ✅ ICONO DE TRANSFERENCIA DENTRO DEL MODO EDICIÓN */}
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
              
              {/* ✅ INDICADOR DE TRANSFERENCIA CONFIGURADA */}
              {option.transferQueueId && (
                <>
                  {/* ✅ Usar directamente option.transferQueue del backend */}
                  {(() => {
                    return option.transferQueue ? (
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
                        → {option.transferQueue.name}
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
        <Typography variant="body1">
          {option.title !== "" ? option.title : i18n.t("queueOptions.undefinedTitle")}
          <IconButton
            variant="outlined"
            size="small"
            className={classes.button}
            onClick={() => handleEdition(index)}
          >
            <EditIcon />
          </IconButton>
          
          {/* ✅ SOLO MOSTRAR TEXTO DE TRANSFERENCIA EN MODO NO-EDICIÓN */}
          {option.transferQueueId && (
            <>
              {(() => {
                const transferQueue = queues.find(q => q.id === option.transferQueueId);
                return transferQueue ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      marginLeft: '8px',
                      color: 'green',
                      fontSize: '0.875rem'
                    }}
                  >
                    → {transferQueue.name}
                  </span>
                ) : null;
              })()}
            </>
          )}
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
      <TransferQueueModal
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        onSelect={(selectedQueue) => {
          handleSaveTransfer(selectedQueue.id);
        }}
        currentTransferQueueId={selectedOptionForTransfer?.transferQueueId}
      />
      
      {/* ✅ MODAL DE CONFIRMACIÓN PARA ELIMINAR TRANSFERENCIA */}
      <Dialog
        open={deleteTransferModalOpen}
        onClose={cancelDeleteTransfer}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Eliminar Transferencia
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            ¿Está seguro que desea eliminar la transferencia a → {optionToDeleteTransfer?.transferQueue?.name || 'el departamento'}?
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Esta acción no se puede deshacer. La opción seguirá existiendo pero ya no tendrá departamento de transferencia asignado.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteTransfer} color="secondary">
            Cancelar
          </Button>
          <Button 
            onClick={confirmDeleteTransfer} 
            color="primary" 
            variant="contained"
            style={{ backgroundColor: '#f50057', color: 'white' }}
          >
            Confirmar
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
    if (queueId) {
      const fetchOptions = async () => {
        try {
          const { data } = await api.request({
            url: "/queue-options",
            method: "GET",
            params: { queueId, parentId: -1 },
          });
          const optionList = data.map((option) => {
            return {
              ...option,
              children: [],
              edition: false,
            };
          });
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
    for (let option of options) {
      if (!option.id && option.title.trim() !== "") {
        try {
          const { data } = await api.request({
            url: `/queue-options`,
            method: "POST",
            data: {
              ...option,
              queueId: savedQueueId
            },
          });
          option.id = data.id;
        } catch (e) {
          console.error("❌ Error al guardar opción temporal:", e);
        }
      }
    }
  }, [options]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateOptions = () => {
    setOptions([...options]);
  };



  const addOption = () => {
    
    const newOption = {
      title: "",
      message: "",
      edition: false,
      option: options.length + 1,
      queueId: queueId || null, // ✅ Permitir null temporalmente
      parentId: null,
      children: [],
    };
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
