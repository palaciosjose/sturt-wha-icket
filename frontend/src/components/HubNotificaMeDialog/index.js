import React, { useState, useEffect } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import {
    Button,
    TextField,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    CircularProgress,
    MenuItem,
} from "@material-ui/core";

import api from "../../services/api";
import toastError from "../../errors/toastError";

// Estilos personalizados
const useStyles = makeStyles((theme) => ({
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
}));

// Esquema de validación con Yup
const HubNotificaMeSchema = Yup.object().shape({
    nome: Yup.string().required("Nombre es obligatorio"),
    token: Yup.string().required("Token es obligatorio"),
    tipo: Yup.string()
        .oneOf(["Facebook", "Instagram","Webchat"], "Tipo inválido")
        .required("Tipo es obligatorio"),
});

const HubNotificaMeDialog = ({ open, onClose, hubnotificameId }) => {
    const classes = useStyles();

    const initialState = {
        nome: "",
        token: "",
        tipo: "",
    };

    const [hubnotificame, setHubNotificaMe] = useState(initialState);

    // Cargar datos si hay un ID
    useEffect(() => {
        const fetchData = async () => {
            try {
                if (!hubnotificameId) return;
                // envia el formulario hacia la siguiente dirección
                const { data } = await api.get(`/hub-notificame/${hubnotificameId}`);
                setHubNotificaMe({
                    nome: data.nome,
                    token: data.token,
                    tipo: data.tipo,
                });
            } catch (err) {
                toastError(err);
            }
        };
        fetchData();
    }, [hubnotificameId, open]);

    // Manejar cierre del modal
    const handleClose = () => {
        setHubNotificaMe(initialState);
        onClose();
    };

    // Guardar datos
    const handleSaveHubNotificaMe = async (values) => {
        try {
            await api.post("/hub-notificame", values);
            toast.success("¡Token agregado correctamente!");
            handleClose();
        } catch (err) {
            toastError(err);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
            <DialogTitle>Agregar Token</DialogTitle>
            <Formik
                initialValues={hubnotificame}
                enableReinitialize
                validationSchema={HubNotificaMeSchema}
                onSubmit={handleSaveHubNotificaMe}
            >
                {({ touched, errors, isSubmitting }) => (
                    <Form>
                        <DialogContent dividers>
                            {/* Campo Nome */}
                            <Field
                                as={TextField}
                                label="Nombre"
                                name="nome"
                                error={touched.nome && Boolean(errors.nome)}
                                helperText={touched.nome && errors.nome}
                                variant="outlined"
                                margin="dense"
                                fullWidth
                            />

                            {/* Campo Token */}
                            <Field
                                as={TextField}
                                label="Token"
                                name="token"
                                error={touched.token && Boolean(errors.token)}
                                helperText={touched.token && errors.token}
                                variant="outlined"
                                margin="dense"
                                fullWidth
                            />

                            {/* Select para elegir el tipo */}
                            <Field
                                as={TextField}
                                select
                                label="Tipo"
                                name="tipo"
                                error={touched.tipo && Boolean(errors.tipo)}
                                helperText={touched.tipo && errors.tipo}
                                variant="outlined"
                                margin="dense"
                                fullWidth
                            >
                                <MenuItem value="Facebook">Facebook</MenuItem>
                                <MenuItem value="Instagram">Instagram</MenuItem>
                                <MenuItem value="Webchat">WebChat</MenuItem>
                            </Field>
                        </DialogContent>
                        <DialogActions>
                            <Button
                                onClick={handleClose}
                                color="secondary"
                                disabled={isSubmitting}
                                variant="outlined"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                color="primary"
                                disabled={isSubmitting}
                                variant="contained"
                                className={classes.btnWrapper}
                            >
                                Agregar
                                {isSubmitting && (
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
    );
};

export default HubNotificaMeDialog; 