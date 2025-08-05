import React, { useState, useEffect, useContext, useRef } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

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
	const { user } = useContext(AuthContext);

	const initialState = {
		body: "",
		contactId: null,
		whatsappId: null,
		sendAt: moment().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
		sentAt: ""
	};

	const [schedule, setSchedule] = useState(initialState);
	const [currentContact, setCurrentContact] = useState(null);
	const [contacts, setContacts] = useState([]);
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
						setContacts(customList);
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
								// ✅ CORREGIR: Usar whatsappList en lugar de whatsapps
								const whatsapp = whatsappList.find(w => w.id === ticket.whatsappId);
								if (whatsapp) {
									setCurrentWhatsapp(whatsapp);
								} else {
									// No se encontró conexión del ticket
								}
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
					
					// ✅ CORREGIR: Establecer la conexión WhatsApp DESPUÉS de cargar whatsapps
					if (data.whatsappId && whatsappList.length > 0) {
						const whatsapp = whatsappList.find(w => w.id === data.whatsappId);
						if (whatsapp) {
							setCurrentWhatsapp(whatsapp);
						} else {
							// No se encontró conexión con ID
						}
					} else {
						// No hay whatsappId o whatsapps vacío
						if (whatsappList.length > 0) {
							const defaultWhatsapp = whatsappList[0];
							setCurrentWhatsapp(defaultWhatsapp);
							setSchedule(prevState => ({
								...prevState,
								whatsappId: defaultWhatsapp.id
							}));
						}
					}
				})()
			} catch (err) {
				toastError(err);
			}
		}
	}, [open, scheduleId, contactId, ticketId, user]); // ✅ SOLO DEPENDENCIAS ESENCIALES

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

	const handleSaveSchedule = async (values) => {
		try {
			// ✅ VALIDACIÓN 1: CAMPOS OBLIGATORIOS
			if (!values.contactId || !values.whatsappId || !values.body || !values.sendAt) {
				toast.error("❌ Todos los campos son obligatorios: Contacto, Conexión, Mensaje y Fecha/Hora");
				return;
			}

			// ✅ VALIDACIÓN 2: CAMBIO MÍNIMO DE 30 MINUTOS (solo para UPDATE)
			if (scheduleId) {
				const originalSchedule = await api.get(`/schedules/${scheduleId}`);
				const originalTime = moment(originalSchedule.data.sendAt);
				const newTime = moment(values.sendAt);
				const timeDiff = Math.abs(newTime.diff(originalTime, 'minutes'));
				
				if (timeDiff < 30) {
					toast.error("❌ El cambio mínimo debe ser de 30 minutos. Hora original: " + 
						originalTime.format('DD/MM/YYYY HH:mm') + 
						" - Nueva hora: " + newTime.format('DD/MM/YYYY HH:mm'));
					return;
				}
			}

			const scheduleData = {
				contactId: values.contactId,
				whatsappId: values.whatsappId,
				body: values.body,
				sendAt: values.sendAt,
				sentAt: null
			};

			if (scheduleId) {
				await api.put(`/schedules/${scheduleId}`, scheduleData);
				
				// ✅ NOTIFICACIÓN DE ÉXITO
				toast.success("✅ Agendamiento actualizado correctamente");
			} else {
				await api.post("/schedules", scheduleData);
				
				// ✅ NOTIFICACIÓN DE ÉXITO
				toast.success("✅ Agendamiento creado correctamente");
			}
			
			// ✅ DELAY PARA QUE EL USUARIO VEA LA NOTIFICACIÓN
			setTimeout(() => {
				onClose();
				if (typeof reload === 'function') {
					reload();
				} else {
					// Si no hay función reload, recargar la página
					window.location.reload();
				}
			}, 1000); // 1 segundo de delay
		} catch (err) {
			console.log("❌ [ERROR] Error en handleSaveSchedule:", err);
			toastError(err);
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
						handleSaveSchedule(values)
							.then(() => {
								actions.setSubmitting(false);
							})
							.catch((error) => {
								console.error("❌ [UPDATE TEST] ❌ Error en onSubmit:", error);
								actions.setSubmitting(false);
							});
					}}
				>
					{({ touched, errors, isSubmitting, values, setFieldValue, handleSubmit }) => {
						return (
							<Form onSubmit={handleSubmit}>
							<DialogContent dividers>
								<div className={classes.multFieldLine}>
									<FormControl
										variant="outlined"
										fullWidth
									>
										<Autocomplete
											fullWidth
											value={currentContact || null}
											options={contacts}
											onChange={(e, contact) => {
												const contactId = contact ? Number(contact.id) : null;
												setFieldValue("contactId", contactId);
												setSchedule({ ...schedule, contactId });
												setCurrentContact(contact || null);
											}}
											getOptionLabel={(option) => {
												if (!option) return "";
												return option.name || "";
											}}
											getOptionSelected={(option, value) => {
												if (!option || !value) return false;
												return value.id === option.id;
											}}
											renderInput={(params) => (
												<TextField 
													{...params} 
													variant="outlined" 
													placeholder="Contacto"
													error={touched.contactId && Boolean(errors.contactId)}
													helperText={touched.contactId && errors.contactId}
												/>
											)}
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
											value={currentWhatsapp || null}
											options={whatsapps}
											onChange={(e, whatsapp) => {
												const whatsappId = whatsapp ? Number(whatsapp.id) : null;
												setFieldValue("whatsappId", whatsappId);
												setSchedule({ ...schedule, whatsappId });
												setCurrentWhatsapp(whatsapp || null);
											}}
											getOptionLabel={(option) => {
												if (!option) return "";
												return option.name || "";
											}}
											getOptionSelected={(option, value) => {
												if (!option || !value) return false;
												return value.id === option.id;
											}}
											renderInput={(params) => (
												<TextField 
													{...params} 
													variant="outlined" 
													placeholder="Conexión WhatsApp"
													error={touched.whatsappId && Boolean(errors.whatsappId)}
													helperText={touched.whatsappId && errors.whatsappId}
												/>
											)}
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
													{scheduleId ? (
						<Button
							type="submit"
							color="primary"
							disabled={isSubmitting}
							variant="contained"
							className={classes.btnWrapper}
						>
							{i18n.t("scheduleModal.buttons.okEdit")}
							{isSubmitting && (
								<CircularProgress
									size={24}
									className={classes.buttonProgress}
								/>
							)}
						</Button>
								) : (
									<Button
										type="submit"
										color="primary"
										disabled={isSubmitting}
										variant="contained"
										className={classes.btnWrapper}
									>
										{i18n.t("scheduleModal.buttons.okAdd")}
										{isSubmitting && (
											<CircularProgress
												size={24}
												className={classes.buttonProgress}
											/>
										)}
									</Button>
								)}
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