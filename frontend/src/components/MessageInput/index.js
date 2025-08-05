import React, { useState, useEffect, useContext, useRef } from "react";
import "emoji-mart/css/emoji-mart.css";
import { useParams } from "react-router-dom";
import { Picker } from "emoji-mart";
import MicRecorder from "mic-recorder-to-mp3";
import clsx from "clsx";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import InputBase from "@material-ui/core/InputBase";
import CircularProgress from "@material-ui/core/CircularProgress";
import { green } from "@material-ui/core/colors";
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
import { FormControlLabel, Switch, Chip, Box, Typography } from "@material-ui/core";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import RecordingTimer from "./RecordingTimer";
import { simpleTest } from "./simple-test";
import { ReplyMessageContext } from "../../context/ReplyingMessage/ReplyingMessageContext";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import toastError from "../../errors/toastError";

// ✅ CORRECCIÓN: Inicialización segura de MicRecorder
const Mp3Recorder = new MicRecorder({ bitRate: 128 });

// ✅ VALIDACIÓN: Verificar que MicRecorder se inicializó correctamente
if (!Mp3Recorder) {
  console.warn("⚠️ [WARNING] MicRecorder no se inicializó correctamente");
}

const useStyles = makeStyles(theme => ({
	mainWrapper: {
		backgroundColor: theme.palette.bordabox,
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		borderTop: "1px solid rgba(0, 0, 0, 0.12)",
	},

	newMessageBox: {
		background: "#eee",
		width: "100%",
		display: "flex",
		padding: "7px",
		alignItems: "center",
		position: "relative",
		transition: "all 0.3s ease",
	},

	dragOver: {
		background: "#e3f2fd",
		border: "2px dashed #2196f3",
		transform: "scale(1.02)",
	},

	messageInputWrapper: {
		padding: 6,
		marginRight: 7,
		background: "#fff",
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

	uploadInput: {
		display: "none",
	},

	viewMediaInputWrapper: {
		display: "flex",
		flexDirection: "column",
		padding: "10px 13px",
		position: "relative",
		backgroundColor: "#f5f5f5",
		borderTop: "1px solid rgba(0, 0, 0, 0.12)",
	},

	mediaPreviewContainer: {
		display: "flex",
		flexWrap: "wrap",
		gap: "8px",
		marginBottom: "10px",
	},

	mediaPreviewItem: {
		display: "flex",
		alignItems: "center",
		background: "#fff",
		border: "1px solid #ddd",
		borderRadius: "8px",
		padding: "6px 10px",
		maxWidth: "200px",
		boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
	},

	mediaPreviewName: {
		fontSize: "12px",
		color: "#333",
		marginRight: "8px",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		flex: 1,
	},

	removeMediaButton: {
		padding: "2px",
		marginLeft: "4px",
		"&:hover": {
			backgroundColor: "#ffebee",
		},
	},

	mediaActionsContainer: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		padding: "8px 0",
	},

	mediaInfo: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		flex: 1,
	},

	mediaCount: {
		fontWeight: "bold",
		color: "#2196f3",
		fontSize: "14px",
	},

	mediaNames: {
		fontSize: "11px",
		color: "#666",
		textAlign: "center",
		maxWidth: "300px",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},

	dragIndicator: {
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
		display: "none",
		fontSize: "16px",
		fontWeight: "bold",
		boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
	},

	dragIndicatorVisible: {
		display: "block",
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
}));

const MessageInput = ({ ticketStatus }) => {
	simpleTest();
	
	const classes = useStyles();
	const { ticketId } = useParams();

	const [medias, setMedias] = useState([]);
	const [inputMessage, setInputMessage] = useState("");
	const [showEmoji, setShowEmoji] = useState(false);
	const [loading, setLoading] = useState(false);
	const [recording, setRecording] = useState(false);
	const [isDragOver, setIsDragOver] = useState(false);
	const [uploadProgress, setUploadProgress] = useState({});
	const inputRef = useRef();
	const { setReplyingMessage, replyingMessage } = useContext(
		ReplyMessageContext
	);
	const { user } = useContext(AuthContext);

	const [signMessage, setSignMessage] = useLocalStorage("signOption", true);

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

	const handleChangeInput = e => {
		setInputMessage(e.target.value);
	};

	const handleAddEmoji = e => {
		let emoji = e.native;
		setInputMessage(prevState => prevState + emoji);
	};

	// ✅ MEJORA: Selección múltiple de archivos
	const handleChangeMedias = e => {
		if (!e.target.files) {
			return;
		}

		const selectedMedias = Array.from(e.target.files);
		
		// Acumular archivos en lugar de reemplazar
		setMedias(prevMedias => {
			const newMedias = [...prevMedias, ...selectedMedias];
			return newMedias;
		});
	};

	// ✅ MEJORA: Pegado de imágenes con Ctrl+V
	const handleInputPaste = e => {
		const items = e.clipboardData.items;
		if (!items) return;

		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (item.type.indexOf('image') !== -1) {
				const file = item.getAsFile();
				if (file) {
					console.log("📋 Imagen pegada:", file.name || "imagen_pegada");
					setMedias(prevMedias => [...prevMedias, file]);
				}
			}
		}
	};

	// ✅ MEJORA: Drag & Drop múltiple mejorado
	const handleDragOver = e => {
		e.preventDefault();
		e.stopPropagation();
		console.log("🎯 DragOver detectado");
		setIsDragOver(true);
	};

	const handleDragEnter = e => {
		e.preventDefault();
		e.stopPropagation();
		console.log("🎯 DragEnter detectado");
		setIsDragOver(true);
	};

	const handleDragLeave = e => {
		e.preventDefault();
		e.stopPropagation();
		// Solo cambiar si no estamos sobre un elemento hijo
		if (!e.currentTarget.contains(e.relatedTarget)) {
			console.log("🎯 DragLeave detectado");
			setIsDragOver(false);
		}
	};

	const handleDrop = e => {
		e.preventDefault();
		e.stopPropagation();
		console.log("🎯 Drop detectado");
		setIsDragOver(false);
		
		const files = Array.from(e.dataTransfer.files);
		console.log("📁 Archivos en drop:", files.length, files.map(f => f.name));
		
		if (files.length > 0) {
			// Acumular archivos arrastrados
			setMedias(prevMedias => {
				const newMedias = [...prevMedias, ...files];
				console.log("🖱️ Archivos arrastrados:", files.length, files.map(f => f.name));
				console.log("📁 Total archivos:", newMedias.length, newMedias.map(f => f.name));
				return newMedias;
			});
		}
	};

	// ✅ MEJORA: Eliminar archivo específico
	const handleRemoveMedia = (indexToRemove) => {
		setMedias(prevMedias => prevMedias.filter((_, index) => index !== indexToRemove));
	};

	// ✅ MEJORA: Envío múltiple con progreso
	const handleUploadMedia = async e => {
		setLoading(true);
		e.preventDefault();

		const totalFiles = medias.length;
		let completedFiles = 0;

		for (let i = 0; i < medias.length; i++) {
			const media = medias[i];
			const formData = new FormData();
			formData.append("fromMe", true);
			formData.append("medias", media);
			formData.append("body", media.name);

			try {
				// Actualizar progreso
				setUploadProgress(prev => ({
					...prev,
					[i]: 0
				}));

				await api.post(`/messages/${ticketId}`, formData, {
					onUploadProgress: (progressEvent) => {
						const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
						setUploadProgress(prev => ({
							...prev,
							[i]: progress
						}));
					}
				});

				completedFiles++;
				console.log(`✅ Archivo ${i + 1}/${totalFiles} enviado:`, media.name);
			} catch (err) {
				console.error(`❌ Error enviando archivo ${media.name}:`, err);
				toastError(err);
			}
		}

		setLoading(false);
		setMedias([]);
		setUploadProgress({});
		console.log(`🎉 Envío completado: ${completedFiles}/${totalFiles} archivos`);
	};

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
			const filename = `${new Date().getTime()}.mp3`;
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

	// ✅ MEJORA: Función para obtener el tamaño del archivo
	const formatFileSize = (bytes) => {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	};

	// ✅ MEJORA: Función para obtener el tipo de archivo
	const getFileType = (file) => {
		if (file.type.startsWith('image/')) return '🖼️';
		if (file.type.startsWith('video/')) return '🎥';
		if (file.type.startsWith('audio/')) return '🎵';
		if (file.type.includes('pdf')) return '📄';
		if (file.type.includes('document') || file.type.includes('word')) return '📝';
		if (file.type.includes('sheet') || file.type.includes('excel')) return '📊';
		return '📎';
	};

	if (medias.length > 0) {
		console.log("🎯 Renderizando archivos:", medias.length, medias.map(f => f.name));
		return (
			<Paper elevation={0} square className={classes.viewMediaInputWrapper}>
				<div className={classes.mediaPreviewContainer}>
					{medias.map((media, index) => (
						<div key={index} className={classes.mediaPreviewItem}>
							<span className={classes.mediaPreviewName}>
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
								className={classes.removeMediaButton}
								size="small"
							>
								<CloseIcon fontSize="small" />
							</IconButton>
						</div>
					))}
				</div>
				
				<div className={classes.mediaActionsContainer}>
					<IconButton
						aria-label="cancel-upload"
						component="span"
						onClick={e => setMedias([])}
					>
						<CancelIcon className={classes.sendMessageIcons} />
					</IconButton>

					{loading ? (
						<div>
							<CircularProgress className={classes.circleLoading} />
						</div>
					) : (
						<div className={classes.mediaInfo}>
							<span className={classes.mediaCount}>
								📁 {medias.length} archivo{medias.length > 1 ? 's' : ''} seleccionado{medias.length > 1 ? 's' : ''}
							</span>
							<span className={classes.mediaNames}>
								{medias.map(f => f.name).join(", ")}
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
	}
	else if (recording) {
		return (
			<Paper elevation={0} square className={classes.viewMediaInputWrapper}>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
					<IconButton
						aria-label="cancel-recording"
						component="span"
						onClick={handleCancelAudio}
					>
						<HighlightOffIcon className={classes.sendMessageIcons} />
					</IconButton>
					<RecordingTimer />
					<IconButton
						aria-label="send-recording"
						component="span"
						onClick={handleUploadAudio}
					>
						<CheckCircleOutlineIcon className={classes.sendMessageIcons} />
					</IconButton>
				</div>
			</Paper>
		);
	}
	else {
		return (
			<Paper elevation={0} square className={classes.mainWrapper}>
				<div 
					className={clsx(classes.newMessageBox, isDragOver && classes.dragOver)}
					onDragOver={handleDragOver}
					onDragEnter={handleDragEnter}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
				>
					{/* Indicador de drag & drop */}
					{isDragOver && (
						<div className={clsx(classes.dragIndicator, classes.dragIndicatorVisible)}>
							📁 SUELTA AQUÍ PARA ADJUNTAR ARCHIVOS - NUEVO
						</div>
					)}

					<IconButton
						aria-label="emojiPicker"
						component="span"
						disabled={loading || recording || ticketStatus !== "open"}
						onClick={e => setShowEmoji(prevState => !prevState)}
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

					{/* ✅ MEJORA: Input de archivos múltiples */}
					<input
						multiple
						type="file"
						id="upload-button"
						disabled={loading || recording || ticketStatus !== "open"}
						className={classes.uploadInput}
						onChange={handleChangeMedias}
						accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
					/>
					<label htmlFor="upload-button">
						<IconButton
							aria-label="upload"
							component="span"
							disabled={loading || recording || ticketStatus !== "open"}
							title="Adjuntar archivos (múltiples) - NUEVO"
							style={{ backgroundColor: '#e3f2fd', borderRadius: '50%' }}
						>
							<AttachFileIcon className={classes.sendMessageIcons} style={{ color: '#2196f3' }} />
						</IconButton>
					</label>

					<FormControlLabel
						style={{ marginRight: 7, color: "gray" }}
						label={i18n.t("messagesInput.signMessage")}
						labelPlacement="start"
						control={
							<Switch
								size="small"
								checked={signMessage}
								onChange={e => {
									setSignMessage(e.target.checked);
								}}
								name="showAllTickets"
								color="primary"
							/>
						}
					/>
					<div className={classes.messageInputWrapper}>
						<InputBase
							inputRef={input => {
								input && input.focus();
								input && (inputRef.current = input);
							}}
							className={classes.messageInput}
							placeholder={
								ticketStatus === "open"
									? i18n.t("messagesInput.placeholderOpen")
									: i18n.t("messagesInput.placeholderClosed")
							}
							multiline
							maxRows={5}
							value={inputMessage}
							onChange={handleChangeInput}
							disabled={recording || loading || ticketStatus !== "open"}
							onPaste={e => {
								ticketStatus === "open" && handleInputPaste(e);
							}}
							onKeyPress={e => {
								if (loading || e.shiftKey) return;
								else if (e.key === "Enter") {
									handleSendMessage();
								}
							}}
						/>
					</div>
					<IconButton
						aria-label="sendMessage"
						component="span"
						disabled={loading || recording || ticketStatus !== "open"}
						onClick={handleSendMessage}
					>
						<SendIcon className={classes.sendMessageIcons} />
					</IconButton>
					<IconButton
						aria-label="startRecording"
						component="span"
						disabled={loading || recording || ticketStatus !== "open"}
						onClick={handleStartRecording}
					>
						<MicIcon className={classes.sendMessageIcons} />
					</IconButton>
				</div>
			</Paper>
		);
	}
};

export default MessageInput;