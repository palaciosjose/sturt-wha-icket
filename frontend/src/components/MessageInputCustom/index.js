import React, { useState, useEffect, useContext, useRef } from "react";
import withWidth, { isWidthUp } from "@material-ui/core/withWidth";
import "emoji-mart/css/emoji-mart.css";
import { Picker } from "emoji-mart";
import MicRecorder from "mic-recorder-to-mp3";
import clsx from "clsx";
import { isNil } from "lodash";
import { Reply } from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import InputBase from "@material-ui/core/InputBase";
import CircularProgress from "@material-ui/core/CircularProgress";
import { green, grey } from "@material-ui/core/colors";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import IconButton from "@material-ui/core/IconButton";
import MoodIcon from "@material-ui/icons/Mood";
import SendIcon from "@material-ui/icons/Send";
import CancelIcon from "@material-ui/icons/Cancel";
import ClearIcon from "@material-ui/icons/Clear";
import MicIcon from "@material-ui/icons/Mic";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import CloseIcon from "@material-ui/icons/Close";
import FlashOnIcon from "@material-ui/icons/FlashOn";
import FolderIcon from "@material-ui/icons/Folder";
import { FormControlLabel, Switch, Menu, MenuItem } from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import { isString, isEmpty, isObject, has } from "lodash";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import axios from "axios";

import RecordingTimer from "./RecordingTimer";
import { ReplyMessageContext } from "../../context/ReplyingMessage/ReplyingMessageContext";
import { ForwardMessageContext } from "../../context/ForwarMessage/ForwardMessageContext";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import toastError from "../../errors/toastError";

import Compressor from 'compressorjs';


import useQuickMessages from "../../hooks/useQuickMessages";
import useFiles from "../../hooks/useFiles";
import logger from "../../utils/logger";

const Mp3Recorder = new MicRecorder({ bitRate: 128 });

const useStyles = makeStyles((theme) => ({
  mainWrapper: {
    backgroundColor: theme.palette.bordabox, //DARK MODE PLW DESIGN//
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    borderTop: "1px solid rgba(0, 0, 0, 0.12)",
  },

  newMessageBox: {
    backgroundColor: theme.palette.newmessagebox, //DARK MODE PLW DESIGN//
    width: "100%",
    display: "flex",
    padding: "7px",
    alignItems: "center",
  },

  messageInputWrapper: {
    padding: 6,
    marginRight: 7,
    backgroundColor: theme.palette.inputdigita, //DARK MODE PLW DESIGN//
    display: "flex",
    borderRadius: 20,
    flex: 1,
  },

  messageInput: {
    paddingLeft: 10,
    flex: 1,
    border: "none",
  },

  sendMessageIcons: {
    color: "grey",
  },

  ForwardMessageIcons: {
    color: grey[700],
    transform: 'scaleX(-1)'
  },

  uploadInput: {
    display: "none",
  },

  viewMediaInputWrapper: {
    display: "flex",
    padding: "10px 13px",
    position: "relative",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#eee",
    borderTop: "1px solid rgba(0, 0, 0, 0.12)",
  },

  emojiBox: {
    position: "absolute",
    bottom: 63,
    width: 40,
    borderTop: "1px solid #e8e8e8",
  },

  circleLoading: {
    color: green[500],
    opacity: "70%",
    position: "absolute",
    top: "20%",
    left: "50%",
    marginLeft: -12,
  },

  audioLoading: {
    color: green[500],
    opacity: "70%",
  },

  recorderWrapper: {
    display: "flex",
    alignItems: "center",
    alignContent: "middle",
  },

  cancelAudioIcon: {
    color: "red",
  },

  sendAudioIcon: {
    color: "green",
  },

  replyginMsgWrapper: {
    display: "flex",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    paddingLeft: 73,
    paddingRight: 7,
  },

  replyginMsgContainer: {
    flex: 1,
    marginRight: 5,
    overflowY: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: "7.5px",
    display: "flex",
    position: "relative",
  },

  replyginMsgBody: {
    padding: 10,
    height: "auto",
    display: "block",
    whiteSpace: "pre-wrap",
    overflow: "hidden",
  },

  replyginContactMsgSideColor: {
    flex: "none",
    width: "4px",
    backgroundColor: "#35cd96",
  },

  replyginSelfMsgSideColor: {
    flex: "none",
    width: "4px",
    backgroundColor: "#6bcbef",
  },

  messageContactName: {
    display: "flex",
    color: "#6bcbef",
    fontWeight: 500,
  },
}));

const EmojiOptions = (props) => {
  const { disabled, showEmoji, setShowEmoji, handleAddEmoji } = props;
  const classes = useStyles();
  return (
    <>
      <IconButton
        aria-label="emojiPicker"
        component="span"
        disabled={disabled}
        onClick={(e) => setShowEmoji((prevState) => !prevState)}
      >
        <MoodIcon className={classes.sendMessageIcons} />
      </IconButton>
      {showEmoji ? (
        <div className={classes.emojiBox}>
          <Picker
            perLine={16}
            showPreview={false}
            showSkinTones={false}
            onSelect={handleAddEmoji}
          />
        </div>
      ) : null}
    </>
  );
};

const SignSwitch = (props) => {
  const { width, setSignMessage, signMessage } = props;
  if (isWidthUp("md", width)) {
    return (
      <FormControlLabel
        style={{ marginRight: 7, color: "gray" }}
        label={i18n.t("messagesInput.signMessage")}
        labelPlacement="start"
        control={
          <Switch
            size="small"
            checked={signMessage}
            onChange={(e) => {
              setSignMessage(e.target.checked);
            }}
            name="showAllTickets"
            color="primary"
          />
        }
      />
    );
  }
  return null;
};

const FileInput = (props) => {
  const { handleChangeMedias, disableOption } = props;
  const classes = useStyles();
  return (
    <>
      <input
        multiple
        type="file"
        id="upload-button"
        disabled={disableOption()}
        className={classes.uploadInput}
        onChange={handleChangeMedias}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
      />
      <label htmlFor="upload-button">
        <IconButton
          aria-label="upload"
          component="span"
          disabled={disableOption()}
          title="Adjuntar archivos (múltiples) - NUEVO"
          style={{ backgroundColor: '#e3f2fd', borderRadius: '50%' }}
        >
          <AttachFileIcon className={classes.sendMessageIcons} style={{ color: '#2196f3' }} />
        </IconButton>
      </label>
    </>
  );
};

const ActionButtons = (props) => {
  const {
    inputMessage,
    loading,
    recording,
    ticketStatus,
    handleSendMessage,
    handleCancelAudio,
    handleUploadAudio,
    handleStartRecording,
    handleOpenModalForward,
    showSelectMessageCheckbox
  } = props;
  const classes = useStyles();
  
  // ✅ FUNCIÓN PARA CANCELAR SELECCIÓN DE MENSAJES
  const handleCancelSelection = () => {
    const { setShowSelectMessageCheckbox, setSelectedMessages } = props;
    setShowSelectMessageCheckbox(false);
    setSelectedMessages([]);
  };
  
  if (showSelectMessageCheckbox) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* ✅ BOTÓN CANCELAR */}
        <IconButton
          aria-label="cancelSelection"
          component="span"
          onClick={handleCancelSelection}
          disabled={loading}
          style={{ color: '#f44336' }}
          title="Cancelar selección"
        >
          <HighlightOffIcon className={classes.sendMessageIcons} />
        </IconButton>
        <IconButton
          aria-label="forwardMessage"
          component="span"
          onClick={handleOpenModalForward}
          disabled={loading}
        >
          <Reply className={classes.ForwardMessageIcons} />
        </IconButton>
      </div>
    );
  } else if (inputMessage) {
    return (
      <IconButton
        aria-label="sendMessage"
        component="span"
        onClick={handleSendMessage}
        disabled={loading}
      >
        <SendIcon className={classes.sendMessageIcons} />
      </IconButton>
    );
  } else if (recording) {
    return (
      <div className={classes.recorderWrapper}>
        <IconButton
          aria-label="cancelRecording"
          component="span"
          fontSize="large"
          disabled={loading}
          onClick={handleCancelAudio}
        >
          <HighlightOffIcon className={classes.cancelAudioIcon} />
        </IconButton>
        {loading ? (
          <div>
            <CircularProgress className={classes.audioLoading} />
          </div>
        ) : (
          <RecordingTimer />
        )}

        <IconButton
          aria-label="sendRecordedAudio"
          component="span"
          onClick={handleUploadAudio}
          disabled={loading}
        >
          <CheckCircleOutlineIcon className={classes.sendAudioIcon} />
        </IconButton>
      </div>
    );
  } else {
    return (
      <IconButton
        aria-label="showRecorder"
        component="span"
        disabled={loading || ticketStatus !== "open"}
        onClick={handleStartRecording}
      >
        <MicIcon className={classes.sendMessageIcons} />
      </IconButton>
    );
  }
};

const CustomInput = (props) => {
  const {
    loading,
    inputRef,
    ticketStatus,
    inputMessage,
    setInputMessage,
    handleSendMessage,
    handleInputPaste,
    disableOption,
    handleQuickAnswersClick,
    options,
    popupOpen
  } = props;
  const classes = useStyles();

  const onKeyPress = (e) => {
    if (loading || e.shiftKey) return;
    else if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const onPaste = (e) => {
    if (ticketStatus === "open") {
      handleInputPaste(e);
    }
  };

  const renderPlaceholder = () => {
    if (ticketStatus === "open") {
      return i18n.t("messagesInput.placeholderOpen") + " (usa / para respuestas rápidas)";
    }
    return i18n.t("messagesInput.placeholderClosed");
  };


  const setInputRef = (input) => {
    if (input) {
      input.focus();
      inputRef.current = input;
    }
  };

  return (
    <div className={classes.messageInputWrapper}>
      <Autocomplete
        freeSolo
        open={popupOpen}
        id="quick-messages-autocomplete"
        value={inputMessage}
        options={options}
        closeIcon={null}
        getOptionLabel={(option) => {
          if (isObject(option)) {
            return option.label;
          } else {
            return option;
          }
        }}
        onChange={(event, opt) => {
         
          if (isObject(opt) && has(opt, "value") && isNil(opt.mediaPath)) {
            setInputMessage(opt.value);
            setTimeout(() => {
              inputRef.current.scrollTop = inputRef.current.scrollHeight;
            }, 200);
          } else if (isObject(opt) && has(opt, "value") && !isNil(opt.mediaPath)) {
            handleQuickAnswersClick(opt);

            setTimeout(() => {
              inputRef.current.scrollTop = inputRef.current.scrollHeight;
            }, 200);
          }
        }}
        onInputChange={(event, opt, reason) => {
          if (reason === "input") {
            setInputMessage(event.target.value);
          }
        }}
        onPaste={onPaste}
        onKeyPress={onKeyPress}
        style={{ width: "100%" }}
        renderInput={(params) => {
          const { InputLabelProps, InputProps, ...rest } = params;
          return (
            <InputBase
              {...params.InputProps}
              {...rest}
              disabled={disableOption()}
              inputRef={setInputRef}
              placeholder={renderPlaceholder()}
              multiline
              className={classes.messageInput}
              maxRows={5}
            />
          );
        }}
      />
    </div>
  );
};

const MessageInputCustom = (props) => {

  const { ticketStatus, ticketId } = props;
  const classes = useStyles();

  const [medias, setMedias] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [quickMessages, setQuickMessages] = useState([]);
  const [options, setOptions] = useState([]);
  const [popupOpen, setPopupOpen] = useState(false);
  const [fileLists, setFileLists] = useState([]);
  const [fileListOptions, setFileListOptions] = useState([]);
  const [fileListAnchorEl, setFileListAnchorEl] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const inputRef = useRef();
  const { setReplyingMessage, replyingMessage } =
    useContext(ReplyMessageContext);
  const { user } = useContext(AuthContext);

  const [signMessage, setSignMessage] = useLocalStorage("signOption", true);

  const {
    selectedMessages,
    setForwardMessageModalOpen,
    showSelectMessageCheckbox,
    setShowSelectMessageCheckbox,
    setSelectedMessages } = useContext(ForwardMessageContext);

  const { list: listQuickMessages } = useQuickMessages();
  const { list: listFiles } = useFiles();

  // Cargar respuestas rápidas
  useEffect(() => {
    async function fetchData() {
      const companyId = localStorage.getItem("companyId");
      const messages = await listQuickMessages({ companyId, userId: user.id });
      const options = messages.map((m) => {
        let truncatedMessage = m.message;
        if (isString(truncatedMessage) && truncatedMessage.length > 35) {
          truncatedMessage = m.message.substring(0, 35) + "...";
        }
        return {
          value: m.message,
          label: `/${m.shortcode} - ${truncatedMessage}`,
          shortcode: m.shortcode,
          message: m.message,
          mediaPath: m.mediaPath,
        };
      });
      setQuickMessages(options);
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar listas de archivos
  useEffect(() => {
    async function fetchFileLists() {
      const companyId = localStorage.getItem("companyId");
      const files = await listFiles({ companyId, userId: user.id });
      const options = files.map((fileList) => {
        let truncatedName = fileList.name;
        if (isString(truncatedName) && truncatedName.length > 35) {
          truncatedName = fileList.name.substring(0, 35) + "...";
        }
        return {
          value: fileList,
          label: `📁 ${truncatedName}`,
          name: fileList.name,
          message: fileList.message,
          options: fileList.options,
        };
      });
      setFileLists(options);
    }
    fetchFileLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manejar autocompletado de respuestas rápidas
  useEffect(() => {
    if (
      isString(inputMessage) &&
      !isEmpty(inputMessage) &&
      inputMessage.startsWith("/")
    ) {
      setPopupOpen(true);

      // Si solo hay "/", mostrar todas las opciones
      if (inputMessage === "/") {
        setOptions(quickMessages);
      } else {
        // Filtrar por lo que se escriba después de "/"
        const searchTerm = inputMessage.substring(1).toLowerCase();
        const filteredOptions = quickMessages.filter(
          (m) => 
            m.shortcode.toLowerCase().includes(searchTerm) ||
            m.message.toLowerCase().includes(searchTerm)
        );
        setOptions(filteredOptions);
      }
    } else {
      setPopupOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputMessage]);

  useEffect(() => {
    inputRef.current.focus();
  }, [replyingMessage]);

  useEffect(() => {
    inputRef.current.focus();
    return () => {
  
      setInputMessage("");
      setShowEmoji(false);
      setMedias([]);
      setReplyingMessage(null);
    };
  }, [ticketId, setReplyingMessage]);

  // const handleChangeInput = e => {
  // 	if (isObject(e) && has(e, 'value')) {
  // 		setInputMessage(e.value);
  // 	} else {
  // 		setInputMessage(e.target.value)
  // 	}
  // };

  const handleOpenModalForward = () => {
    if (selectedMessages.length === 0) {
      setForwardMessageModalOpen(false)
      toastError(i18n.t("messagesList.header.notMessage"));
      return;
    }
    setForwardMessageModalOpen(true);
  }

  const handleAddEmoji = (e) => {
    let emoji = e.native;
    setInputMessage((prevState) => prevState + emoji);
  };

  const handleChangeMedias = (e) => {
    if (!e.target.files) {
      return;
    }

    const selectedMedias = Array.from(e.target.files);
    // ✅ MEJORA: Acumular archivos en lugar de reemplazar
    setMedias(prevMedias => {
      return [...prevMedias, ...selectedMedias];
    });
  };

  const handleInputPaste = (e) => {
    const items = e.clipboardData.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
  
          setMedias(prevMedias => [...prevMedias, file]);
        }
      }
    }
  };

  // ✅ MEJORA: Drag & Drop múltiple
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    
    if (files.length > 0) {
      setMedias(prevMedias => {
        return [...prevMedias, ...files];
      });
    }
  };

  // ✅ MEJORA: Eliminar archivo específico
  const handleRemoveMedia = (indexToRemove) => {
    setMedias(prevMedias => prevMedias.filter((_, index) => index !== indexToRemove));
  };

  // ✅ MEJORA: Función para obtener el tipo de archivo
  const getFileType = (file) => {
    if (file.type.startsWith('image/')) return <span role="img" aria-label="imagen">🖼️</span>;
    if (file.type.startsWith('video/')) return <span role="img" aria-label="video">🎥</span>;
    if (file.type.startsWith('audio/')) return <span role="img" aria-label="audio">🎵</span>;
    if (file.type.includes('pdf')) return <span role="img" aria-label="documento pdf">📄</span>;
    if (file.type.includes('document') || file.type.includes('word')) return <span role="img" aria-label="documento">📝</span>;
    if (file.type.includes('sheet') || file.type.includes('excel')) return <span role="img" aria-label="hoja de cálculo">📊</span>;
    return <span role="img" aria-label="archivo">📎</span>;
  };

  const handleUploadQuickMessageMedia = async (blob, originalFileName) => {
    try {
      if (logger && logger.media) {
        logger.media.debug("Procesando multimedia para envío, tipo:", blob.type);
        logger.media.debug("Nombre original del archivo:", originalFileName);
      }
      
      // Mantener el nombre original del archivo
      let filename = originalFileName;
      
      // Si el nombre es muy extenso (más de 50 caracteres), truncarlo
              if (filename && filename.length > 50) {
          const extension = filename.split('.').pop();
          const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
          const truncatedName = nameWithoutExt.substring(0, 47) + '...';
          filename = `${truncatedName}.${extension}`;
          if (logger && logger.media) {
            logger.media.debug("Nombre truncado:", filename);
          }
        }
        
        // Si no hay nombre original, generar uno con timestamp
        if (!filename) {
          const extension = blob.type.split("/")[1] || 'bin';
          filename = `${new Date().getTime()}.${extension}`;
          if (logger && logger.media) {
            logger.media.debug("Nombre generado:", filename);
          }
        }
        
        if (logger && logger.media) {
          logger.media.debug("Nombre final del archivo:", filename);
        }

        const formData = new FormData();
        formData.append("medias", blob, filename);
        formData.append("body", filename); // Usar el nombre del archivo como body
        formData.append("fromMe", true);

        if (logger && logger.media) {
          logger.media.debug("Enviando multimedia al servidor...");
        }
        
        await api.post(`/messages/${ticketId}`, formData);
        
        if (logger && logger.media) {
          logger.media.info("Multimedia enviada exitosamente");
        }
      } catch (err) {
        if (logger && logger.media) {
          logger.media.error("Error al enviar multimedia:", err);
        }
        toastError(err);
        throw err; // Re-lanzar el error para que lo maneje la función padre
      }
  };
  
  const handleQuickAnswersClick = async (value) => {
    if (value.mediaPath) {
      setLoading(true);
      try {
        if (logger && logger.media) {
          logger.media.debug("Descargando multimedia desde:", value.mediaPath);
          logger.media.debug("URL completa:", value.mediaPath);
        }
        
        // ✅ Validar que la URL sea válida
        if (!value.mediaPath || value.mediaPath === 'null' || value.mediaPath === 'undefined' || value.mediaPath.includes('undefined')) {
          if (logger && logger.media) {
            logger.media.warn("URL de multimedia inválida:", value.mediaPath);
          }
          toastError(new Error("URL de multimedia inválida - Contacte al administrador"));
          setLoading(false);
          setInputMessage(value.value);
          return;
        }
        
        const { data } = await axios.get(value.mediaPath, {
          responseType: "blob",
          timeout: 10000, // 10 segundos de timeout
        });

        if (logger && logger.media) {
          logger.media.debug("Multimedia descargada exitosamente, tamaño:", data.size);
        }
        
        // ✅ EXTRAER NOMBRE REAL DEL ARCHIVO DESDE LA URL
        let fileName = value.value; // Fallback al texto de respuesta rápida
        
        if (value.mediaPath) {
          // Extraer nombre desde la URL del archivo
          const urlParts = value.mediaPath.split('/');
          const lastPart = urlParts[urlParts.length - 1];
          
          if (lastPart && lastPart.includes('.')) {
            fileName = lastPart;
            if (logger && logger.media) {
              logger.media.debug("Nombre extraído desde URL:", fileName);
            }
          }
        }
        
        await handleUploadQuickMessageMedia(data, fileName);
        setInputMessage("");
        setLoading(false);
        return;
      } catch (err) {
        console.error("Error al procesar multimedia de respuesta rápida:", err);
        console.error("URL que falló:", value.mediaPath);
        
        // Mostrar error más específico
        let errorMessage = "Error al procesar multimedia";
        if (err.response) {
          if (err.response.status === 404) {
            errorMessage = "Archivo multimedia no encontrado";
          } else if (err.response.status === 403) {
            errorMessage = "Sin permisos para acceder al archivo";
          } else {
            errorMessage = `Error del servidor: ${err.response.status}`;
          }
        } else if (err.code === 'ECONNABORTED') {
          errorMessage = "Tiempo de espera agotado";
        }
        
        toastError(new Error(errorMessage));
        setLoading(false);
        
        // Si falla la multimedia, al menos enviar el texto
        setInputMessage(value.value);
        return;
      }
    }

    setInputMessage("");
    setInputMessage(value.value);
  };

  const handleFileListClick = async (value) => {
    if (logger && logger.media) {
      logger.media.debug("Valor recibido en handleFileListClick:", value);
    }
    
    // Verificar si value.value.options existe (estructura correcta)
    if (!value.value || !value.value.options || value.value.options.length === 0) {
      if (logger && logger.media) {
        logger.media.warn("No hay archivos en la lista. value.value:", value.value);
      }
      toastError("Esta lista de archivos no contiene archivos");
      return;
    }

    setLoading(true);
    try {
      if (logger && logger.media) {
        logger.media.debug("Enviando lista de archivos:", value.name);
        logger.media.debug("Archivos en la lista:", value.value.options.length);
      }

      // Enviar cada archivo de la lista
      for (const fileOption of value.value.options) {
        try {
          if (logger && logger.media) {
            logger.media.debug("Procesando archivo:", fileOption.name);
          }
          
          // Construir URL del archivo
          const publicFolder = "public/fileList";
          const backendUrl = process.env.REACT_APP_BACKEND_URL;
          if (!backendUrl) {
            throw new Error('REACT_APP_BACKEND_URL no está configurado');
          }
          const fileUrl = `${backendUrl}/${publicFolder}/${value.value.id}/${fileOption.path}`;
          
          if (logger && logger.media) {
            logger.media.debug("URL del archivo:", fileUrl);
          }
          
          // Extraer nombre del archivo desde la ruta
          const fileName = fileOption.path || fileOption.name || 'documento';
          if (logger && logger.media) {
            logger.media.debug("Nombre del archivo extraído:", fileName);
          }
          
          // Descargar archivo
          const { data } = await axios.get(fileUrl, {
            responseType: "blob",
            timeout: 10000,
          });

          if (logger && logger.media) {
            logger.media.debug("Archivo descargado:", fileName, "tamaño:", data.size);
          }
          
          // Enviar archivo
          await handleUploadQuickMessageMedia(data, fileName);
          
          // Pequeña pausa entre archivos para no sobrecargar
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (err) {
          if (logger && logger.media) {
            logger.media.error("Error procesando archivo:", fileOption.name, err);
          }
          toastError(`Error al procesar archivo: ${fileOption.name}`);
        }
      }
      
      if (logger && logger.media) {
        logger.media.info("Lista de archivos enviada exitosamente");
      }
      setLoading(false);
      
    } catch (err) {
      if (logger && logger.media) {
        logger.media.error("Error al enviar lista de archivos:", err);
      }
      toastError("Error al enviar lista de archivos");
      setLoading(false);
    }
  };

  const handleUploadMedia = async (e) => {
    setLoading(true);
    e.preventDefault();

    // ✅ MEJORA: Enviar cada archivo por separado
    for (let i = 0; i < medias.length; i++) {
      const media = medias[i];
      const currentIndex = i; // Capturar el índice para evitar problemas de closure

      try {
        // Actualizar progreso
        setUploadProgress(prev => ({
          ...prev,
          [currentIndex]: 0
        }));

        if (media?.type.split('/')[0] === 'image') {
          // ✅ MEJORA: Manejar compresión de imágenes correctamente
          await new Promise((resolve, reject) => {
            new Compressor(media, {
              quality: 0.7,
              async success(compressedMedia) {
                try {
                  const formData = new FormData();
                  formData.append("fromMe", true);
                  formData.append("medias", compressedMedia);
                  formData.append("body", media.name);

                  await api.post(`/messages/${ticketId}`, formData, {
                    onUploadProgress: (event) => {
                      const progress = Math.round((event.loaded * 100) / event.total);
                      setUploadProgress(prev => ({
                        ...prev,
                        [currentIndex]: progress
                      }));
                    },
                  });

                  resolve();
                } catch (err) {
                  reject(err);
                }
              },
              error(err) {
                reject(err);
              },
            });
          });
        } else {
          // ✅ MEJORA: Enviar archivos no-imagen directamente
          const formData = new FormData();
          formData.append("fromMe", true);
          formData.append("medias", media);
          formData.append("body", media.name);

          await api.post(`/messages/${ticketId}`, formData, {
            onUploadProgress: (event) => {
              const progress = Math.round((event.loaded * 100) / event.total);
              setUploadProgress(prev => ({
                ...prev,
                [currentIndex]: progress
              }));
            },
          });
        }
      } catch (err) {
        toastError(err);
      }
    }

    setLoading(false);
    setMedias([]);
    setUploadProgress({});
  }

  const handleSendMessage = async () => {
    if (inputMessage.trim() === "") return;
    setLoading(true);

    const message = {
      read: 1,
      fromMe: true,
      mediaUrl: "",
      body: signMessage
        ? `*${user?.name}:*\n${inputMessage.trim()}`
        : inputMessage.trim(),
      quotedMsg: replyingMessage,
    };
    try {
      await api.post(`/messages/${ticketId}`, message);
    } catch (err) {
      toastError(err);
    }

    setInputMessage("");
    setShowEmoji(false);
    setLoading(false);
    setReplyingMessage(null);
  };

  const handleStartRecording = async () => {
    setLoading(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await Mp3Recorder.start();
      setRecording(true);
      setLoading(false);
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  const handleUploadAudio = async () => {
    setLoading(true);
    try {
      const [, blob] = await Mp3Recorder.stop().getMp3();
      if (blob.size < 10000) {
        setLoading(false);
        setRecording(false);
        return;
      }

      const formData = new FormData();
      const filename = `audio-record-site-${new Date().getTime()}.mp3`;
      formData.append("medias", blob, filename);
      formData.append("body", filename);
      formData.append("fromMe", true);

      await api.post(`/messages/${ticketId}`, formData);
    } catch (err) {
      toastError(err);
    }

    setRecording(false);
    setLoading(false);
  };

  const handleCancelAudio = async () => {
    try {
      await Mp3Recorder.stop().getMp3();
      setRecording(false);
    } catch (err) {
      toastError(err);
    }
  };

  const handleQuickReplyButtonClick = () => {
    setInputMessage("/");
    // Forzar que se muestren las opciones inmediatamente
    setTimeout(() => {
      setPopupOpen(true);
      setOptions(quickMessages);
    }, 100);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleFileListButtonClick = (event) => {
    setFileListAnchorEl(event.currentTarget);
    setFileListOptions(fileLists);
  };

  const handleFileListMenuClose = () => {
    setFileListAnchorEl(null);
  };

  const handleFileListSelect = (fileList) => {
    handleFileListClick(fileList);
    handleFileListMenuClose();
  };

  const disableOption = () => {
    return loading || recording || ticketStatus !== "open";
  };

  const renderReplyingMessage = (message) => {
    return (
      <div className={classes.replyginMsgWrapper}>
        <div className={classes.replyginMsgContainer}>
          <span
            className={clsx(classes.replyginContactMsgSideColor, {
              [classes.replyginSelfMsgSideColor]: !message.fromMe,
            })}
          ></span>
          <div className={classes.replyginMsgBody}>
            {!message.fromMe && (
              <span className={classes.messageContactName}>
                {message.contact?.name}
              </span>
            )}
            {message.body}
          </div>
        </div>
        <IconButton
          aria-label="showRecorder"
          component="span"
          disabled={loading || ticketStatus !== "open"}
          onClick={() => setReplyingMessage(null)}
        >
          <ClearIcon className={classes.sendMessageIcons} />
        </IconButton>
      </div>
    );
  };

  if (medias.length > 0)
    return (
      <Paper 
        elevation={0} 
        square 
        className={classes.viewMediaInputWrapper}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: isDragOver ? "2px dashed #2196f3" : "none",
          backgroundColor: isDragOver ? "#f0f8ff" : "#f5f5f5",
          transition: "all 0.3s ease",
          position: "relative"
        }}
      >
        {/* Indicador de drag & drop para vista de archivos */}
        {isDragOver && (
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(33, 150, 243, 0.9)",
            color: "white",
            padding: "20px",
            borderRadius: "10px",
            zIndex: 1000,
            pointerEvents: "none",
            fontSize: "16px",
            fontWeight: "bold",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
          }}>
            <span role="img" aria-label="carpeta">📁</span> SUELTA AQUÍ PARA ADJUNTAR MÁS ARCHIVOS - NUEVO
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
          {medias.map((media, index) => (
            <div key={index} style={{ 
              display: "flex", 
              alignItems: "center", 
              background: "#fff", 
              border: "1px solid #ddd", 
              borderRadius: "8px", 
              padding: "6px 10px", 
              maxWidth: "200px", 
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)" 
            }}>
              <span style={{ 
                fontSize: "12px", 
                color: "#333", 
                marginRight: "8px", 
                overflow: "hidden", 
                textOverflow: "ellipsis", 
                whiteSpace: "nowrap", 
                flex: 1 
              }}>
                {getFileType(media)} {media.name}
                {uploadProgress[index] !== undefined && (
                  <span style={{ color: '#2196f3', fontSize: '10px' }}>
                    {' '}({uploadProgress[index]}%)
                  </span>
                )}
              </span>
              <IconButton
                aria-label="remove-media"
                component="span"
                onClick={() => handleRemoveMedia(index)}
                size="small"
                style={{ padding: "2px", marginLeft: "4px" }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </div>
          ))}
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <IconButton
              aria-label="cancel-upload"
              component="span"
              onClick={(e) => setMedias([])}
            >
              <CancelIcon className={classes.sendMessageIcons} />
            </IconButton>
            
            {/* ✅ MEJORA: Botón para agregar más archivos */}
            <input
              multiple
              type="file"
              id="upload-more-button"
              disabled={loading || recording || ticketStatus !== "open"}
              className={classes.uploadInput}
              onChange={handleChangeMedias}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
            <label htmlFor="upload-more-button">
              <IconButton
                aria-label="upload-more"
                component="span"
                disabled={loading || recording || ticketStatus !== "open"}
                title="Agregar más archivos"
                style={{ backgroundColor: '#e8f5e8', borderRadius: '50%' }}
              >
                <AttachFileIcon className={classes.sendMessageIcons} style={{ color: '#4caf50' }} />
              </IconButton>
            </label>
          </div>

          {loading ? (
            <div>
              <CircularProgress size={24} />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              <span style={{ fontWeight: "bold", color: "#2196f3", fontSize: "14px" }}>
                <span role="img" aria-label="carpeta">📁</span> {medias.length} archivo{medias.length > 1 ? 's' : ''} seleccionado{medias.length > 1 ? 's' : ''}
              </span>
              <span style={{ fontSize: "11px", color: "#666", textAlign: "center", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {medias.map(f => f.name).join(", ")}
              </span>
              <span style={{ fontSize: "10px", color: "#4caf50", textAlign: "center", marginTop: "4px" }}>
                <span role="img" aria-label="bombilla">💡</span> Arrastra más archivos aquí o usa el botón verde
              </span>
            </div>
          )}
          
          <IconButton
            aria-label="send-upload"
            component="span"
            onClick={handleUploadMedia}
            disabled={loading}
          >
            <SendIcon className={classes.sendMessageIcons} />
          </IconButton>
        </div>
      </Paper>
    );
  else {
    return (
      <Paper square elevation={0} className={classes.mainWrapper}>
        {replyingMessage && renderReplyingMessage(replyingMessage)}
        <div 
          className={classes.newMessageBox}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: isDragOver ? "2px dashed #2196f3" : "none",
            backgroundColor: isDragOver ? "#f0f8ff" : "transparent",
            transition: "all 0.3s ease",
            position: "relative"
          }}
        >
          {/* Indicador de drag & drop */}
          {isDragOver && (
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "rgba(33, 150, 243, 0.9)",
              color: "white",
              padding: "20px",
              borderRadius: "10px",
              zIndex: 1000,
              pointerEvents: "none",
              fontSize: "16px",
              fontWeight: "bold",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
            }}>
              <span role="img" aria-label="carpeta">📁</span> SUELTA AQUÍ PARA ADJUNTAR ARCHIVOS - NUEVO
            </div>
          )}
          <EmojiOptions
            disabled={disableOption()}
            handleAddEmoji={handleAddEmoji}
            showEmoji={showEmoji}
            setShowEmoji={setShowEmoji}
          />

          <FileInput
            disableOption={disableOption}
            handleChangeMedias={handleChangeMedias}
          />

          <IconButton
            aria-label="quickReplies"
            component="span"
            disabled={disableOption()}
            onClick={handleQuickReplyButtonClick}
            title="Respuestas Rápidas"
          >
            <FlashOnIcon className={classes.sendMessageIcons} />
          </IconButton>

          <IconButton
            aria-label="fileLists"
            component="span"
            disabled={disableOption()}
            onClick={handleFileListButtonClick}
            title="Listas de Archivos"
          >
            <FolderIcon className={classes.sendMessageIcons} />
          </IconButton>

          <Menu
            anchorEl={fileListAnchorEl}
            open={Boolean(fileListAnchorEl)}
            onClose={handleFileListMenuClose}
            PaperProps={{
              style: {
                maxHeight: 300,
                width: 300,
              },
            }}
          >
            {fileListOptions.map((fileList) => (
              <MenuItem
                key={fileList.value.id}
                onClick={() => handleFileListSelect(fileList)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  fontSize: '14px',
                  padding: '8px 16px'
                }}
              >
                {fileList.label}
              </MenuItem>
            ))}
            {fileListOptions.length === 0 && (
              <MenuItem disabled>
                No hay listas de archivos disponibles
              </MenuItem>
            )}
          </Menu>

          <SignSwitch
            width={props.width}
            setSignMessage={setSignMessage}
            signMessage={signMessage}
          />

          <CustomInput
            loading={loading}
            inputRef={inputRef}
            ticketStatus={ticketStatus}
            inputMessage={inputMessage}
            setInputMessage={setInputMessage}
            // handleChangeInput={handleChangeInput}
            handleSendMessage={handleSendMessage}
            handleInputPaste={handleInputPaste}
            disableOption={disableOption}
            replyingMessage={replyingMessage}
            handleQuickAnswersClick={handleQuickAnswersClick}
            options={options}
            popupOpen={popupOpen}
          />

          <ActionButtons
            inputMessage={inputMessage}
            loading={loading}
            recording={recording}
            ticketStatus={ticketStatus}
            handleSendMessage={handleSendMessage}
            handleCancelAudio={handleCancelAudio}
            handleUploadAudio={handleUploadAudio}
            handleStartRecording={handleStartRecording}
            handleOpenModalForward={handleOpenModalForward}
            showSelectMessageCheckbox={showSelectMessageCheckbox}
            setShowSelectMessageCheckbox={setShowSelectMessageCheckbox}
            setSelectedMessages={setSelectedMessages}
          />
        </div>
      </Paper>
    );
  }
};

export default withWidth()(MessageInputCustom);

