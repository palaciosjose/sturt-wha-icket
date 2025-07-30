import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Switch,
  Typography,
  Box,
  Divider,
  Chip
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import logger from '../../utils/logger';
import useModalFocus from '../../hooks/useModalFocus';

const useStyles = makeStyles((theme) => ({
  dialog: {
    minWidth: 400,
  },
  section: {
    marginBottom: theme.spacing(2),
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: theme.spacing(1),
  },
  chip: {
    margin: theme.spacing(0.5),
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  statusText: {
    marginLeft: theme.spacing(1),
  },
}));

const LoggerConfig = ({ open, onClose }) => {
  const classes = useStyles();
  const [config, setConfig] = useState({});
  const [isEnabled, setIsEnabled] = useState(false);
  
  // Usar el hook personalizado para manejar el foco
  const { modalRef, handleClose: handleModalClose, handleExited } = useModalFocus(open);

  useEffect(() => {
    if (open) {
      const currentConfig = logger.config.get();
      setConfig(currentConfig);
      setIsEnabled(currentConfig.enableConsole);
      logger.debug("🔧 Modal de configuración de logs abierto");
      
      // Logs de prueba para verificar funcionamiento
      logger.sw.debug("🧪 LOG DE PRUEBA - Service Worker");
      logger.socket.debug("🧪 LOG DE PRUEBA - Socket");
      logger.whatsapp.debug("🧪 LOG DE PRUEBA - WhatsApp");
      logger.transferModal.debug("🧪 LOG DE PRUEBA - Transfer Modal");
      logger.dashboard.debug("🧪 LOG DE PRUEBA - Dashboard");
    }
  }, [open]);

  const handleToggleCategory = (category) => {
    const newConfig = {
      ...config,
      [`enable${category}`]: !config[`enable${category}`]
    };
    setConfig(newConfig);
    logger.config.set(newConfig);
    logger.debug(`🔧 Categoría ${category} ${newConfig[`enable${category}`] ? 'activada' : 'desactivada'}`);
  };

  const handleToggleConsole = () => {
    const newConfig = {
      ...config,
      enableConsole: !isEnabled
    };
    setConfig(newConfig);
    setIsEnabled(!isEnabled);
    logger.config.set(newConfig);
  };

  const handleReset = () => {
    logger.config.reset();
    const defaultConfig = logger.config.get();
    setConfig(defaultConfig);
    setIsEnabled(defaultConfig.enableConsole);
    logger.debug("🔄 Configuración reseteada a valores por defecto");
  };

  const handleClearStorage = () => {
    localStorage.removeItem('loggerConfig');
    const defaultConfig = logger.config.get();
    setConfig(defaultConfig);
    setIsEnabled(defaultConfig.enableConsole);
    logger.debug("🗑️ localStorage limpiado y configuración reseteada");
  };

  const handleClose = (event) => {
    // Usar el hook para manejar el foco correctamente
    handleModalClose(event);
    
    // Llamar al callback original
    onClose();
  };

  const getStatusColor = () => {
    if (!isEnabled) return 'default';
    const enabledCategories = Object.keys(config).filter(key => 
      key.startsWith('enable') && key !== 'enableConsole' && config[key]
    ).length;
    if (enabledCategories === 0) return 'secondary';
    return 'primary';
  };

  const getStatusText = () => {
    if (!isEnabled) return 'Logs deshabilitados';
    const enabledCategories = Object.keys(config).filter(key => 
      key.startsWith('enable') && key !== 'enableConsole' && config[key]
    ).length;
    if (enabledCategories === 0) return 'Logs habilitados pero sin categorías activas';
    return `${enabledCategories} categoría(s) activa(s)`;
  };

  return (
    <Dialog 
      ref={modalRef}
      open={open} 
      onClose={handleClose} 
      className={classes.dialog}
      disableEnforceFocus={false}
      disableAutoFocus={false}
      disableRestoreFocus={false}
      keepMounted={false}
      disablePortal={false}
      hideBackdrop={false}
      disableScrollLock={false}
      disableEscapeKeyDown={false}
      fullWidth={false}
      maxWidth="sm"
      TransitionProps={{
        onExited: handleExited
      }}
      PaperProps={{
        'aria-modal': 'true',
        role: 'dialog',
        'aria-labelledby': 'logger-config-title'
      }}
    >
      <DialogTitle id="logger-config-title">
        Configuración de Logs
      </DialogTitle>
      <DialogContent>
        <Box className={classes.status}>
          <Chip 
            label={getStatusText()} 
            color={getStatusColor()}
            size="small"
          />
        </Box>

        <Divider style={{ marginBottom: 16 }} />

        <Box className={classes.section}>
          <Typography className={classes.sectionTitle}>
            Control General
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={isEnabled}
                onChange={handleToggleConsole}
                color="primary"
              />
            }
            label="Habilitar logs en consola"
          />
        </Box>

        <Box className={classes.section}>
          <Typography className={classes.sectionTitle}>
            Categorías de Logs
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={config.enableServiceWorker || false}
                onChange={() => handleToggleCategory('ServiceWorker')}
                disabled={!isEnabled}
                color="primary"
              />
            }
            label="Service Worker"
          />
          <FormControlLabel
            control={
              <Switch
                checked={config.enableSocket || false}
                onChange={() => handleToggleCategory('Socket')}
                disabled={!isEnabled}
                color="primary"
              />
            }
            label="Socket/WebSocket"
          />
          <FormControlLabel
            control={
              <Switch
                checked={config.enableWhatsApp || false}
                onChange={() => handleToggleCategory('WhatsApp')}
                disabled={!isEnabled}
                color="primary"
              />
            }
            label="WhatsApp"
          />
          <FormControlLabel
            control={
              <Switch
                checked={config.enableTransferModal || false}
                onChange={() => handleToggleCategory('TransferModal')}
                disabled={!isEnabled}
                color="primary"
              />
            }
            label="Modal de Transferencia"
          />
          <FormControlLabel
            control={
              <Switch
                checked={config.enableDashboard || false}
                onChange={() => handleToggleCategory('Dashboard')}
                disabled={!isEnabled}
                color="primary"
              />
            }
            label="Dashboard"
          />
        </Box>

        <Box className={classes.section}>
          <Typography variant="body2" color="textSecondary">
            Los cambios se aplican inmediatamente. Los logs se guardan en localStorage.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClearStorage} color="secondary" style={{ marginRight: 'auto' }}>
          Limpiar Storage
        </Button>
        <Button onClick={handleReset} color="secondary">
          Restablecer
        </Button>
        <Button 
          onClick={handleClose} 
          color="primary"
          autoFocus={false}
          tabIndex={-1}
        >
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LoggerConfig; 