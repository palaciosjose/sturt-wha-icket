import React, { useState, useEffect, useContext, useCallback } from "react";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import IconButton from "@material-ui/core/IconButton";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import HubNotificaMeDialog from "../../components/HubNotificaMeDialog";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import { Grid } from "@material-ui/core";
import { AuthContext } from "../../context/Auth/AuthContext";

// Íconos de Meta
import { TbMessageChatbot, TbBrandInstagram, TbBrandFacebook } from "react-icons/tb";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
}));

const HubNotificaMe = () => {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [HubNotificaMe, setHubNotificaMe] = useState([]);
  const [selectedHubNotificaMe, setSelectedHubNotificaMe] = useState(null);
  const [HubNotificaMeModalOpen, setHubNotificaMeDialogOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deletingHubNotificaMe, setDeletingHubNotificaMe] = useState(null);
  const { user } = useContext(AuthContext);

  // Buscar lista de conexiones NotificaMe
  const fetchHubNotificaMe = useCallback(async () => {
    try {
      const companyId = localStorage.getItem("companyId");
      const { data } = await api.get("/hub-notificame/list", {
        params: { companyId, userId: user.id },
      });
      setHubNotificaMe(data);
      setLoading(false);
    } catch (err) {
      toastError(err);
    }
  }, [user.id]);

  useEffect(() => {
    fetchHubNotificaMe();
  }, [fetchHubNotificaMe]);

  const handleOpenHubNotificaMeDialog = () => {
    setSelectedHubNotificaMe(null);
    setHubNotificaMeDialogOpen(true);
  };

  const handleCloseHubNotificaMeDialog = () => {
    setSelectedHubNotificaMe(null);
    setHubNotificaMeDialogOpen(false);
    fetchHubNotificaMe();
  };



  const handleDeleteHubNotificaMe = async (HubNotificaMeId) => {
    try {
      await api.delete(`/hub-notificame/${HubNotificaMeId}`);
      toast.success("¡Token eliminado correctamente!");
      fetchHubNotificaMe();
    } catch (err) {
      toastError(err);
    }
    setDeletingHubNotificaMe(null);
  };

  const handleDeleteClick = (HubNotificaMe) => {
    setDeletingHubNotificaMe(HubNotificaMe);
    setConfirmModalOpen(true);
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={deletingHubNotificaMe && `¿Eliminar token ${deletingHubNotificaMe.token}?`}
        open={confirmModalOpen}
        onClose={() => {
          setConfirmModalOpen(false);
          setDeletingHubNotificaMe(null);
        }}
        onConfirm={() => handleDeleteHubNotificaMe(deletingHubNotificaMe.id)}
      >
        ¿Estás seguro de que quieres eliminar este token?
      </ConfirmationModal>

      <HubNotificaMeDialog
        open={HubNotificaMeModalOpen}
        onClose={handleCloseHubNotificaMeDialog}
        hubnotificameId={selectedHubNotificaMe?.id}
      />

      <MainHeader>
        <Grid container>
          <Grid xs={8} item>
            <Title>Conexiones Meta</Title>
          </Grid>
          <Grid xs={4} item>
            <Button variant="contained" onClick={handleOpenHubNotificaMeDialog} color="primary">
              Agregar
            </Button>
          </Grid>
        </Grid>
      </MainHeader>

      <Paper className={classes.mainPaper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">Nombre del Canal</TableCell>
              <TableCell align="center">Token del Canal - NotificaMe</TableCell>
              <TableCell align="center">Canal</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {HubNotificaMe.map((HubNotificaMe) => (
              <TableRow key={HubNotificaMe.id}>
                <TableCell align="center">{HubNotificaMe.nome}</TableCell>
                <TableCell align="center">{HubNotificaMe.token}</TableCell>
                <TableCell align="center">
                  {HubNotificaMe.tipo === "Facebook" ? <TbBrandFacebook size={32} /> : 
                   HubNotificaMe.tipo === "Instagram" ? <TbBrandInstagram size={32} /> : 
                   HubNotificaMe.tipo === "Webchat" ? <TbMessageChatbot size={32} /> : 
                   HubNotificaMe.tipo}
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => handleDeleteClick(HubNotificaMe)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {loading && <TableRowSkeleton columns={3} />}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default HubNotificaMe; 