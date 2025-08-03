import React, { useState, useEffect, useContext, useRef } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { FormControl, Grid, IconButton } from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import moment from "moment"
import { AuthContext } from "../../context/Auth/AuthContext";
import { isArray, capitalize } from "lodash";
import DeleteOutline from "@material-ui/icons/DeleteOutline";
import AttachFile from "@material-ui/icons/AttachFile";
import { head } from "lodash";
import ConfirmationModal from "../ConfirmationModal";
import logger from "../../utils/logger";


const useStyles = makeStyles(theme => ({
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
		color: green[500],
		position: "absolute",
		top: "50%",
		left: "50%",
		marginTop: -12,
		marginLeft: -12,
	},
	formControl: {
		margin: theme.spacing(1),
		minWidth: 120,
	},
}));

const ScheduleSchema = Yup.object().shape({
	body: Yup.string()
		.min(5, "Mensaje muy corto")
		.required("Obligatorio"),
	contactId: Yup.number().nullable().required("Obligatorio"),
	whatsappId: Yup.number().nullable().required("Obligatorio"),
	sendAt: Yup.string().required("Obligatorio")
});

const ScheduleModal = ({ open, onClose, scheduleId, contactId, cleanContact, reload, ticketId }) => {
	const classes = useStyles();
	const history = useHistory();
	const { user } = useContext(AuthContext);

	const initialState = {
		body: "",
		contactId: null,
		whatsappId: null,
		sendAt: moment().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
		sentAt: ""
	};

	const initialContact = {
		id: null,
		name: ""
	}

	const [schedule, setSchedule] = useState(initialState);
	const [currentContact, setCurrentContact] = useState(initialContact);
	const [contacts, setContacts] = useState([initialContact]);
	const [whatsapps, setWhatsapps] = useState([]);
	const [currentWhatsapp, setCurrentWhatsapp] = useState(null);
	const [attachment, setAttachment] = useState(null);
	const attachmentFile = useRef(null);
	const [confirmationOpen, setConfirmationOpen] = useState(false);
	const [cancelConfirmationOpen, setCancelConfirmationOpen] = useState(false);
	const messageInputRef = useRef();

	useEffect(() => {
		if (contactId && contacts.length) {
			const contact = contacts.find(c => c.id === contactId);
			if (contact) {
				setCurrentContact(contact);
			}
		}
	}, [contactId, contacts]);

	useEffect(() => {
		const { companyId } = user;
		if (open) {
			try {
				(async () => {
					// Cargar contactos
					const { data: contactList } = await api.get('/contacts/list', { params: { companyId: companyId } });
					let customList = contactList.map((c) => ({ id: c.id, name: c.name }));
					if (isArray(customList)) {
						setContacts([{ id: "", name: "" }, ...customList]);
					}
					
					// Cargar conexiones WhatsApp
					const { data: whatsappList } = await api.get('/whatsapp', { params: { companyId: companyId } });
					if (isArray(whatsappList)) {
						setWhatsapps(whatsappList);
					}
					
					if (contactId) {
						setSchedule(prevState => {
							return { ...prevState, contactId }
						});
					}
					
					// Si hay ticketId, obtener el whatsappId del ticket
					if (ticketId) {
						try {
							const { data: ticket } = await api.get(`/tickets/${ticketId}`);
							if (ticket && ticket.whatsappId) {
								setSchedule(prevState => {
									return { ...prevState, whatsappId: ticket.whatsappId }
								});
								setCurrentWhatsapp(whatsapps.find(w => w.id === ticket.whatsappId));
								logger.dashboard.debug(`[ScheduleModal] Usando WhatsApp del ticket: ${ticket.whatsappId}`);
							}
						} catch (err) {
							logger.dashboard.error(`[ScheduleModal] Error obteniendo ticket: ${err.message}`);
						}
					}

					if (!scheduleId) return;

					const { data } = await api.get(`/schedules/${scheduleId}`);
					setSchedule(prevState => {
						return { ...prevState, ...data, sendAt: moment(data.sendAt).format('YYYY-MM-DDTHH:mm') };
					});
					setCurrentContact(data.contact);
				})()
			} catch (err) {
				toastError(err);
			}
		}
	}, [scheduleId, contactId, open, user, ticketId, whatsapps]);

	const handleClose = () => {
		onClose();
		setAttachment(null);
		setSchedule(initialState);
	};

	const handleAttachmentFile = (e) => {
		const file = head(e.target.files);
		if (file) {
			setAttachment(file);
		}
	};

	const handleSaveSchedule = async values => {
		console.log("�� [DEBUG] handleSaveSchedule iniciado con values:", values);
		const scheduleData = { ...values, userId: user.id };
		console.log("🔍 [DEBUG] scheduleData preparado:", scheduleData);
		console.log("🔍 [DEBUG] scheduleId:", scheduleId);
		console.log("🔍 [DEBUG] attachment:", attachment);
		
		try {
			if (scheduleId) {
				console.log("🔍 [DEBUG] Actualizando agendamiento existente...");
				const response = await api.put(`/schedules/${scheduleId}`, scheduleData);
				console.log("🔍 [DEBUG] Respuesta de actualización:", response);
				
				if (attachment != null) {
					console.log("🔍 [DEBUG] Subiendo archivo adjunto...");
					const formData = new FormData();
					formData.append("file", attachment);
					await api.post(
						`/schedules/${scheduleId}/media-upload`,
						formData
					);
					console.log("🔍 [DEBUG] Archivo adjunto subido exitosamente");
				}
				
				// Si es una reprogramación del sistema de recordatorios, actualizar página
				if (response.data && response.data.isReminderSystem) {
					console.log("🔍 [DEBUG] Es sistema de recordatorios, recargando página...");
					toast.success("Reunión reprogramada exitosamente");
					window.location.reload();
					return;
				}
			} else {
				console.log("🔍 [DEBUG] Creando nuevo agendamiento...");
				const { data } = await api.post("/schedules", scheduleData);
				console.log("🔍 [DEBUG] Respuesta de creación:", data);
				
				if (attachment != null) {
					console.log("🔍 [DEBUG] Subiendo archivo adjunto para nuevo agendamiento...");
					const formData = new FormData();
					formData.append("file", attachment);
					await api.post(`/schedules/${data.id}/media-upload`, formData);
					console.log("🔍 [DEBUG] Archivo adjunto subido exitosamente");
				}
			}
			console.log("🔍 [DEBUG] Mostrando toast de éxito...");
			toast.success(i18n.t("scheduleModal.success"));
			
			if (typeof reload == 'function') {
				console.log("🔍 [DEBUG] Ejecutando función reload...");
				reload();
			}
			
			if (contactId) {
				if (typeof cleanContact === 'function') {
					console.log("🔍 [DEBUG] Ejecutando cleanContact y navegando...");
					cleanContact();
					history.push('/schedules');
				}
			}
			
			console.log("🔍 [DEBUG] Limpiando estado y cerrando modal...");
			setCurrentContact(initialContact);
			setSchedule(initialState);
			handleClose();
			console.log("🔍 [DEBUG] handleSaveSchedule completado exitosamente");
		} catch (err) {
			console.error("❌ [ERROR] Error en handleSaveSchedule:", err);
			console.error("❌ [ERROR] Detalles del error:", err.response?.data || err.message);
			toastError(err);
			throw err; // Re-lanzar el error para que Formik lo maneje
		}
	};


	const deleteMedia = async () => {
		if (attachment) {
			setAttachment(null);
			attachmentFile.current.value = null;
		}

		if (schedule.mediaPath) {
			await api.delete(`/schedules/${schedule.id}/media-upload`);
			setSchedule((prev) => ({
				...prev,
				mediaPath: null,
			}));
			toast.success(i18n.t("scheduleModal.toasts.deleted"));
			if (typeof reload == "function") {
				logger.dashboard.debug("Reload function:", reload);
				logger.dashboard.debug("Executing reload");
				reload();
			}
		}
	};

	const handleCancelReminder = async () => {
		try {
			await api.post(`/schedules/${scheduleId}/cancel-reminder`);
			toast.success("Reunión cancelada exitosamente");
			if (typeof reload == 'function') {
				reload();
			}
			// Forzar actualización de página para eliminar residuos
			window.location.reload();
		} catch (err) {
			toastError(err);
		}
		setCancelConfirmationOpen(false);
	};

	return (
		<div className={classes.root}>
			<ConfirmationModal
				title={i18n.t("scheduleModal.confirmationModal.deleteTitle")}
				open={confirmationOpen}
				onClose={() => setConfirmationOpen(false)}
				onConfirm={deleteMedia}
			>
				{i18n.t("scheduleModal.confirmationModal.deleteMessage")}
			</ConfirmationModal>
			<ConfirmationModal
				title="Cancelar Reunión"
				open={cancelConfirmationOpen}
				onClose={() => setCancelConfirmationOpen(false)}
				onConfirm={handleCancelReminder}
			>
				¿Está seguro que desea cancelar esta reunión? Se enviará un mensaje de cancelación al contacto.
			</ConfirmationModal>
			<Dialog
				open={open}
				onClose={handleClose}
				maxWidth="xs"
				fullWidth
				scroll="paper"
			>
				<DialogTitle id="form-dialog-title">
					{schedule.status === 'ERRO' ? 'Error de Envío' : `Mensaje ${capitalize(schedule.status)}`}
				</DialogTitle>
				<div style={{ display: "none" }}>
					<input
						type="file"
						accept=".png,.jpg,.jpeg"
						ref={attachmentFile}
						onChange={(e) => handleAttachmentFile(e)}
					/>
				</div>
				<Formik
					initialValues={schedule}
					enableReinitialize={true}
					validationSchema={ScheduleSchema}
					onSubmit={(values, actions) => {
						console.log("🔍 [DEBUG] onSubmit iniciado con valores:", values);
						console.log("🔍 [DEBUG] actions:", actions);
						
						// Ejecutar de forma síncrona para evitar problemas de listener
						handleSaveSchedule(values)
							.then(() => {
								console.log("🔍 [DEBUG] handleSaveSchedule completado exitosamente");
								actions.setSubmitting(false);
								console.log("🔍 [DEBUG] actions.setSubmitting(false) ejecutado");
							})
							.catch((error) => {
								console.error("❌ [ERROR] Error en onSubmit:", error);
								actions.setSubmitting(false);
								console.log("🔍 [DEBUG] actions.setSubmitting(false) ejecutado después del error");
							});
					}}
					validate={(values) => {
						console.log("🔍 [DEBUG] Formik validate llamado con:", values);
						return {};
					}}
				>
					{({ touched, errors, isSubmitting, values, setFieldValue, handleSubmit }) => {
						console.log("🔍 [DEBUG] Formik render - isSubmitting:", isSubmitting);
						console.log("🔍 [DEBUG] Formik render - errors:", errors);
						
						return (
							<Form onSubmit={(e) => {
								console.log("🔍 [DEBUG] Form onSubmit llamado");
								handleSubmit(e);
							}}>
							<DialogContent dividers>
								<div className={classes.multFieldLine}>
									<FormControl
										variant="outlined"
										fullWidth
									>
										<Autocomplete
											fullWidth
											value={currentContact}
											options={contacts}
											onChange={(e, contact) => {
												const contactId = contact ? Number(contact.id) : null;
												setSchedule({ ...schedule, contactId });
												setCurrentContact(contact ? contact : initialContact);
											}}
											getOptionLabel={(option) => option.name}
											getOptionSelected={(option, value) => {
												return value.id === option.id
											}}
											renderInput={(params) => <TextField {...params} variant="outlined" placeholder="Contacto" />}
										/>
									</FormControl>
								</div>
								<br />
								<div className={classes.multFieldLine}>
									<FormControl
										variant="outlined"
										fullWidth
									>
										<Autocomplete
											fullWidth
											value={currentWhatsapp}
											options={whatsapps}
											onChange={(e, whatsapp) => {
												const whatsappId = whatsapp ? Number(whatsapp.id) : null;
												setSchedule({ ...schedule, whatsappId });
												setCurrentWhatsapp(whatsapp ? whatsapp : null);
											}}
											getOptionLabel={(option) => option.name}
											getOptionSelected={(option, value) => {
												return value && value.id === option.id
											}}
											renderInput={(params) => <TextField {...params} variant="outlined" placeholder="Conexión WhatsApp" />}
										/>
									</FormControl>
								</div>
								<br />
								<div className={classes.multFieldLine}>
									<Field
										as={TextField}
										rows={9}
										multiline={true}
										label={i18n.t("scheduleModal.form.body")}
										name="body"
										inputRef={messageInputRef}
										error={touched.body && Boolean(errors.body)}
										helperText={touched.body && errors.body}
										variant="outlined"
										margin="dense"
										fullWidth
									/>
								</div>

								<br />
								<div className={classes.multFieldLine}>
									<Field
										as={TextField}
										label={i18n.t("scheduleModal.form.sendAt")}
										type="datetime-local"
										name="sendAt"
										InputLabelProps={{
											shrink: true,
										}}
										error={touched.sendAt && Boolean(errors.sendAt)}
										helperText={touched.sendAt && errors.sendAt}
										variant="outlined"
										fullWidth
									/>
								</div>
								{(schedule.mediaPath || attachment) && (
									<Grid xs={12} item>
										<Button startIcon={<AttachFile />}>
											{attachment ? attachment.name : schedule.mediaName}
										</Button>
										<IconButton
											onClick={() => setConfirmationOpen(true)}
											color="secondary"
										>
											<DeleteOutline color="secondary" />
										</IconButton>
									</Grid>
								)}
							</DialogContent>
							<DialogActions>
								{!attachment && !schedule.mediaPath && (
									<Button
										color="primary"
										onClick={() => attachmentFile.current.click()}
										disabled={isSubmitting}
										variant="outlined"
									>
										ADJUNTAR
									</Button>
								)}
								{scheduleId && schedule.isReminderSystem && (
									<Button
										onClick={() => setCancelConfirmationOpen(true)}
										color="secondary"
										disabled={isSubmitting}
										variant="outlined"
									>
										CANCELAR
									</Button>
								)}
								<Button
									onClick={handleClose}
									color="secondary"
									disabled={isSubmitting}
									variant="outlined"
								>
									SALIR
								</Button>
								{((schedule.sentAt === null || schedule.sentAt === "") && 
								 !scheduleId) || (scheduleId && moment(schedule.sendAt).isAfter(moment())) ? (
									<Button
										type="submit"
										color="primary"
										disabled={isSubmitting}
										variant="contained"
										className={classes.btnWrapper}
										onClick={() => console.log("🔍 [DEBUG] Botón GUARDAR presionado")}
									>
										{scheduleId
											? `${i18n.t("scheduleModal.buttons.okEdit")}`
											: `${i18n.t("scheduleModal.buttons.okAdd")}`}
										{isSubmitting && (
											<CircularProgress
												size={24}
												className={classes.buttonProgress}
											/>
										)}
									</Button>
								) : null}
							</DialogActions>
						</Form>
					);
				}}
				</Formik>
			</Dialog>
		</div>
	);
};

export default ScheduleModal;