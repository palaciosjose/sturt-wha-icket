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
  Paper,
  LinearProgress
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
    flexDirection: "column",
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
  successAlert: {
    backgroundColor: theme.palette.success.light,
    color: theme.palette.success.contrastText,
  },
  updateButton: {
    marginTop: theme.spacing(2),
  },
  progressBar: {
    width: "100%",
    marginTop: theme.spacing(2),
  },
}));

const UpdateVersionModal = ({ open, onClose }) => {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [error, setError] = useState(null);
  const [updateProgress, setUpdateProgress] = useState(0);

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

  const handlePerformUpdate = async () => {
    if (!updateStatus?.hasUpdates) {
      setError("No hay actualizaciones disponibles");
      return;
    }

    setUpdating(true);
    setError(null);
    setUpdateProgress(0);

    try {
      // Simular progreso
      const progressInterval = setInterval(() => {
        setUpdateProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const { data } = await api.post("/system/perform-update", {
        previousVersion: updateStatus.currentVersion
      });

      clearInterval(progressInterval);
      setUpdateProgress(100);

      // Mostrar éxito
      setUpdateStatus({
        ...updateStatus,
        updateCompleted: true,
        newVersion: data.newVersion,
        newMessage: data.newMessage,
        newAuthor: data.newAuthor,
        newDate: data.newDate
      });

      // Recargar la página después de 3 segundos
      setTimeout(() => {
        window.location.reload();
      }, 3000);

    } catch (err) {
      setError(err.response?.data?.error || "Error durante la actualización");
      toastError(err);
      setUpdateProgress(0);
    } finally {
      setUpdating(false);
    }
  };

  const handleClose = () => {
    if (!updating) {
      setUpdateStatus(null);
      setError(null);
      setUpdateProgress(0);
      onClose();
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box className={classes.progressContainer}>
          <CircularProgress />
          <Typography className={classes.statusText}>
            {i18n.t("updateVersion.status.checking")}
          </Typography>
        </Box>
      );
    }

    if (updating) {
      return (
        <Box className={classes.progressContainer}>
          <CircularProgress />
          <Typography className={classes.statusText}>
            Actualizando sistema...
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={updateProgress} 
            className={classes.progressBar}
          />
          <Typography variant="body2" className={classes.statusText}>
            {updateProgress}% completado
          </Typography>
        </Box>
      );
    }

    if (error) {
      return (
        <Paper className={`${classes.alert} ${classes.errorAlert}`}>
          <Typography variant="h6" gutterBottom>
            Error
          </Typography>
          <Typography variant="body2">
            {error}
          </Typography>
        </Paper>
      );
    }

    if (updateStatus?.updateCompleted) {
      return (
        <Paper className={`${classes.alert} ${classes.successAlert}`}>
          <Typography variant="h6" gutterBottom>
            <span role="img" aria-label="success">✅</span> Actualización Completada
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Nueva versión:</strong> {updateStatus.newVersion}
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Mensaje:</strong> {updateStatus.newMessage}
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Autor:</strong> {updateStatus.newAuthor}
          </Typography>
          <Typography variant="body2">
            La página se recargará automáticamente en unos segundos...
          </Typography>
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
            <strong>{i18n.t("updateVersion.messages.currentVersion")}</strong> {updateStatus.currentVersion}
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>{i18n.t("updateVersion.messages.latestVersion")}</strong> {updateStatus.latestVersion}
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Estado:</strong>{" "}
            {updateStatus.hasUpdates ? (
              <span style={{ color: "green", fontWeight: "bold" }}>
                <span role="img" aria-label="check">✅</span> {i18n.t("updateVersion.status.updatesAvailable")}
              </span>
            ) : (
              <span style={{ color: "blue", fontWeight: "bold" }}>
                <span role="img" aria-label="check">✅</span> {i18n.t("updateVersion.status.upToDate")}
              </span>
            )}
          </Typography>
          {updateStatus.hasUpdates && (
            <Paper className={`${classes.alert} ${classes.infoAlert}`}>
              <Typography variant="body2">
                {i18n.t("updateVersion.messages.commitsAhead", { count: updateStatus.commitsAhead })}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={handlePerformUpdate}
                className={classes.updateButton}
                fullWidth
              >
                <span role="img" aria-label="update">🚀</span> Actualizar Sistema
              </Button>
            </Paper>
          )}
        </Box>
      );
    }

    return (
      <Typography variant="body1">
        {i18n.t("updateVersion.messages.checkUpdates")}
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
        <Button onClick={handleClose} color="secondary" disabled={updating}>
          {i18n.t("updateVersion.buttons.close")}
        </Button>
        {!loading && !updateStatus && !updating && (
          <Button onClick={handleCheckUpdates} color="primary" variant="contained">
            {i18n.t("updateVersion.buttons.check")}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default UpdateVersionModal;
