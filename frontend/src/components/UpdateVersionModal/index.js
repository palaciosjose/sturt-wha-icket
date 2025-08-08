import React, { useState, useContext } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  Box,
  Paper
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiDialog-paper": {
      minWidth: 400,
    },
  },
  content: {
    padding: theme.spacing(2),
  },
  progressContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing(3),
  },
  statusText: {
    marginTop: theme.spacing(2),
    textAlign: "center",
  },
  alert: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
  },
  errorAlert: {
    backgroundColor: theme.palette.error.light,
    color: theme.palette.error.contrastText,
  },
  infoAlert: {
    backgroundColor: theme.palette.info.light,
    color: theme.palette.info.contrastText,
  },
}));

const UpdateVersionModal = ({ open, onClose }) => {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [error, setError] = useState(null);

  const handleCheckUpdates = async () => {
    setLoading(true);
    setError(null);
    setUpdateStatus(null);

    try {
      const { data } = await api.get("/system/check-updates");
      setUpdateStatus(data);
    } catch (err) {
      setError(err.response?.data?.error || "Error al verificar actualizaciones");
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setUpdateStatus(null);
    setError(null);
    onClose();
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box className={classes.progressContainer}>
          <CircularProgress />
          <Typography className={classes.statusText}>
            Verificando actualizaciones...
          </Typography>
        </Box>
      );
    }

    if (error) {
      return (
        <Paper className={`${classes.alert} ${classes.errorAlert}`}>
          {error}
        </Paper>
      );
    }

    if (updateStatus) {
      return (
        <Box>
          <Typography variant="h6" gutterBottom>
            Estado de Actualizaciones
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Versión actual:</strong> {updateStatus.currentVersion}
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Última versión disponible:</strong> {updateStatus.latestVersion}
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Estado:</strong>{" "}
            {updateStatus.hasUpdates ? (
              <span style={{ color: "green", fontWeight: "bold" }}>
                <span role="img" aria-label="check">✅</span> Nuevas actualizaciones disponibles
              </span>
            ) : (
              <span style={{ color: "blue", fontWeight: "bold" }}>
                <span role="img" aria-label="check">✅</span> Sistema actualizado
              </span>
            )}
          </Typography>
          {updateStatus.hasUpdates && (
            <Paper className={`${classes.alert} ${classes.infoAlert}`}>
              Hay {updateStatus.commitsAhead} nuevos commits disponibles.
            </Paper>
          )}
        </Box>
      );
    }

    return (
      <Typography variant="body1">
        Haz clic en "Verificar" para comprobar si hay actualizaciones disponibles.
      </Typography>
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} className={classes.root}>
      <DialogTitle>
        {i18n.t("updateVersion.title")}
      </DialogTitle>
      <DialogContent className={classes.content}>
        {renderContent()}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="secondary">
          {i18n.t("updateVersion.buttons.close")}
        </Button>
        {!loading && !updateStatus && (
          <Button onClick={handleCheckUpdates} color="primary" variant="contained">
            {i18n.t("updateVersion.buttons.check")}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default UpdateVersionModal;
