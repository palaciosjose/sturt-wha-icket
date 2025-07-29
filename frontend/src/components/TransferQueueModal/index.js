import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress
} from "@material-ui/core";
import { Search as SearchIcon, Check as CheckIcon } from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import { toast } from "react-toastify";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiDialog-paper": {
      minWidth: 400,
      maxWidth: 600,
      maxHeight: 500
    }
  },
  searchField: {
    marginBottom: theme.spacing(2)
  },
  listItem: {
    cursor: "pointer",
    "&:hover": {
      backgroundColor: theme.palette.action.hover
    }
  },
  selectedItem: {
    backgroundColor: theme.palette.primary.light,
    "&:hover": {
      backgroundColor: theme.palette.primary.main
    }
  },
  checkIcon: {
    color: theme.palette.primary.main
  }
}));

const TransferQueueModal = ({ open, onClose, onSelect, currentTransferQueueId = null }) => {
  const classes = useStyles();
  const [queues, setQueues] = useState([]);
  const [filteredQueues, setFilteredQueues] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedQueueId, setSelectedQueueId] = useState(currentTransferQueueId);

  // Cargar departamentos disponibles
  useEffect(() => {
    const fetchQueues = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/queue");
        // Filtrar solo departamentos que no sean el actual
        const availableQueues = data.filter(queue => 
          queue.id !== currentTransferQueueId && 
          queue.name.toLowerCase().includes("bot-ai")
        );
        setQueues(availableQueues);
        setFilteredQueues(availableQueues);
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchQueues();
    }
  }, [open, currentTransferQueueId]);

  // Filtrar departamentos por búsqueda
  useEffect(() => {
    const filtered = queues.filter(queue =>
      queue.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredQueues(filtered);
  }, [searchTerm, queues]);

  const handleQueueSelect = (queue) => {
    setSelectedQueueId(queue.id);
  };

  const handleConfirm = () => {
    if (selectedQueueId) {
      const selectedQueue = queues.find(q => q.id === selectedQueueId);
      onSelect({
        id: selectedQueue.id,
        name: selectedQueue.name
      });
      onClose();
    } else {
      toast.error("Por favor selecciona un departamento");
    }
  };

  const handleCancel = () => {
    setSelectedQueueId(currentTransferQueueId);
    setSearchTerm("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} className={classes.root}>
      <DialogTitle>
        {i18n.t("transferQueueModal.title")}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {i18n.t("transferQueueModal.description")}
        </Typography>
        
        <TextField
          fullWidth
          variant="outlined"
          placeholder={i18n.t("transferQueueModal.searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={classes.searchField}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
            <CircularProgress />
          </div>
        ) : (
          <List>
            {filteredQueues.map((queue) => (
              <ListItem
                key={queue.id}
                className={`${classes.listItem} ${
                  selectedQueueId === queue.id ? classes.selectedItem : ""
                }`}
                onClick={() => handleQueueSelect(queue)}
              >
                <ListItemText
                  primary={queue.name}
                  secondary={`ID: ${queue.id}`}
                />
                <ListItemSecondaryAction>
                  {selectedQueueId === queue.id && (
                    <IconButton edge="end" className={classes.checkIcon}>
                      <CheckIcon />
                    </IconButton>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}

        {!loading && filteredQueues.length === 0 && (
          <Typography variant="body2" color="textSecondary" align="center">
            {searchTerm 
              ? i18n.t("transferQueueModal.noResults") 
              : i18n.t("transferQueueModal.noQueues")
            }
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} color="secondary">
          {i18n.t("transferQueueModal.cancel")}
        </Button>
        <Button 
          onClick={handleConfirm} 
          color="primary" 
          variant="contained"
          disabled={!selectedQueueId}
        >
          {i18n.t("transferQueueModal.confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TransferQueueModal; 