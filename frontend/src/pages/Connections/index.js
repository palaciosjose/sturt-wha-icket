import React, { useState, useCallback, useContext, useEffect } from "react";
import { toast } from "react-toastify";
import { format, parseISO } from "date-fns";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import {
	Button,
	TableBody,
	TableRow,
	TableCell,
	IconButton,
	Table,
	TableHead,
	Paper,
	Tooltip,
} from "@material-ui/core";
import {
	Edit,
	CheckCircle,
	DeleteOutline,
} from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import TableRowSkeleton from "../../components/TableRowSkeleton";

import api from "../../services/api";
import WhatsAppModal from "../../components/WhatsAppModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import QrcodeModal from "../../components/QrcodeModal";
import { i18n } from "../../translate/i18n";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import toastError from "../../errors/toastError";

import { AuthContext } from "../../context/Auth/AuthContext";
import { SocketContext } from "../../context/Socket/SocketContext";
import { Can } from "../../components/Can";

const useStyles = makeStyles(theme => ({
	mainPaper: {
		flex: 1,
		padding: theme.spacing(2),
		overflowY: "scroll",
		...theme.scrollbarStyles,
	},
	customTableCell: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	tooltip: {
		backgroundColor: "#f5f5f9",
		color: "rgba(0, 0, 0, 0.87)",
		fontSize: theme.typography.pxToRem(14),
		border: "1px solid #dadde9",
		maxWidth: 450,
	},
	tooltipPopper: {
		textAlign: "center",
	},
	buttonProgress: {
		color: green[500],
	},
	tableCell: {
		padding: theme.spacing(1.5),
		fontSize: '14px',
	},
	avatarCell: {
		padding: theme.spacing(1),
		textAlign: 'center',
	},
	tokenCell: {
		padding: theme.spacing(1),
		minWidth: '220px',
		maxWidth: '250px',
	},
}));

const Connections = () => {
	const classes = useStyles();

	const { user } = useContext(AuthContext);
	const { whatsApps, loading, refreshWhatsApps } = useContext(WhatsAppsContext);
	const socketManager = useContext(SocketContext);
	const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
	const [qrModalOpen, setQrModalOpen] = useState(false);
	const [selectedWhatsApp, setSelectedWhatsApp] = useState(null);
	const [confirmModalOpen, setConfirmModalOpen] = useState(false);
	const confirmationModalInitialState = {
		action: "",
		title: "",
		message: "",
		whatsAppId: "",
		open: false,
	};
	const [confirmModalInfo, setConfirmModalInfo] = useState(
		confirmationModalInitialState
	);

  // ✅ WEBSOCKET PARA SINCRONIZACIÓN EN TIEMPO REAL
  useEffect(() => {
    if (socketManager) {
      const companyId = localStorage.getItem("companyId");
      const socket = socketManager.getSocket(companyId);

      // ✅ ESCUCHAR EVENTOS DE WHATSAPP
      socket.on(`company-${companyId}-whatsapp`, (data) => {
        console.log("📡 EVENTO WHATSAPP RECIBIDO:", data.action);
        
        if (data.action === "create") {
          console.log("➕ CREANDO NUEVA CONEXIÓN:", data.whatsapp.id);
          // Refrescar conexiones automáticamente
          refreshWhatsApps();
        }
        
        if (data.action === "update") {
          console.log("🔄 ACTUALIZANDO CONEXIÓN:", data.whatsapp.id);
          // Refrescar conexiones automáticamente
          refreshWhatsApps();
        }
        
        if (data.action === "delete") {
          console.log("🗑️ ELIMINANDO CONEXIÓN:", data.whatsappId);
          // Refrescar conexiones automáticamente
          refreshWhatsApps();
        }
      });

      // ✅ ESCUCHAR EVENTOS DE SESIÓN
      socket.on(`company-${companyId}-whatsappSession`, (data) => {
        if (data.action === "update") {
          console.log("🔄 ACTUALIZANDO SESIÓN:", data.session.id);
          // Refrescar conexiones automáticamente
          refreshWhatsApps();
        }
      });

      // ✅ LIMPIAR LISTENERS AL DESMONTAR
      return () => {
        if (socket && typeof socket.off === 'function') {
          socket.off(`company-${companyId}-whatsapp`);
          socket.off(`company-${companyId}-whatsappSession`);
        }
      };
    }
  }, [socketManager, refreshWhatsApps]);

  // ✅ FUNCIÓN MEJORADA PARA REFRESCAR CONEXIONES
  // eslint-disable-next-line no-unused-vars
  const refreshConnections = async () => {
    try {
      await refreshWhatsApps();
      toast.success("✅ Lista de conexiones actualizada");
    } catch (error) {
      console.error("Error al refrescar conexiones:", error);
    }
  };

  // ✅ FUNCIÓN PARA MANEJAR ÉXITO EN CREACIÓN/EDICIÓN
  const handleWhatsAppSuccess = async () => {
    try {
      // Cerrar modal
      setWhatsAppModalOpen(false);
      
      // Refrescar conexiones automáticamente
      await refreshWhatsApps();
      
      // Mostrar mensaje de éxito
      toast.success("✅ Conexión guardada exitosamente");
    } catch (error) {
      console.error("Error al refrescar después de guardar:", error);
    }
  };

  // ✅ FUNCIÓN PARA MANEJAR ÉXITO EN ELIMINACIÓN
  const handleDeleteSuccess = async (whatsAppId) => {
    try {
      // Cerrar modal de confirmación
      setConfirmModalOpen(false);
      setConfirmModalInfo(confirmationModalInitialState);
      
      // Refrescar conexiones automáticamente
      await refreshWhatsApps();
      
      // Mostrar mensaje de éxito
      toast.success("✅ Conexión eliminada exitosamente");
    } catch (error) {
      console.error("Error al refrescar después de eliminar:", error);
    }
  };

  const restartWhatsapps = async () => {
    try {
      await api.post(`/whatsapp-restart/`);
      toast.warn("⏳ Aguarde... reiniciando conexiones...");
      
      // ✅ ESPERAR UN POCO Y LUEGO REFRESCAR
      setTimeout(async () => {
        try {
          await refreshWhatsApps();
          toast.success("✅ Conexiones reiniciadas exitosamente");
        } catch (error) {
          console.error("Error al refrescar después del reinicio:", error);
        }
      }, 3000); // Esperar 3 segundos para que el reinicio se complete
      
    } catch (err) {
      toastError(err);
    }
  }

	const handleStartWhatsAppSession = async whatsAppId => {
		try {
			await api.post(`/whatsappsession/${whatsAppId}`);
			
			// ✅ REFRESCAR CONEXIONES DESPUÉS DE INICIAR SESIÓN
			await refreshWhatsApps();
			
			toast.success("✅ Sesión de WhatsApp iniciada");
		} catch (err) {
			toastError(err);
		}
	};

	const handleRequestNewQrCode = async whatsAppId => {
		try {
			await api.post(`/whatsappsession/${whatsAppId}`);
			
			// ✅ REFRESCAR CONEXIONES DESPUÉS DE SOLICITAR QR
			await refreshWhatsApps();
			
			toast.success("✅ Nuevo código QR generado");
		} catch (err) {
			toastError(err);
		}
	};

	const handleOpenWhatsAppModal = () => {
		setSelectedWhatsApp(null);
		setWhatsAppModalOpen(true);
	};

	const handleCloseWhatsAppModal = useCallback(() => {
		setWhatsAppModalOpen(false);
		setSelectedWhatsApp(null);
	}, [setSelectedWhatsApp, setWhatsAppModalOpen]);

	const handleOpenQrModal = whatsApp => {
		setSelectedWhatsApp(whatsApp);
		setQrModalOpen(true);
	};

	const handleCloseQrModal = useCallback(() => {
		setSelectedWhatsApp(null);
		setQrModalOpen(false);
	}, [setQrModalOpen, setSelectedWhatsApp]);

	const handleEditWhatsApp = whatsApp => {
		setSelectedWhatsApp(whatsApp);
		setWhatsAppModalOpen(true);
	};

	const handleOpenConfirmationModal = (action, whatsAppId) => {
		if (action === "disconnect") {
			setConfirmModalInfo({
				action: action,
				title: i18n.t("connections.confirmationModal.disconnectTitle"),
				message: i18n.t("connections.confirmationModal.disconnectMessage"),
				whatsAppId: whatsAppId,
			});
		}

		if (action === "delete") {
			setConfirmModalInfo({
				action: action,
				title: i18n.t("connections.confirmationModal.deleteTitle"),
				message: i18n.t("connections.confirmationModal.deleteMessage"),
				whatsAppId: whatsAppId,
			});
		}
		setConfirmModalOpen(true);
	};

	const handleCloseConfirmModal = () => {
		setConfirmModalOpen(false);
		setConfirmModalInfo(confirmationModalInitialState);
	};

	const handleDeleteWhatsApp = async () => {
		try {
			await api.delete(`/whatsapp/${confirmModalInfo.whatsAppId}`);
			
			// ✅ USAR NUEVA FUNCIÓN DE ÉXITO
			await handleDeleteSuccess(confirmModalInfo.whatsAppId);
			
		} catch (err) {
			toastError(err);
		}
	};

	const renderActionButtons = whatsApp => {
		return (
			<>
				{whatsApp.status === "qrcode" && (
					<Button
						size="small"
						variant="contained"
						color="primary"
						onClick={() => handleOpenQrModal(whatsApp)}
					>
						{i18n.t("connections.buttons.qrcode")}
					</Button>
				)}
				{whatsApp.status === "DISCONNECTED" && (
					<>
						<Button
							size="small"
							variant="outlined"
							color="primary"
							onClick={() => handleStartWhatsAppSession(whatsApp.id)}
						>
							{i18n.t("connections.buttons.tryAgain")}
						</Button>{" "}
						<Button
							size="small"
							variant="outlined"
							color="secondary"
							onClick={() => handleRequestNewQrCode(whatsApp.id)}
						>
							{i18n.t("connections.buttons.newQr")}
						</Button>
					</>
				)}
				{(whatsApp.status === "CONNECTED" ||
					whatsApp.status === "PAIRING" ||
					whatsApp.status === "TIMEOUT") && (
					<Button
						size="small"
						variant="outlined"
						color="secondary"
						onClick={() => {
							handleOpenConfirmationModal("disconnect", whatsApp.id);
						}}
					>
						{i18n.t("connections.buttons.disconnect")}
					</Button>
				)}
				{whatsApp.status === "OPENING" && (
					<Button size="small" variant="outlined" disabled color="default">
						{i18n.t("connections.buttons.connecting")}
					</Button>
				)}
			</>
		);
	};

	return (
		<MainContainer>
			<ConfirmationModal
				title={confirmModalInfo.title}
				open={confirmModalOpen}
				onClose={handleCloseConfirmModal}
				onConfirm={handleDeleteWhatsApp}
			>
				{confirmModalInfo.message}
			</ConfirmationModal>
			<QrcodeModal
				open={qrModalOpen}
				onClose={handleCloseQrModal}
				whatsAppId={!whatsAppModalOpen && selectedWhatsApp?.id}
			/>
			<WhatsAppModal
				open={whatsAppModalOpen}
				onClose={handleCloseWhatsAppModal}
				whatsAppId={!qrModalOpen && selectedWhatsApp?.id}
				onSave={handleWhatsAppSuccess}
			/>
			<MainHeader>
				<Title>{i18n.t("connections.title")}</Title>
				<MainHeaderButtonsWrapper>
					<Can
						role={user.profile}
						perform="connections-page:addConnection"
						yes={() => (
						<>
							<Button
								variant="contained"
								color="primary"
								onClick={handleOpenWhatsAppModal}
							>
								{i18n.t("connections.buttons.add")}
							</Button>
 							<Button
            					variant="contained"
            					color="primary"
            					onClick={restartWhatsapps}
          					>
            					{i18n.t("connections.buttons.restart")}
          					</Button>
							</>
						)}
					/>
				</MainHeaderButtonsWrapper>
			</MainHeader>
			<Paper className={classes.mainPaper} variant="outlined">
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell align="center">
								{i18n.t("connections.table.aliasWa")}
							</TableCell>
							<TableCell align="center">
								{i18n.t("connections.table.waName")}
							</TableCell>
							<TableCell align="center">
								{i18n.t("connections.table.number")}
                            </TableCell>
							<TableCell align="center">
								Avatar
							</TableCell>
							<TableCell align="center">
								Token
							</TableCell>							
							<Can
								role={user.profile}
								perform="connections-page:actionButtons"
								yes={() => (
									<TableCell align="center">
										{i18n.t("connections.table.session")}
									</TableCell>
								)}
							/>
							<TableCell align="center">
								Fecha
							</TableCell>
							<TableCell align="center">
								Default
							</TableCell>
							<Can
								role={user.profile}
								perform="connections-page:editOrDeleteConnection"
								yes={() => (
									<TableCell align="center">
										{i18n.t("connections.table.actions")}
									</TableCell>
								)}
							/>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading ? (
							<TableRowSkeleton />
						) : (
							<>
								{whatsApps?.length > 0 &&
									whatsApps.map(whatsApp => (
										<TableRow key={whatsApp.id}>
											<TableCell align="center">
												<span style={{
													fontFamily: 'monospace',
													fontSize: '13px',
													fontWeight: 'bold',
													color: '#2e7d32',
													backgroundColor: '#e8f5e8',
													padding: '4px 8px',
													borderRadius: '4px',
													border: '1px solid #2e7d32'
												}}>
													{whatsApp.name}
												</span>
											</TableCell>
											<TableCell align="center">
												<span style={{
													fontFamily: 'monospace',
													fontSize: '13px',
													fontWeight: 'bold',
													color: '#ff6f00',
													backgroundColor: '#fff3e0',
													padding: '4px 8px',
													borderRadius: '4px',
													border: '1px solid #ff6f00'
												}}>
													{whatsApp.waName || "-"}
												</span>
											</TableCell>
											<TableCell align="center">
											  {whatsApp.number ? (
												<span style={{
													fontFamily: 'monospace',
													fontSize: '13px',
													fontWeight: 'bold',
													color: '#1976d2',
													backgroundColor: '#e3f2fd',
													padding: '4px 8px',
													borderRadius: '4px',
													border: '1px solid #1976d2'
												}}>
													{whatsApp.number}
												</span>
											  ) : (
												"-"
											  )}
											</TableCell>
											<TableCell align="center" className={classes.avatarCell}>
												{whatsApp.avatar ? (
													<img 
														src={whatsApp.avatar} 
														alt="Avatar" 
														style={{ 
															width: 45, 
															height: 45, 
															borderRadius: '50%',
															border: '3px solid #ddd',
															boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
														}}
														onError={(e) => {
															if (e.target) {
																e.target.style.display = 'none';
																if (e.target.nextSibling) {
																	e.target.nextSibling.style.display = 'block';
																}
															}
														}}
													/>
												) : (
													<div style={{
														width: 45,
														height: 45,
														borderRadius: '50%',
														backgroundColor: '#1976d2',
														color: 'white',
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'center',
														fontWeight: 'bold',
														fontSize: '18px',
														boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
													}}>
														{whatsApp.name ? whatsApp.name.charAt(0).toUpperCase() : '?'}
													</div>
												)}
											</TableCell>
											<TableCell align="center" className={classes.tokenCell}>
												{whatsApp.token ? (
													<Tooltip title={whatsApp.token} placement="top">
														<span style={{ 
															fontFamily: 'monospace',
															fontSize: '11px',
															backgroundColor: '#e3f2fd',
															padding: '6px 10px',
															borderRadius: '6px',
															cursor: 'pointer',
															border: '1px solid #2196f3',
															fontWeight: 'bold',
															color: '#1565c0',
															maxWidth: '200px',
															overflow: 'hidden',
															textOverflow: 'ellipsis',
															whiteSpace: 'nowrap',
															display: 'inline-block'
														}}>
															{whatsApp.token}
														</span>
													</Tooltip>
												) : (
													"-"
												)}
											</TableCell>
											<Can
												role={user.profile}
												perform="connections-page:actionButtons"
												yes={() => (
													<TableCell align="center">
														{renderActionButtons(whatsApp)}
													</TableCell>
												)}
											/>
											<TableCell align="center">
												{format(parseISO(whatsApp.updatedAt), "dd/MM/yy HH:mm")}
											</TableCell>
											<TableCell align="center">
												{whatsApp.isDefault && (
													<div className={classes.customTableCell}>
														<CheckCircle style={{ color: green[500] }} />
													</div>
												)}
											</TableCell>
											<Can
												role={user.profile}
												perform="connections-page:editOrDeleteConnection"
												yes={() => (
													<TableCell align="center">
														<div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
															<IconButton
																size="small"
																onClick={() => handleEditWhatsApp(whatsApp)}
																style={{ 
																	backgroundColor: '#e3f2fd',
																	border: '1px solid #2196f3',
																	margin: '0 2px'
																}}
															>
																<Edit style={{ fontSize: '18px', color: '#1976d2' }} />
															</IconButton>

															<IconButton
																size="small"
																onClick={e => {
																	handleOpenConfirmationModal("delete", whatsApp.id);
																}}
																style={{ 
																	backgroundColor: '#ffebee',
																	border: '1px solid #f44336',
																	margin: '0 2px'
																}}
															>
																<DeleteOutline style={{ fontSize: '18px', color: '#d32f2f' }} />
															</IconButton>
														</div>
													</TableCell>
												)}
											/>
										</TableRow>
									))}
							</>
						)}
					</TableBody>
				</Table>
			</Paper>
		</MainContainer>
	);
};

export default Connections;