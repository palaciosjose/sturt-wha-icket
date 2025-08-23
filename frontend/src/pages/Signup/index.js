import React, { useState, useEffect, useMemo } from "react";


import * as Yup from "yup";
import { useHistory } from "react-router-dom";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import { Formik, Form, Field } from "formik";

import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import TextField from "@material-ui/core/TextField";
import Link from "@material-ui/core/Link";
import Grid from "@material-ui/core/Grid";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContentText from "@material-ui/core/DialogContentText";

import api from "../../services/api";
import {
	InputLabel,
	MenuItem,
	Select,
} from "@material-ui/core";

import { makeStyles } from "@material-ui/core/styles";
import Container from "@material-ui/core/Container";
import { i18n } from "../../translate/i18n";

import { openApi } from "../../services/api";
import toastError from "../../errors/toastError";
import moment from "moment";

const useStyles = makeStyles(theme => ({
	paper: {
		marginTop: theme.spacing(4),
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		padding: theme.spacing(4),
		borderRadius: theme.spacing(2),
		boxShadow: theme.shadows[8],
		backgroundColor: theme.palette.background.paper,
	},
	avatar: {
		margin: theme.spacing(1),
		backgroundColor: theme.palette.secondary.main,
	},
	form: {
		width: "100%",
		marginTop: theme.spacing(2),
	},
	submit: {
		margin: theme.spacing(4, 0, 2),
		padding: theme.spacing(1.5),
		fontSize: "1.1rem",
		fontWeight: "bold",
		borderRadius: theme.spacing(1),
		textTransform: "none",
	},
	logoContainer: {
		marginBottom: theme.spacing(2),
		textAlign: "center",
	},
	fieldContainer: {
		marginBottom: theme.spacing(2),
	},
	confirmModal: {
		"& .MuiDialog-paper": {
			minWidth: "500px",
			maxWidth: "600px",
		},
	},
	confirmModalTitle: {
		backgroundColor: theme.palette.primary.main,
		color: theme.palette.primary.contrastText,
		padding: theme.spacing(2),
	},
	confirmModalContent: {
		padding: theme.spacing(3),
	},
	confirmModalActions: {
		padding: theme.spacing(2, 3),
		justifyContent: "space-between",
	},
	dataPreview: {
		backgroundColor: theme.palette.grey[50],
		padding: theme.spacing(2),
		borderRadius: theme.spacing(1),
		marginTop: theme.spacing(2),
	},
	dataPreviewItem: {
		display: "flex",
		justifyContent: "space-between",
		marginBottom: theme.spacing(1),
		"&:last-child": {
			marginBottom: 0,
		},
	},
	dataPreviewLabel: {
		fontWeight: "bold",
		color: theme.palette.text.secondary,
	},
	dataPreviewValue: {
		color: theme.palette.text.primary,
	},
}));

const UserSchema = Yup.object().shape({
	name: Yup.string()
		.min(2, "El nombre debe tener al menos 2 caracteres")
		.max(50, "El nombre no puede exceder 50 caracteres")
		.required("El nombre es obligatorio"),
	password: Yup.string()
		.min(5, "La contraseña debe tener al menos 5 caracteres")
		.max(50, "La contraseña no puede exceder 50 caracteres")
		.required("La contraseña es obligatoria"),
	email: Yup.string()
		.email("Ingrese un email válido")
		.required("El email es obligatorio"),
	phone: Yup.string()
		.min(10, "El teléfono debe tener al menos 10 dígitos")
		.required("El teléfono es obligatorio"),
	planId: Yup.number().default(4),
});

const SignUp = () => {
	const classes = useStyles();
	const history = useHistory();
	const [allowregister, setallowregister] = useState('enabled');
    const [trial, settrial] = useState('3');
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [pendingRegistration, setPendingRegistration] = useState(null);


	useEffect(() => {
		let isMounted = true;
		
		const fetchData = async () => {
			try {
				await fetchallowregister();
				await fetchtrial();
			} catch (error) {
				if (isMounted) {
					console.error('Error in initial fetch:', error);
				}
			}
		};
		
		fetchData();
		
		return () => {
			isMounted = false;
		};
	}, []);


    const fetchtrial = async () => {
  
 
    try {
        const responsevvv = await api.get("/settings/trial");
        const allowtrialX = responsevvv.data.value;
        //console.log(allowregisterX);
        settrial(allowtrialX);
        } catch (error) {
            console.error('Error retrieving trial', error);
        }
    };


    const fetchallowregister = async () => {
  
 
    try {
        const responsevv = await api.get("/settings/allowregister");
        const allowregisterX = responsevv.data.value;
        //console.log(allowregisterX);
        setallowregister(allowregisterX);
        } catch (error) {
            console.error('Error retrieving allowregister', error);
        }
    };

    if(allowregister === "disabled"){
    	history.push("/login");    
    }



	const initialState = { name: "", email: "", phone: "", password: "", planId: 4 };

	const [user] = useState(initialState);
	const dueDate = useMemo(() => moment().add(trial, "day").format(), [trial]);
	const handleSignUp = async values => {
		Object.assign(values, { recurrence: "MENSAL" });
		Object.assign(values, { dueDate: dueDate });
		Object.assign(values, { status: true });
		Object.assign(values, { campaignsEnabled: true });
		
		// Guardar datos pendientes y mostrar modal de confirmación
		setPendingRegistration(values);
		setShowConfirmModal(true);
	};

	const confirmRegistration = async () => {
		if (!pendingRegistration) return;
		
		try {
			await openApi.post("/companies/cadastro", pendingRegistration);
			toast.success(i18n.t("signup.toasts.success"));
			
			// Cerrar modal y limpiar estado
			setShowConfirmModal(false);
			setPendingRegistration(null);
			
			// Redirigir al login
			history.push("/login");
		} catch (err) {
			console.error("❌ [SIGNUP] Error en registro:", err);
			toastError(err);
			
			// Cerrar modal en caso de error
			setShowConfirmModal(false);
			setPendingRegistration(null);
		}
	};

	const cancelRegistration = () => {
		setShowConfirmModal(false);
		setPendingRegistration(null);
	};

	// ✅ Estado para planes (puede ser útil en el futuro)
	// const [plans, setPlans] = useState([]);

	// useEffect(() => {
	// 	let isMounted = true;
		
	// 	const fetchPlans = async () => {
	// 		try {
	// 			console.log("🔍 [SIGNUP] Obteniendo planes... (ejecutado una sola vez)");
				
	// 			// Llamada directa a la API sin usar el hook
	// 			const { data } = await api.request({
	// 			url: '/plans/all',
	// 			method: 'GET'
	// 			});
				
	// 			console.log("✅ [SIGNUP] Planes obtenidos:", data);
				
	// 			if (isMounted) {
	// 				setPlans(data);
	// 			console.log("📋 [SIGNUP] Estado de planes actualizado");
	// 			}
	// 		} catch (error) {
	// 			if (isMounted) {
	// 				console.log('❌ [SIGNUP] Error obteniendo planes:', error);
	// 			}
	// 		}
	// 	};
		
	// 	fetchPlans();
		
	// 	return () => {
	// 			console.log("🧹 [SIGNUP] Limpiando useEffect de planes");
	// 			isMounted = false;
	// 		};
	// }, []); // Array vacío - se ejecuta solo una vez

	const logo = `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080'}/public/logotipos/signup.png`;
    	const logoWithRandom = useMemo(() => `${logo}?r=${Math.random()}`, [logo]); // Generar solo una vez


	return (
		<Container component="main" maxWidth="md">
			<CssBaseline />
			<div className={classes.paper}>
				<div className={classes.logoContainer}>
				<img style={{ margin: "0 auto", width: "50%" }} src={logoWithRandom} alt="Whaticket" />
				</div>
				
				{/* Título y Descripción */}
				<Box mt={3} mb={4} textAlign="center">
					<Typography component="h1" variant="h4" color="primary" gutterBottom>
						Crear Cuenta Gratuita
					</Typography>
					<Typography variant="body1" color="textSecondary">
						Prueba nuestro sistema por {trial} días sin compromiso
					</Typography>
				</Box>
				{/* <form className={classes.form} noValidate onSubmit={handleSignUp}> */}
				<Formik
					initialValues={user}
					enableReinitialize={true}
					validationSchema={UserSchema}
					validateOnChange={true}
					validateOnBlur={true}
					onSubmit={(values, actions) => {
						console.log("Formulario enviado con valores:", values);
						setTimeout(() => {
							handleSignUp(values);
							actions.setSubmitting(false);
						}, 400);
					}}
				>
					{({ touched, errors, isSubmitting, values, setFieldValue }) => (
						<Form className={classes.form}>
							<Grid container spacing={3}>
								<Grid item xs={12} className={classes.fieldContainer}>
									<Field
										as={TextField}
										variant="outlined"
										fullWidth
										id="name"
										name="name"
										label={i18n.t("signup.form.name")}
										error={touched.name && Boolean(errors.name)}
										helperText={touched.name && errors.name}
										autoComplete="name"
										required
									/>
								</Grid>

																<Grid item xs={12} className={classes.fieldContainer}>
									<Field
										as={TextField}
										variant="outlined"
										fullWidth
										id="email"
										label={i18n.t("signup.form.email")}
										name="email"
										error={touched.email && Boolean(errors.email)}
										helperText={touched.email && errors.email}
										autoComplete="email"
										required
									/>
								</Grid>
								
							<Grid item xs={12} className={classes.fieldContainer}>
								<Field
									as={TextField}
									variant="outlined"
									fullWidth
									id="phone"
									name="phone"
									label={i18n.t("companies.form.phone")}
									error={touched.phone && Boolean(errors.phone)}
									helperText={touched.phone && errors.phone}
									autoComplete="phone"
									required
									onChange={(e) => {
										const value = e.target.value;
										console.log("Teléfono ingresado:", value);
										setFieldValue('phone', value);
										}}
									inputProps={{ 
										maxLength: 15,
										placeholder: "(99) 99999-9999"
									}}
								/>
							</Grid>
								<Grid item xs={12} className={classes.fieldContainer}>
									<Field
										as={TextField}
										variant="outlined"
										fullWidth
										name="password"
										error={touched.password && Boolean(errors.password)}
										helperText={touched.password && errors.password}
										label={i18n.t("signup.form.password")}
										type="password"
										id="password"
										autoComplete="current-password"
										required
									/>
								</Grid>
								<Grid item xs={12} className={classes.fieldContainer}>
									<InputLabel htmlFor="plan-selection">Plan de Suscripción</InputLabel>
									<Field
										as={Select}
										variant="outlined"
										fullWidth
										id="plan-selection"
										name="planId"
										disabled
										value={4}
									>
                                        <MenuItem value={4}>
                                        	<em><span role="img" aria-label="cuenta gratuita">🆓</span> Plan de Demostración - {trial} días gratis</em>
										</MenuItem>
									</Field>
									<Box mt={1} color="textSecondary" fontSize="0.75rem">
										Este es un plan de demostración para que pruebes el sistema
									</Box>
								</Grid>
							</Grid>
							<Button
								type="submit"
								fullWidth
								variant="contained"
								color="primary"
								className={classes.submit}
								size="large"
								disabled={isSubmitting}
							>
								{isSubmitting ? "Creando cuenta..." : (
									<>
										<span role="img" aria-label="cuenta gratuita">🆓</span> Crear Cuenta Gratuita
									</>
								)}
							</Button>
							<Grid container justifyContent="flex-end">
								<Grid item>
									<Link
										href="#"
										variant="body2"
										component={RouterLink}
										to="/login"
									>
										{i18n.t("signup.buttons.login")}
									</Link>
								</Grid>
							</Grid>
						</Form>
					)}
				</Formik>
			</div>
			<Box mt={5}>{/* <Copyright /> */}</Box>
			
			{/* Modal de Confirmación */}
			<Dialog
				open={showConfirmModal}
				onClose={cancelRegistration}
				className={classes.confirmModal}
				maxWidth="md"
				fullWidth
			>
				<DialogTitle className={classes.confirmModalTitle}>
					<span role="img" aria-label="cuenta gratuita">🆓</span> Confirmar Registro de Cuenta Gratuita
				</DialogTitle>
				
				<DialogContent className={classes.confirmModalContent}>
					<DialogContentText>
						¿Estás seguro de que quieres crear esta cuenta? Revisa los datos antes de confirmar:
					</DialogContentText>
					
					{pendingRegistration && (
						<Box className={classes.dataPreview}>
							<Box className={classes.dataPreviewItem}>
								<span className={classes.dataPreviewLabel}>Nombre de Empresa:</span>
								<span className={classes.dataPreviewValue}>{pendingRegistration.name}</span>
							</Box>
							<Box className={classes.dataPreviewItem}>
								<span className={classes.dataPreviewLabel}>Correo Electrónico:</span>
								<span className={classes.dataPreviewValue}>{pendingRegistration.email}</span>
							</Box>
							<Box className={classes.dataPreviewItem}>
								<span className={classes.dataPreviewLabel}>Número de WhatsApp:</span>
								<span className={classes.dataPreviewValue}>{pendingRegistration.phone}</span>
							</Box>
							<Box className={classes.dataPreviewItem}>
								<span className={classes.dataPreviewLabel}>Plan:</span>
								<span className={classes.dataPreviewValue}>
									<span role="img" aria-label="cuenta gratuita">🆓</span> Plan de Demostración - {trial} días gratis
								</span>
							</Box>
							<Box className={classes.dataPreviewItem}>
								<span className={classes.dataPreviewLabel}>Fecha de Vencimiento:</span>
								<span className={classes.dataPreviewValue}>{moment(pendingRegistration.dueDate).format('DD/MM/YYYY')}</span>
							</Box>
							<Box className={classes.dataPreviewItem}>
								<span className={classes.dataPreviewLabel}>Recurrencia:</span>
								<span className={classes.dataPreviewValue}>{pendingRegistration.recurrence}</span>
							</Box>
						</Box>
					)}
					
					<DialogContentText style={{ marginTop: '16px', fontSize: '0.9rem', color: '#666' }}>
						<span role="img" aria-label="advertencia">⚠️</span> Una vez confirmado, se creará la cuenta y recibirás un email de confirmación.
					</DialogContentText>
				</DialogContent>
				
				<DialogActions className={classes.confirmModalActions}>
					<Button
						onClick={cancelRegistration}
						color="secondary"
						variant="outlined"
						size="large"
					>
						<span role="img" aria-label="cancelar">❌</span> Cancelar
					</Button>
					<Button
						onClick={confirmRegistration}
						color="primary"
						variant="contained"
						size="large"
						autoFocus
					>
						<span role="img" aria-label="confirmar">✅</span> Confirmar Registro
					</Button>
				</DialogActions>
			</Dialog>
		</Container>
	);
};

export default SignUp;
