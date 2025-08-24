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

// ✅ FUNCIONES DE VALIDACIÓN DE FECHA/HORA (MÁS FLEXIBLES)
const validateScheduleDateTime = (sendAt) => {
	if (!sendAt) {
		return { valid: false, message: "Obligatorio" };
	}

	const now = moment();
	const selectedTime = moment(sendAt);

	// ✅ VALIDACIÓN 1: FECHA/HORA VÁLIDA
	if (!selectedTime.isValid()) {
		return { valid: false, message: "❌ Fecha/hora inválida" };
	}

	// ✅ VALIDACIÓN 2: FECHA/HORA PASADA (solo para fechas pasadas, no futuras)
	if (selectedTime.isBefore(now, 'minute')) {
		return { 
			valid: false, 
			message: `❌ No puedes agendar para una fecha/hora pasada. Hora actual: ${now.format('DD/MM/YYYY HH:mm')}` 
		};
	}

	// ✅ VALIDACIÓN 3: TIEMPO MÍNIMO (5 minutos en lugar de 15)
	const timeDiff = selectedTime.diff(now, 'minutes');
	if (timeDiff < 5) {
		return { 
			valid: false, 
			message: `❌ El tiempo mínimo para agendar es 5 minutos. Hora más temprana permitida: ${now.add(5, 'minutes').format('DD/MM/YYYY HH:mm')}` 
		};
	}

	// ✅ VALIDACIÓN 4: TIEMPO MÁXIMO (1 año)
	if (timeDiff > 525600) { // 365 días * 24 horas * 60 minutos
		return { 
			valid: false, 
			message: "❌ No puedes agendar para más de 1 año en el futuro" 
		};
	}

	// ✅ VALIDACIÓN 5: FECHA INVÁLIDA (30 de febrero, 31 de abril, etc.)
	const day = selectedTime.date();
	const month = selectedTime.month() + 1;
	const year = selectedTime.year();
	
	// Verificar fechas inválidas específicas
	if (month === 2 && day > 29) {
		return { valid: false, message: "❌ Febrero no puede tener más de 29 días" };
	}
	if (month === 2 && day === 29 && !moment([year]).isLeapYear()) {
		return { valid: false, message: "❌ 29 de febrero solo existe en años bisiestos" };
	}
	if ([4, 6, 9, 11].includes(month) && day > 30) {
		return { valid: false, message: `❌ El mes ${month} no puede tener más de 30 días` };
	}

	return { valid: true, message: "" };
};

// ✅ FUNCIÓN DE VALIDACIÓN DE MENSAJE (MÁS FLEXIBLE)
const validateMessage = (body) => {
	if (!body || body.trim().length === 0) {
		return { valid: false, message: "Obligatorio" };
	}
	
	if (body.trim().length < 3) {
		return { valid: false, message: "❌ El mensaje debe tener al menos 3 caracteres" };
	}
	
	// Verificar si solo tiene espacios o caracteres especiales
	const cleanMessage = body.trim().replace(/[^\w\s]/g, '').replace(/\s+/g, '');
	if (cleanMessage.length < 2) {
		return { valid: false, message: "❌ El mensaje debe contener al menos 2 caracteres válidos" };
	}
	
	return { valid: true, message: "" };
};

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
        sendAt: Yup.string().required("Obligatorio"),
        intervalUnit: Yup.string().nullable(),
        intervalValue: Yup.number().nullable(),
        repeatCount: Yup.number().nullable()
});

const ScheduleModal = ({ open, onClose, scheduleId, contactId, cleanContact, reload, ticketId }) => {
	const classes = useStyles();
	const { user } = useContext(AuthContext);

        const initialState = {
                body: "",
                contactId: null,
                whatsappId: null,
                sendAt: moment().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
                sentAt: "",
                intervalUnit: "days",
                intervalValue: 1,
                repeatCount: 0
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
	
	// ✅ ESTADO PARA MODAL DE CONFIRMACIÓN DE AGENDAMIENTO
	const [scheduleConfirmationOpen, setScheduleConfirmationOpen] = useState(false);
	const [scheduleToConfirm, setScheduleToConfirm] = useState(null);

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
		// ✅ LIMPIAR ESTADOS DE CONFIRMACIÓN
		setScheduleConfirmationOpen(false);
		setScheduleToConfirm(null);
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

			// ✅ VALIDACIÓN 2: FECHA/HORA
			const dateTimeValidation = validateScheduleDateTime(values.sendAt);
			if (!dateTimeValidation.valid) {
				toast.error(dateTimeValidation.message);
				return;
			}

			// ✅ VALIDACIÓN 3: MENSAJE
			const messageValidation = validateMessage(values.body);
			if (!messageValidation.valid) {
				toast.error(messageValidation.message);
				return;
			}

			// ✅ VALIDACIÓN 4: CAMBIO MÍNIMO DE 30 MINUTOS (solo para UPDATE)
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

                        // ✅ MOSTRAR CONFIRMACIÓN ANTES DE GUARDAR
                        const scheduleData = {
                                contactId: values.contactId,
                                whatsappId: values.whatsappId,
                                body: values.body,
                                sendAt: values.sendAt,
                                sentAt: null,
                                intervalUnit: values.intervalUnit,
                                intervalValue: values.intervalValue,
                                repeatCount: values.repeatCount
                        };

			// ✅ PREPARAR DATOS PARA CONFIRMACIÓN
			const contact = contacts.find(c => c.id === values.contactId);
			const whatsapp = whatsapps.find(w => w.id === values.whatsappId);
			const formattedDateTime = moment(values.sendAt).format('DD/MM/YYYY HH:mm');

			setScheduleToConfirm({
				...scheduleData,
				contactName: contact ? contact.name : 'Contacto no encontrado',
				whatsappName: whatsapp ? whatsapp.name : 'Conexión no encontrada',
				formattedDateTime: formattedDateTime
			});
			setScheduleConfirmationOpen(true);

		} catch (err) {
			console.log("❌ [ERROR] Error en handleSaveSchedule:", err);
			toastError(err);
		}
	};

	// ✅ FUNCIÓN PARA GUARDAR DESPUÉS DE CONFIRMAR
	const handleConfirmSchedule = async () => {
		try {
			if (!scheduleToConfirm) {
				toast.error("❌ Error: No hay datos para guardar");
				return;
			}

			const { contactName, whatsappName, formattedDateTime, ...scheduleData } = scheduleToConfirm;

			if (scheduleId) {
				await api.put(`/schedules/${scheduleId}`, scheduleData);
				toast.success("✅ Agendamiento actualizado correctamente");
			} else {
				await api.post("/schedules", scheduleData);
				toast.success("✅ Agendamiento creado correctamente");
			}
			
			// ✅ CERRAR MODAL Y LIMPIAR
			setScheduleConfirmationOpen(false);
			setScheduleToConfirm(null);
			
			// ✅ DELAY PARA QUE EL USUARIO VEA LA NOTIFICACIÓN
			setTimeout(() => {
				onClose();
				if (typeof reload === 'function') {
					reload();
				} else {
					window.location.reload();
				}
			}, 1000);
		} catch (err) {
			console.log("❌ [ERROR] Error en handleConfirmSchedule:", err);
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
			
			{/* ✅ MODAL DE CONFIRMACIÓN DE AGENDAMIENTO */}
			<ConfirmationModal
				title="¿ESTÁ SEGURO DE AGENDAR CITA?"
				open={scheduleConfirmationOpen}
				onClose={() => {
					setScheduleConfirmationOpen(false);
					setScheduleToConfirm(null);
				}}
				onConfirm={handleConfirmSchedule}
			>
				{scheduleToConfirm && (
					<div style={{ textAlign: 'left', lineHeight: '1.6' }}>
						<p><strong><span role="img" aria-label="calendar">📅</span> Fecha y Hora:</strong> {scheduleToConfirm.formattedDateTime}</p>
						<p><strong><span role="img" aria-label="person">👤</span> Contacto:</strong> {scheduleToConfirm.contactName}</p>
						<p><strong><span role="img" aria-label="mobile">📱</span> Conexión:</strong> {scheduleToConfirm.whatsappName}</p>
						<p><strong><span role="img" aria-label="message">💬</span> Mensaje:</strong></p>
						<div style={{ 
							background: '#f5f5f5', 
							padding: '10px', 
							borderRadius: '5px', 
							marginTop: '5px',
							maxHeight: '100px',
							overflowY: 'auto'
						}}>
							{scheduleToConfirm.body}
						</div>
						<p style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
							<i>¿Confirma que desea agendar esta cita con los datos mostrados?</i>
						</p>
					</div>
				)}
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
						// ✅ VERIFICAR SI HAY ERRORES DE VALIDACIÓN (solo campos obligatorios)
						const hasValidationErrors = Boolean(
							!values.contactId || 
							!values.whatsappId || 
							!values.body || 
							!values.sendAt
						);
						
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

                                                                <br />
                                                                <div className={classes.multFieldLine}>
                                                                        <Field
                                                                                as={TextField}
                                                                                select
                                                                                label={i18n.t("scheduleModal.form.intervalUnit")}
                                                                                name="intervalUnit"
                                                                                variant="outlined"
                                                                                margin="dense"
                                                                                SelectProps={{ native: true }}
                                                                                fullWidth
                                                                        >
                                                                                <option value="days">{i18n.t("scheduleModal.form.intervalUnitOptions.days")}</option>
                                                                                <option value="weeks">{i18n.t("scheduleModal.form.intervalUnitOptions.weeks")}</option>
                                                                                <option value="months">{i18n.t("scheduleModal.form.intervalUnitOptions.months")}</option>
                                                                        </Field>
                                                                        <Field
                                                                                as={TextField}
                                                                                label={i18n.t("scheduleModal.form.intervalValue")}
                                                                                type="number"
                                                                                name="intervalValue"
                                                                                variant="outlined"
                                                                                margin="dense"
                                                                                fullWidth
                                                                        />
                                                                        <Field
                                                                                as={TextField}
                                                                                label={i18n.t("scheduleModal.form.repeatCount")}
                                                                                type="number"
                                                                                name="repeatCount"
                                                                                variant="outlined"
                                                                                margin="dense"
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
										disabled={isSubmitting || hasValidationErrors}
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
										disabled={isSubmitting || hasValidationErrors}
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