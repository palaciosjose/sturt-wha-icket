import React, { useContext, useEffect, useRef, useState } from "react";

import clsx from "clsx";
import { format, isSameDay, parseISO } from "date-fns";
import { useHistory, useParams } from "react-router-dom";
import Avatar from "@material-ui/core/Avatar";
import Badge from "@material-ui/core/Badge";
import Box from "@material-ui/core/Box";
import Divider from "@material-ui/core/Divider";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import ListItemText from "@material-ui/core/ListItemText";
import Typography from "@material-ui/core/Typography";
import { blue, green, orange } from "@material-ui/core/colors";
import { makeStyles } from "@material-ui/core/styles";
import { i18n } from "../../translate/i18n";

import { Tooltip } from "@material-ui/core";
import { v4 as uuidv4 } from "uuid";
import { AuthContext } from "../../context/Auth/AuthContext";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import MarkdownWrapper from "../MarkdownWrapper";

import AndroidIcon from "@material-ui/icons/Android";
import EmojiEmotionsIcon from "@material-ui/icons/EmojiEmotions";
import SettingsIcon from "@material-ui/icons/Settings";
import VisibilityIcon from "@material-ui/icons/Visibility";
import ContactTag from "../ContactTag";
import TicketMessagesDialog from "../TicketMessagesDialog";
import TransferTicketModalCustom from "../TransferTicketModalCustom";
import { getInitials } from "../../helpers/getInitials";
import { generateColor } from "../../helpers/colorGenerator";

const useStyles = makeStyles((theme) => ({
  ticket: {
    position: "relative",
  },

  pendingTicket: {
    cursor: "unset",
  },
  queueTag: {
    background: "#FCFCFC",
    color: "#000",
    marginRight: 1,
    padding: 1,
    fontWeight: 'bold',
    paddingLeft: 5,
    paddingRight: 5,
    borderRadius: 3,
    fontSize: "0.8em",
    whiteSpace: "nowrap"
  },
  noTicketsDiv: {
    display: "flex",
    height: "100px",
    margin: 40,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  newMessagesCount: {
    position: "absolute",
    alignSelf: "center",
    marginRight: 8,
    marginLeft: "auto",
    top: "10px",
    left: "20px",
    borderRadius: 0,
  },
  noTicketsText: {
    textAlign: "center",
    color: "rgb(104, 121, 146)",
    fontSize: "14px",
    lineHeight: "1.4",
  },
  connectionTag: {
    background: "green",
    color: "#FFF",
    marginRight: 1,
    padding: 1,
    fontWeight: 'bold',
    paddingLeft: 5,
    paddingRight: 5,
    borderRadius: 3,
    fontSize: "0.8em",
    whiteSpace: "nowrap"
  },
  noTicketsTitle: {
    textAlign: "center",
    fontSize: "16px",
    fontWeight: "600",
    margin: "0px",
  },

  contactNameWrapper: {
    display: "flex",
    justifyContent: "space-between",
    marginLeft: "5px",
  },

  lastMessageTime: {
    justifySelf: "flex-end",
    textAlign: "right",
    position: "relative",
    top: -5,
    background: '#333333',
    color: '#ffffff',
    border: '1px solid #3a3b6c',
    borderRadius: 5,
    padding: 1,
    paddingLeft: 5,
    paddingRight: 5,
    fontSize: '0.9em',
    zIndex: 10,
    marginRight: 120,
  },

  closedBadge: {
    alignSelf: "center",
    justifySelf: "flex-end",
    marginRight: 32,
    marginLeft: "auto",
  },

  contactLastMessage: {
    paddingRight: "0%",
    marginLeft: "5px",
  },


  badgeStyle: {
    color: "white",
    backgroundColor: green[500],
  },

  acceptButton: {
    position: "absolute",
    right: "108px",
  },


  ticketQueueColor: {
    flex: "none",
    width: "8px",
    height: "100%",
    position: "absolute",
    top: "0%",
    left: "0%",
  },

  ticketInfo: {
    position: "relative",
    top: -13
  },
  secondaryContentSecond: {
    display: 'flex',
    // marginTop: 5,
    //marginLeft: "5px",
    alignItems: "flex-start",
    flexWrap: "wrap",
    flexDirection: "row",
    alignContent: "flex-start",
  },
  ticketInfo1: {
    position: "relative",
    top: 13,
    right: 0
  },
  Radiusdot: {
    "& .MuiBadge-badge": {
      borderRadius: 2,
      position: "inherit",
      height: 16,
      margin: 2,
      padding: 3
    },
    "& .MuiBadge-anchorOriginTopRightRectangle": {
      transform: "scale(1) translate(0%, -40%)",
    },
  },
    presence: {
    color: theme?.mode === 'light' ? "blue" : "lightgreen",
    fontWeight: "bold",
  }
}));

const TicketListItemCustom = ({ ticket }) => {
  const classes = useStyles();
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const [tag, setTag] = useState([]);
  const [ticketUser, setTicketUser] = useState(null);
  const [lastInteractionLabel, setLastInteractionLabel] = useState('');
  const [openTicketMessageDialog, setOpenTicketMessageDialog] = useState(false);
  const { ticketId } = useParams();
  const isMounted = useRef(true);
  const { setCurrentTicket } = useContext(TicketsContext);
  const { user } = useContext(AuthContext);
  const { profile } = user;
  const [transferTicketModalOpen, setTransferTicketModalOpen] = useState(false);
  const presenceMessage = { composing: "Digitando...", recording: "Gravando..." };
  
  useEffect(() => {
    if (ticket.userId && ticket.user) {
      setTicketUser(ticket.user?.name?.toUpperCase());
    }
    setTag(ticket?.tags);

    // ✅ DEBUG: Log del presence del ticket
    // console.log("🎯 TICKET LIST ITEM - ID:", ticket.id, "Presence:", ticket?.presence);

    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.presence]); // ✅ AGREGAR DEPENDENCIA PARA RE-RENDERIZAR CUANDO CAMBIE PRESENCE

  const handleCloseTicket = async (id) => {
    setTag(ticket?.tags);
    setLoading(true);
    try {
      await api.put(`/tickets/${id}`, {
        status: "closed",
        userId: user?.id,
        queueId: ticket?.queue?.id,
        useIntegration: false,
        promptId: null,
        integrationId: null
      });
    } catch (err) {
      setLoading(false);
      toastError(err);
    }
    if (isMounted.current) {
      setLoading(false);
    }
    history.push(`/tickets/`);
  };

  useEffect(() => {
    const renderLastInteractionLabel = () => {
      let labelColor = '';
      let labelText = '';

      if (!ticket.lastMessage) return '';

      const lastInteractionDate = parseISO(ticket.updatedAt);
      const currentDate = new Date();
      const timeDifference = currentDate - lastInteractionDate;
      const hoursDifference = Math.floor(timeDifference / (1000 * 60 * 60));
      const minutesDifference = Math.floor(timeDifference / (1000 * 60));


      if (minutesDifference >= 3 && minutesDifference <= 10) {
        labelText = `(${minutesDifference} m atrás)`;
        labelColor = 'green';
      } else if (minutesDifference >= 30 && minutesDifference < 60) {
        labelText = `(${minutesDifference} m atrás)`;
        labelColor = 'Orange';
      } else if (minutesDifference > 60  && hoursDifference < 24) {
        labelText = `(${hoursDifference} h atrás)`;
        labelColor = 'red';
      } else if (hoursDifference >= 24) {
        labelText = `(${Math.floor(hoursDifference / 24)} dias atrás)`;
        labelColor = 'red';
      }


      return { labelText, labelColor };
    };

    // Função para atualizar o estado do componente
    const updateLastInteractionLabel = () => {
      if (!isMounted.current) return; // Verificar si el componente sigue montado
      
      const { labelText, labelColor } = renderLastInteractionLabel();
      setLastInteractionLabel(
        <Badge
          className={classes.lastInteractionLabel}
          style={{ color: labelColor }}
        >
          {labelText}
        </Badge>
      );
      // Agendando a próxima atualização após 30 segundos
      const timeoutId = setTimeout(updateLastInteractionLabel, 30 * 1000);
      
      // Guardar el timeout ID para limpiarlo
      return () => clearTimeout(timeoutId);
    };

    // Inicializando a primeira atualização
    const cleanup = updateLastInteractionLabel();

    // Cleanup function
    return () => {
      if (cleanup) cleanup();
    };

  }, [ticket, isMounted, classes.lastInteractionLabel]); // Agregar dependencias necesarias

  const handleReopenTicket = async (id) => {
    setLoading(true);
    try {
      await api.put(`/tickets/${id}`, {
        status: "open",
        userId: user?.id,
        queueId: ticket?.queue?.id
      });
    } catch (err) {
      setLoading(false);
      toastError(err);
    }
    if (isMounted.current) {
      setLoading(false);
    }
    history.push(`/tickets/${ticket.uuid}`);
  };

    const handleAcepptTicket = async (id) => {
        setLoading(true);
        try {
            await api.put(`/tickets/${id}`, {
                status: "open",
                userId: user?.id,
            });
            
            let settingIndex;

            try {
                const { data } = await api.get("/settings/");
                
                settingIndex = data.filter((s) => s.key === "sendGreetingAccepted");
                
            } catch (err) {
                toastError(err);
                   
            }
            
            if (settingIndex[0].value === "enabled" && !ticket.isGroup) {
                handleSendMessage(ticket.id);
                
            }

        } catch (err) {
            setLoading(false);
            
            toastError(err);
        }
        if (isMounted.current) {
            setLoading(false);
        }

        // handleChangeTab(null, "tickets");
        // handleChangeTab(null, "open");
        history.push(`/tickets/${ticket.uuid}`);
    };
	
	    const handleSendMessage = async (id) => {
        
        const msg = `{{ms}} *{{name}}*, meu nome é *${user?.name}* e agora vou prosseguir com seu atendimento!`;
        const message = {
            read: 1,
            fromMe: true,
            mediaUrl: "",
            body: `*Mensagem Automática:*\n${msg.trim()}`,
        };
        try {
            await api.post(`/messages/${id}`, message);
        } catch (err) {
            toastError(err);
            
        }
    };

  const handleSelectTicket = (ticket) => {
    const code = uuidv4();
    const { id, uuid } = ticket;
    setCurrentTicket({ id, uuid, code });
  };


  const renderTicketInfo = () => {
    return (
      <>
        {/* Icono de chatbot movido a la posición de la fecha/hora */}
      </>
    );
  };

  const handleOpenTransferModal = () => {
    setTransferTicketModalOpen(true);
  }

  const handleCloseTransferTicketModal = () => {
    if (isMounted.current) {
      setTransferTicketModalOpen(false);
    }
  };

  return (
    <React.Fragment key={ticket.id}>

    <TransferTicketModalCustom
    modalOpen={transferTicketModalOpen}
    onClose={handleCloseTransferTicketModal}
    ticketid={ticket.id}
  />

      <TicketMessagesDialog
        open={openTicketMessageDialog}

        handleClose={() => setOpenTicketMessageDialog(false)}
        ticketId={ticket.id}
      ></TicketMessagesDialog>
      <ListItem dense button
        onClick={(e) => {
          if (ticket.status === "pending") return;
          handleSelectTicket(ticket);
        }}
        selected={ticketId && +ticketId === ticket.id}
        className={clsx(classes.ticket, {
          [classes.pendingTicket]: ticket.status === "pending",
        })}
      >
        <Tooltip arrow placement="right" title={ticket.queue?.name?.toUpperCase() || ""} >
          <span style={{ backgroundColor: ticket.queue?.color || "#7C7C7C" }} className={classes.ticketQueueColor}></span>
        </Tooltip>
        <ListItemAvatar>
          {ticket.status !== "pending" ?
            <Avatar
              style={{
                marginTop: "-20px",
                marginLeft: "-3px",
                width: "55px",
                height: "55px",
                borderRadius: "10%",
                backgroundColor: generateColor(ticket?.contact?.number),
              }}
              src={ticket?.contact?.profilePicUrl}>
              {getInitials(ticket?.contact?.name || "")}
              </Avatar>
            :
            <Avatar
              style={{
                marginTop: "-30px",
                marginLeft: "0px",
                width: "50px",
                height: "50px",
                borderRadius: "10%",
                backgroundColor: generateColor(ticket?.contact?.number),
              }}
              src={ticket?.contact?.profilePicUrl}>
              {getInitials(ticket?.contact?.name || "")}
              </Avatar>
          }
        </ListItemAvatar>
        <ListItemText
          disableTypography

          primary={
            <span className={classes.contactNameWrapper}>
            <Typography
            noWrap
            component='span'
            variant='body2'
            color='textPrimary'
          >
            <strong>{ticket.contact.name} {lastInteractionLabel}</strong>
        <ListItemSecondaryAction>
          <Box className={classes.ticketInfo1}>{renderTicketInfo()}</Box>
        </ListItemSecondaryAction>
                {profile === "admin" && (
                  <Tooltip title="Espiar Conversa">
                    <VisibilityIcon
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenTicketMessageDialog(true);
                      }}
                      fontSize="small"
                      style={{
                        color: blue[700],
                        cursor: "pointer",
                        marginLeft: 10,
                        verticalAlign: "middle"
                      }}
                    />
                  </Tooltip>
                )}
              </Typography>
        </span>

          }
          secondary={
            <span className={classes.contactNameWrapper}>

              <Typography
                className={classes.contactLastMessage}
                noWrap
                component="span"
                variant="body2"
                color="textSecondary"
              >
                {["composing", "recording"].includes(ticket?.presence) ? (
                  <span className={classes.presence}>
                    {presenceMessage[ticket.presence]}
                  </span>
                ) : (
                  <>
                    {ticket.lastMessage && ticket.lastMessage.includes('data:image/png;base64') ? 
                      <MarkdownWrapper> Localização</MarkdownWrapper> 
                      : 
                      <MarkdownWrapper>
                        {ticket.lastMessage && ticket.lastMessage.length > 30 
                          ? `${ticket.lastMessage.substring(0, 30)}...` 
                          : ticket.lastMessage || "Sin mensaje"
                        }
                      </MarkdownWrapper>
                    }
                  </>
                )}

                <span style={{ marginTop: 4, }} className={classes.secondaryContentSecond} >
                  {ticket?.whatsapp?.name ? <Badge className={classes.connectionTag}>{ticket?.whatsapp?.name?.toUpperCase()}</Badge> : <br></br>}
                  {ticketUser ? <Badge style={{ backgroundColor: "#000000" }} className={classes.connectionTag}>{ticketUser}</Badge> : <br></br>}				  
                  {ticket.queue?.name && <Badge style={{ backgroundColor: ticket.queue?.color || "#7c7c7c" }} className={classes.connectionTag}>{ticket.queue?.name?.toUpperCase()}</Badge>}
                  {/* ✅ INDICADORES DE AGENTE IA */}
                  {ticket.chatbot && (
                    <Tooltip title="🤖 Agente IA - Chatbot activo">
                      <AndroidIcon
                        fontSize="small"
                        style={{ 
                          color: blue[600], 
                          fontSize: '16px',
                          marginLeft: '5px',
                          marginTop: '2px',
                          cursor: 'pointer'
                        }}
                      />
                    </Tooltip>
                  )}
                  
                  					{/* ✅ INDICADOR DE PROMPT IA */}
					{ticket.promptId && (
						<Tooltip title="🧠 IA Inteligente - Prompt configurado">
							<EmojiEmotionsIcon
								fontSize="small"
								style={{ 
									color: green[600], 
									fontSize: '16px',
									marginLeft: '5px',
									marginTop: '2px',
									cursor: 'pointer'
								}}
							/>
						</Tooltip>
					)}
                  
                  					{/* ✅ INDICADOR DE INTEGRACIÓN */}
					{ticket.useIntegration && (
						<Tooltip title="🔗 Integración Externa - N8N/Dialogflow">
							<SettingsIcon
								fontSize="small"
								style={{ 
									color: orange[600], 
									fontSize: '16px',
									marginLeft: '5px',
									marginTop: '2px',
									cursor: 'pointer'
								}}
							/>
						</Tooltip>
					)}
                </span>

                {/* <span style={{ marginTop: 2, fontSize: 5 }} className={classes.secondaryContentSecond} >
                  {ticket?.whatsapp?.name ? <Badge className={classes.connectionTag}>{ticket?.whatsapp?.name?.toUpperCase()}</Badge> : <br></br>}
                </span> */}

                {/*<span style={{ marginTop: 4, fontSize: 5 }} className={classes.secondaryContentSecond} >
                  {ticketUser ? <Chip size="small" icon={<FaceIcon />} label={ticketUser} variant="outlined" /> : <br></br>}
                </span>*/}

                <span style={{ paddingTop: "2px" }} className={classes.secondaryContentSecond} >
                  {tag?.map((tag) => {
                    return (
                      <ContactTag tag={tag} key={`ticket-contact-tag-${ticket.id}-${tag.id}`} />
                    );
                  })}
                </span>

              </Typography>

              <Badge
                className={classes.newMessagesCount}
                badgeContent={ticket.unreadMessages}
                classes={{
                  badge: classes.badgeStyle,
                }}
              />
            </span>
          }

        />
        <ListItemSecondaryAction>
          {ticket.lastMessage && (
            <>

              <Typography
                className={classes.lastMessageTime}
                component="span"
                variant="body2"
                color="textSecondary"
              >

                {isSameDay(parseISO(ticket.updatedAt), new Date()) ? (
                  <>{format(parseISO(ticket.updatedAt), "HH:mm")}</>
                ) : (
                  <>{format(parseISO(ticket.updatedAt), "dd/MM/yyyy")}</>
                )}
              </Typography>

              <br />

            </>
          )}

          <span className={classes.secondaryContentSecond}>
            {ticket.status === "pending" && (
              <>
                <ButtonWithSpinner
                  style={{
                    backgroundColor: 'green',
                    color: 'white',
                    padding: '4px 8px',
                    bottom: '25px',
                    borderRadius: '8px',
                    right: '8px',
                    fontSize: '0.6rem',
                    width: '80px',
                    minWidth: '80px',
                    height: '24px'
                  }}
                  variant="contained"
                  className={classes.acceptButton}
                  size="small"
                  loading={loading}
                  onClick={e => handleAcepptTicket(ticket.id)}
                >
                  {i18n.t("ticketsList.buttons.accept")}
                </ButtonWithSpinner>

                <ButtonWithSpinner
                  style={{
                    backgroundColor: 'red',
                    color: 'white',
                    padding: '4px 8px',
                    bottom: '0px',
                    borderRadius: '8px',
                    right: '8px',
                    fontSize: '0.6rem',
                    width: '80px',
                    minWidth: '80px',
                    height: '24px'
                  }}
                  variant="contained"
                  className={classes.acceptButton}
                  size="small"
                  loading={loading}
                  onClick={e => handleCloseTicket(ticket.id)}
                >
                  {i18n.t("ticketsList.buttons.closed")}
                </ButtonWithSpinner>
              </>
            )}

            {ticket.status === "attending" && (
              <>
                <ButtonWithSpinner
                  style={{
                    backgroundColor: 'blue',
                    color: 'white',
                    padding: '4px 8px',
                    bottom: '25px',
                    borderRadius: '8px',
                    right: '8px',
                    fontSize: '0.6rem',
                    width: '80px',
                    minWidth: '80px',
                    height: '24px'
                  }}
                  variant="contained"
                  className={classes.acceptButton}
                  size="small"
                  loading={loading}
                  onClick={e => handleOpenTransferModal()}
                >
                  {i18n.t("ticketsList.buttons.transfer")}
                </ButtonWithSpinner>

                <ButtonWithSpinner
                  style={{
                    backgroundColor: 'red',
                    color: 'white',
                    padding: '4px 8px',
                    bottom: '0px',
                    borderRadius: '8px',
                    right: '8px',
                    fontSize: '0.6rem',
                    width: '80px',
                    minWidth: '80px',
                    height: '24px'
                  }}
                  variant="contained"
                  className={classes.acceptButton}
                  size="small"
                  loading={loading}
                  onClick={e => handleCloseTicket(ticket.id)}
                >
                  {i18n.t("ticketsList.buttons.closed")}
                </ButtonWithSpinner>
              </>
            )}

            {ticket.status !== "closed" && ticket.status !== "pending" && ticket.status !== "attending" && (
              <>
                <ButtonWithSpinner
                  style={{
                    backgroundColor: 'blue',
                    color: 'white',
                    padding: '4px 8px',
                    bottom: '25px',
                    borderRadius: '8px',
                    right: '8px',
                    fontSize: '0.6rem',
                    width: '80px',
                    minWidth: '80px',
                    height: '24px'
                  }}
                  variant="contained"
                  className={classes.acceptButton}
                  size="small"
                  loading={loading}
                  onClick={e => handleOpenTransferModal()}
                >
                  {i18n.t("ticketsList.buttons.transfer")}
                </ButtonWithSpinner>

                <ButtonWithSpinner
                  style={{
                    backgroundColor: 'red',
                    color: 'white',
                    padding: '4px 8px',
                    bottom: '0px',
                    borderRadius: '8px',
                    right: '8px',
                    fontSize: '0.6rem',
                    width: '80px',
                    minWidth: '80px',
                    height: '24px'
                  }}
                  variant="contained"
                  className={classes.acceptButton}
                  size="small"
                  loading={loading}
                  onClick={e => handleCloseTicket(ticket.id)}
                >
                  {i18n.t("ticketsList.buttons.closed")}
                </ButtonWithSpinner>
              </>
            )}

            {ticket.status === "closed" && (
              <ButtonWithSpinner
                style={{
                  backgroundColor: 'red',
                  color: 'white',
                  padding: '4px 8px',
                  bottom: '0px',
                  borderRadius: '8px',
                  right: '8px',
                  fontSize: '0.6rem',
                  width: '80px',
                  minWidth: '80px',
                  height: '24px'
                }}
                variant="contained"
                className={classes.acceptButton}
                size="small"
                loading={loading}
                onClick={e => handleReopenTicket(ticket.id)}
              >
                {i18n.t("ticketsList.buttons.reopen")}
              </ButtonWithSpinner>
            )}
          </span>
        </ListItemSecondaryAction>

      
      </ListItem>

      <Divider variant="inset" component="li" />
    </React.Fragment>
  );
};

export default TicketListItemCustom;
