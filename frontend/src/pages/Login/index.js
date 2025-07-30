import React, { useState, useContext, useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";

import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import TextField from "@material-ui/core/TextField";
import Link from "@material-ui/core/Link";
import Grid from "@material-ui/core/Grid"; 
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import Container from "@material-ui/core/Container";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import { nomeEmpresa } from "../../../package.json";
import { AuthContext } from "../../context/Auth/AuthContext";
import { getVersionText } from "../../config/version";
//import logo from "../../assets/logo.png";


const Copyright = () => {
	return (
		<Typography variant="body2" style={{ color: "white" }} align="center">
			{"Copyright "}
 			<Link style={{ color: "white" }} href="#">
 				{ nomeEmpresa }
 			</Link>{" "}
 			{new Date().getFullYear()}
 			{"."}
 			<br />
			<span style={{
				backgroundColor: '#FFD700',
				color: '#000',
				padding: '4px 8px',
				borderRadius: '4px',
				fontSize: '12px',
				fontWeight: 'bold',
				display: 'inline-block',
				minWidth: '60px',
				textAlign: 'center',
				marginTop: '8px'
			}}>
				{getVersionText()}
			</span>
 		</Typography>
 	);
};

const useStyles = makeStyles(theme => ({
	root: {
		width: "100vw",
		height: "100vh",
		background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #1e40af 100%)",
		backgroundRepeat: "no-repeat",
		backgroundSize: "100% 100%",
		backgroundPosition: "center",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		textAlign: "center",
	},
	paper: {
		backgroundColor: theme.palette.login, //DARK MODE PLW DESIGN//
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		padding: "55px 30px",
		borderRadius: "12.5px",
	},
	avatar: {
		margin: theme.spacing(1),  
		backgroundColor: theme.palette.secondary.main,
	},
	form: {
		width: "100%", // Fix IE 11 issue.
		marginTop: theme.spacing(1),
	},
	submit: {
		margin: theme.spacing(3, 0, 2),
	},
	powered: {
		color: "white"
	}
}));

const Login = () => {
	const classes = useStyles();

	const [user, setUser] = useState({ email: "", password: "" });

	const { handleLogin } = useContext(AuthContext);
	const [viewregister, setviewregister] = useState('disabled');

	const handleChangeInput = e => {
		setUser({ ...user, [e.target.name]: e.target.value });
	};
	
	    useEffect(() => {
    	fetchviewregister();
  	}, []);
	
		const fetchviewregister = async () => {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout
			
			const responsev = await api.get("/settings/viewregister", {
				signal: controller.signal
			});
			clearTimeout(timeoutId);
			
			const viewregisterX = responsev?.data?.value;
			// console.log(viewregisterX);
			setviewregister(viewregisterX);
		} catch (error) {
			console.error('Error retrieving viewregister', error);
			// Si hay error 401, 404 o timeout, establecer como disabled por defecto
			setviewregister('disabled');
		}
	};


	const handlSubmit = e => {
		e.preventDefault();
		handleLogin(user);
	};
	
	const logo = `${process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:8080'}/public/logotipos/login.png`;
    const randomValue = Math.random(); // Generate a random number
  
    const logoWithRandom = `${logo}?r=${randomValue}`;

	return (
		<div className={classes.root}>
		<Container component="main" maxWidth="xs">
			<CssBaseline/>
			<div className={classes.paper}>
				<div>
					<img style={{ margin: "0 auto", width: "80%" }} src={logoWithRandom} alt={`${process.env.REACT_APP_NAME_SYSTEM || 'Whaticket'}`} />
				</div>
				{/*<Typography component="h1" variant="h5">
					{i18n.t("login.title")}
				</Typography>*/}
				<form className={classes.form} noValidate onSubmit={handlSubmit}>
					<TextField
						variant="outlined"
						margin="normal"
						required
						fullWidth
						id="email"
						label={i18n.t("login.form.email")}
						name="email"
						value={user.email}
						onChange={handleChangeInput}
						autoComplete="email"
						autoFocus
					/>
					<TextField
						variant="outlined"
						margin="normal"
						required
						fullWidth
						name="password"
						label={i18n.t("login.form.password")}
						type="password"
						id="password"
						value={user.password}
						onChange={handleChangeInput}
						autoComplete="current-password"
					/>
					
					<Grid container justifyContent="flex-end">
					  <Grid item xs={6} style={{ textAlign: "right" }}>
						<Link component={RouterLink} to="/forgetpsw" variant="body2">
						  {i18n.t("login.forgotPassword")}
						</Link>
					  </Grid>
					</Grid>
				
					
					<Button
						type="submit"
						fullWidth
						variant="contained"
						color="primary"
						className={classes.submit}
					>
						{i18n.t("login.buttons.submit")}
					</Button>
                    {viewregister === "enabled" && (
                    <>
					<Grid container>
						<Grid item>
							<Link
								href="#"
								variant="body2"
								component={RouterLink}
								to="/signup"
							>
								{i18n.t("login.buttons.register")}
							</Link>
						</Grid>
					</Grid>
                    </>
                    )}
				
					
				</form>
			
			</div>
			<Box mt={8}><Copyright /></Box>
		</Container>
		</div>
	);
};

export default Login;
