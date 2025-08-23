import React, { useContext, useEffect, useReducer, useState, useRef } from "react";
import { Link as RouterLink } from "react-router-dom";

import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
// ✅ ListSubheader eliminado - Ya no se usa
// import ListSubheader from "@material-ui/core/ListSubheader";
import Divider from "@material-ui/core/Divider";
import { Badge } from "@material-ui/core";
import DashboardOutlinedIcon from "@material-ui/icons/DashboardOutlined";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import SyncAltIcon from "@material-ui/icons/SyncAlt";
import SettingsOutlinedIcon from "@material-ui/icons/SettingsOutlined";
import PeopleAltOutlinedIcon from "@material-ui/icons/PeopleAltOutlined";
import ContactPhoneOutlinedIcon from "@material-ui/icons/ContactPhoneOutlined";
import AccountTreeOutlinedIcon from "@material-ui/icons/AccountTreeOutlined";
import FlashOnIcon from "@material-ui/icons/FlashOn";
import HelpOutlineIcon from "@material-ui/icons/HelpOutline";
import CodeRoundedIcon from "@material-ui/icons/CodeRounded";
import LocalOfferIcon from "@material-ui/icons/LocalOffer";
import PeopleIcon from "@material-ui/icons/People";
import ListIcon from "@material-ui/icons/ListAlt";
import AnnouncementIcon from "@material-ui/icons/Announcement";
import ForumIcon from "@material-ui/icons/Forum";
import LocalAtmIcon from '@material-ui/icons/LocalAtm';
import RotateRight from "@material-ui/icons/RotateRight";
import { i18n } from "../translate/i18n";
import { WhatsAppsContext } from "../context/WhatsApp/WhatsAppsContext";
import { AuthContext } from "../context/Auth/AuthContext";
import LoyaltyRoundedIcon from '@material-ui/icons/LoyaltyRounded';
import { Can } from "../components/Can";
import { isArray } from "lodash";
import api from "../services/api";
import BorderColorIcon from '@material-ui/icons/BorderColor';
import toastError from "../errors/toastError";
import { makeStyles } from "@material-ui/core/styles";
import { AllInclusive, AttachFile, DeviceHubOutlined, Schedule } from '@material-ui/icons';
import usePlans from "../hooks/usePlans";
import Typography from "@material-ui/core/Typography";
import { FaBell } from 'react-icons/fa';
import { getVersionText } from "../config/version";

const useStyles = makeStyles((theme) => ({
  // ✅ ListSubheader eliminado - Ya no se usa
  // ListSubheader: {
  //   height: 26,
  //   marginTop: "-15px",
  //   marginBottom: "-10px",
  // },
  logoutButton: {
    borderRadius: 10,
    marginTop: 10,
    backgroundColor: theme.palette.sair.main,
    color: "white",
    "&:hover": {
      backgroundColor: "#f44336", // Rojo para el hover
      color: "white",
    },
  },
  // 🎯 LIST ITEM MEJORADO
  listItem: {
    borderRadius: '8px',
    margin: '2px 8px',
    transition: 'all 0.3s ease-in-out',
    '&:hover': {
      backgroundColor: '#E8F2FF !important', // ✅ Fondo azul muy claro que combina con la barra azul del subtítulo
      transform: 'translateX(4px)',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)', // ✅ Sombra azul sutil
      '& .MuiListItemText-primary': {
        color: '#1E40AF !important', // ✅ Texto azul oscuro que combina con el tema
        fontWeight: '500', // ✅ Texto más prominente en hover
      },
    },
  },
  // ✅ SUBHEADER ELIMINADO - Ya no se usa
  // subheader: {
  //   position: "relative",
  //   fontSize: "17px",
  //   textAlign: "left",
  //   paddingLeft: 20,
  //   fontWeight: 'bold',
  //   color: '#FFFFFF !important',
  //   backgroundColor: '#374151',
  //   borderRadius: '6px',
  //   margin: '8px 4px',
  //   '&::before': {
  //     content: '""',
  //     position: 'absolute',
  //     left: '8px',
  //     top: '50%',
  //     transform: 'translateY(-50%)',
  //     width: '4px',
  //     height: '20px',
  //     borderRadius: '2px',
  //     backgroundColor: '#3B82F6',
  //   },
  // },
}));


function ListItemLink(props) {
  const { icon, primary, to, className } = props;

  const renderLink = React.useMemo(
    () =>
      React.forwardRef((itemProps, ref) => (
        <RouterLink to={to} ref={ref} {...itemProps} />
      )),
    [to]
  );

  return (
    <li>
      <ListItem button dense component={renderLink} className={className}>
        {icon ? <ListItemIcon>{icon}</ListItemIcon> : null}
        <ListItemText primary={primary} />
      </ListItem>
    </li>
  );
}

// ✅ FUNCIONES PARA ICONOS PERSONALIZADOS CON HOVER
const renderIconAtendimento = (IconComponent) => {
  return (
    <IconComponent 
      style={{ 
        color: '#3B82F6',
        transition: 'all 0.3s ease-in-out',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.target.style.color = '#1E40AF';
        e.target.style.transform = 'scale(1.1)';
        e.target.style.filter = 'drop-shadow(0 4px 8px rgba(59, 130, 246, 0.3))';
      }}
      onMouseLeave={(e) => {
        e.target.style.color = '#3B82F6';
        e.target.style.transform = 'scale(1)';
        e.target.style.filter = 'none';
      }}
    />
  );
};

const renderIconGerencia = (IconComponent) => {
  return (
    <IconComponent 
      style={{ 
        color: '#10B981',
        transition: 'all 0.3s ease-in-out',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.target.style.color = '#059669';
        e.target.style.transform = 'scale(1.1)';
        e.target.style.filter = 'drop-shadow(0 4px 8px rgba(16, 185, 129, 0.3))';
      }}
      onMouseLeave={(e) => {
        e.target.style.color = '#10B981';
        e.target.style.transform = 'scale(1)';
        e.target.style.filter = 'none';
      }}
    />
  );
};

const renderIconCampanhas = (IconComponent) => {
  return (
    <IconComponent 
      style={{ 
        color: '#F59E0B',
        transition: 'all 0.3s ease-in-out',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.target.style.color = '#D97706';
        e.target.style.transform = 'scale(1.1)';
        e.target.style.filter = 'drop-shadow(0 4px 8px rgba(245, 158, 11, 0.3))';
      }}
      onMouseLeave={(e) => {
        e.target.style.color = '#F59E0B';
        e.target.style.transform = 'scale(1)';
        e.target.style.filter = 'none';
      }}
    />
  );
};

const renderIconAdministracao = (IconComponent) => {
  return (
    <IconComponent 
      style={{ 
        color: '#EF4444',
        transition: 'all 0.3s ease-in-out',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.target.style.color = '#DC2626';
        e.target.style.transform = 'scale(1.1)';
        e.target.style.filter = 'drop-shadow(0 4px 8px rgba(239, 68, 68, 0.3))';
      }}
      onMouseLeave={(e) => {
        e.target.style.color = '#EF4444';
        e.target.style.transform = 'scale(1)';
        e.target.style.filter = 'none';
      }}
    />
  );
};

// ✅ Función para iconos especiales (puede ser útil en el futuro)
// const renderIconEspecial = (IconComponent) => {
//   return (
//     <IconComponent 
//       style={{ 
//         color: '#8B5CF6',
//         transition: 'all 0.3s ease-in-out',
//         cursor: 'pointer'
//       }}
//       onMouseEnter={(e) => {
//         e.target.style.color = '#7C3AED';
//         e.target.style.transform = 'scale(1.1)';
//         e.target.style.filter = 'drop-shadow(0 4px 8px rgba(139, 92, 246, 0.3))';
//       }}
//       onMouseLeave={(e) => {
//         e.target.style.color = '#8B5CF6';
//         e.target.style.transform = 'scale(1)';
//         e.target.style.filter = 'none';
//       }}
//     />
//   );
// };

const reducer = (state, action) => {
  if (action.type === "LOAD_CHATS") {
    const chats = action.payload;
    const newChats = [];

    if (isArray(chats)) {
      chats.forEach((chat) => {
        const chatIndex = state.findIndex((u) => u.id === chat.id);
        if (chatIndex !== -1) {
          state[chatIndex] = chat;
        } else {
          newChats.push(chat);
        }
      });
    }

    return [...state, ...newChats];
  }

  if (action.type === "UPDATE_CHATS") {
    const chat = action.payload;
    const chatIndex = state.findIndex((u) => u.id === chat.id);

    if (chatIndex !== -1) {
      state[chatIndex] = chat;
      return [...state];
    } else {
      return [chat, ...state];
    }
  }

  if (action.type === "DELETE_CHAT") {
    const chatId = action.payload;

    const chatIndex = state.findIndex((u) => u.id === chatId);
    if (chatIndex !== -1) {
      state.splice(chatIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }

  if (action.type === "CHANGE_CHAT") {
    const changedChats = state.map((chat) => {
      if (chat.id === action.payload.chat.id) {
        return action.payload.chat;
      }
      return chat;
    });
    return changedChats;
  }
};

const MainListItems = (props) => {
  const classes = useStyles();
  const { drawerClose, collapsed } = props;
  const { whatsApps } = useContext(WhatsAppsContext);
  const { user, handleLogout } = useContext(AuthContext);
  const [connectionWarning, setConnectionWarning] = useState(false);
  const [showCampaigns, setShowCampaigns] = useState(false);
  const [showKanban, setShowKanban] = useState(false);
  const [showOpenAi, setShowOpenAi] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showSchedules, setShowSchedules] = useState(false);
  const [showInternalChat, setShowInternalChat] = useState(false);
  const [showExternalApi, setShowExternalApi] = useState(false);
  const isMounted = useRef(true);


  const [invisible, setInvisible] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchParam] = useState("");
  const [chats, dispatch] = useReducer(reducer, []);
  const { getPlanCompany } = usePlans();
	
	// const socketManager = useContext(SocketContext); // ✅ TEMPORALMENTE COMENTADO
 

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (isMounted.current) {
        const companyId = user.companyId;
        if (companyId) {
          const planConfigs = await getPlanCompany(undefined, companyId);

          if (isMounted.current) {
            setShowCampaigns(planConfigs.plan.useCampaigns);
            setShowKanban(planConfigs.plan.useKanban);
            setShowOpenAi(planConfigs.plan.useOpenAi);
            setShowIntegrations(planConfigs.plan.useIntegrations);
            setShowSchedules(planConfigs.plan.useSchedules);
            setShowInternalChat(planConfigs.plan.useInternalChat);
            setShowExternalApi(planConfigs.plan.useExternalApi);
          }
        }
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isMounted.current) {
      const delayDebounceFn = setTimeout(() => {
        if (isMounted.current) {
          fetchChats();
        }
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParam, pageNumber]);

  // ✅ TEMPORALMENTE DESHABILITADO PARA PROBAR FORMULARIO
  /*
  useEffect(() => {
    if (isMounted.current) {
      const companyId = localStorage.getItem("companyId");
      const socket = socketManager.getSocket(companyId);

      const handleChatEvent = (data) => {
        if (isMounted.current) {
          if (data.action === "new-message") {
            dispatch({ type: "CHANGE_CHAT", payload: data });
          }
          if (data.action === "update") {
            dispatch({ type: "CHANGE_CHAT", payload: data });
          }
        }
      };

      socket.on(`company-${companyId}-chat`, handleChatEvent);
      
      return () => {
        if (socket && isMounted.current) {
          socket.off(`company-${companyId}-chat`, handleChatEvent);
        }
      };
    }
  }, [socketManager]);
  */

  useEffect(() => {
    if (isMounted.current) {
      let unreadsCount = 0;
      if (chats.length > 0) {
        for (let chat of chats) {
          for (let chatUser of chat.users) {
            if (chatUser.userId === user.id) {
              unreadsCount += chatUser.unreads;
            }
          }
        }
      }
      if (unreadsCount > 0) {
        setInvisible(false);
      } else {
        setInvisible(true);
      }
    }
  }, [chats, user.id]);

  useEffect(() => {
    if (isMounted.current) {
      if (localStorage.getItem("cshow")) {
        setShowCampaigns(true);
      }
    }
  }, []);

  useEffect(() => {
    if (isMounted.current) {
      const delayDebounceFn = setTimeout(() => {
        if (isMounted.current && whatsApps.length > 0) {
          const offlineWhats = whatsApps.filter((whats) => {
            return (
              whats.status === "qrcode" ||
              whats.status === "PAIRING" ||
              whats.status === "DISCONNECTED" ||
              whats.status === "TIMEOUT" ||
              whats.status === "OPENING"
            );
          });
          if (offlineWhats.length > 0) {
            setConnectionWarning(true);
          } else {
            setConnectionWarning(false);
          }
        }
      }, 2000);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [whatsApps]);

  const fetchChats = async () => {
    try {
      const { data } = await api.get("/chats/", {
        params: { searchParam, pageNumber },
      });
      if (isMounted.current) {
        dispatch({ type: "LOAD_CHATS", payload: data.records });
      }
    } catch (err) {
      if (isMounted.current) {
        toastError(err);
      }
    }
  };

  const handleClickLogout = () => {
    //handleCloseMenu();
    handleLogout();
  };

  return (
    <div onClick={drawerClose}>
      <Can
        role={user.profile}
        perform={"drawer-service-items:view"}
        style={{
          overflowY: "scroll",
        }}
        no={() => (
          <>
            {/* ✅ SUBTÍTULO "ATENCIONES" ELIMINADO PARA MEJORAR ESTÉTICA */}
            <>

              <ListItemLink
                to="/tickets"
                primary={i18n.t("mainDrawer.listItems.tickets")}
                icon={renderIconAtendimento(WhatsAppIcon)}
                className={classes.listItem}
              />
              <ListItemLink
                to="/quick-messages"
                primary={i18n.t("mainDrawer.listItems.quickMessages")}
                icon={renderIconAtendimento(FlashOnIcon)}
                className={classes.listItem}
              />
              {showKanban && (
                <ListItemLink
                  to="/kanban"
                  primary="Kanban"
                  icon={renderIconAtendimento(LoyaltyRoundedIcon)}
                  className={classes.listItem}
                />
              )}
              <ListItemLink
                to="/todolist"
                primary={i18n.t("hardcodedElements.tarefas")}
                icon={renderIconAtendimento(BorderColorIcon)}
                className={classes.listItem}
              />
              <ListItemLink
                to="/contacts"
                primary={i18n.t("mainDrawer.listItems.contacts")}
                icon={renderIconAtendimento(ContactPhoneOutlinedIcon)}
                className={classes.listItem}
              />
              {showSchedules && (
                <>
                  <ListItemLink
                    to="/schedules"
                    primary={i18n.t("mainDrawer.listItems.schedules")}
                    icon={renderIconAtendimento(Schedule)}
                    className={classes.listItem}
                  />
                </>
              )}
              <ListItemLink
                to="/tags"
                primary={i18n.t("mainDrawer.listItems.tags")}
                icon={renderIconAtendimento(LocalOfferIcon)}
                className={classes.listItem}
              />
              {showInternalChat && (
                <>
                  <ListItemLink
                    to="/chats"
                    primary={i18n.t("mainDrawer.listItems.chats")}
                    icon={
                      <Badge color="secondary" variant="dot" invisible={invisible}>
                        {renderIconAtendimento(ForumIcon)}
                      </Badge>
                    }
                    className={classes.listItem}
                  />
                </>
              )}
              <ListItemLink
                to="/helps"
                primary={i18n.t("mainDrawer.listItems.helps")}
                icon={renderIconAtendimento(HelpOutlineIcon)}
                className={classes.listItem}
              />
            </>
          </>
        )}
      />

      <Can
        role={user.profile}
        perform={"drawer-admin-items:view"}
        yes={() => (
          <>
            {/* ✅ SUBTÍTULO "GESTIÓN" ELIMINADO PARA MEJORAR ESTÉTICA */}

            <ListItemLink
              small
              to="/"
              primary="Dashboard"
              icon={renderIconGerencia(DashboardOutlinedIcon)}
              className={classes.listItem}
            />
          </>
        )}
      />
      <Can
        role={user.profile}
        perform="drawer-admin-items:view"
        yes={() => (
          <>

            {showCampaigns && (
              <>
                            {/* ✅ SUBTÍTULO "CAMPAÑAS" ELIMINADO PARA MEJORAR ESTÉTICA */}

                <ListItemLink
                  small
                  to="/campaigns"
                  primary={i18n.t("hardcodedElements.listagem")}
                  icon={renderIconCampanhas(ListIcon)}
                  className={classes.listItem}
                />

                <ListItemLink
                  small
                  to="/contact-lists"
                  primary={i18n.t("Listas de Contatos")}
                  icon={renderIconCampanhas(PeopleIcon)}
                  className={classes.listItem}
                />


                <ListItemLink
                  small
                  to="/campaigns-config"
                  primary={i18n.t("hardcodedElements.configuracoes")}
                  icon={renderIconCampanhas(ListIcon)}
                  className={classes.listItem}
                />


                {/** 
                <ListItem
                  button
                  onClick={() => setOpenCampaignSubmenu((prev) => !prev)}
                >
                  <ListItemIcon>
                    <EventAvailableIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={i18n.t("mainDrawer.listItems.campaigns")}
                  />
                  {openCampaignSubmenu ? (
                    <ExpandLessIcon />
                  ) : (
                    <ExpandMoreIcon />
                  )}
                </ListItem>
                <Collapse
                  style={{ paddingLeft: 15 }}
                  in={openCampaignSubmenu}
                  timeout="auto"
                  unmountOnExit
                >
                  <List component="div" disablePadding>
                    
                    <ListItem onClick={() => history.push("/campaigns")} button>
                      <ListItemIcon>
                        <ListIcon />
                      </ListItemIcon>
                      <ListItemText primary="Listagem" />
                    </ListItem>

                    <ListItem
                      onClick={() => history.push("/contact-lists")}
                      button
                    >
                      <ListItemIcon>
                        <PeopleIcon />
                      </ListItemIcon>
                      <ListItemText primary="Listas de Contatos" />
                    </ListItem>

                    <ListItem
                      onClick={() => history.push("/campaigns-config")}
                      button
                    >
                      <ListItemIcon>
                        <SettingsOutlinedIcon />
                      </ListItemIcon>
                      <ListItemText primary="Configurações" />
                    </ListItem>

                  </List>
                </Collapse>
                */}
              </>
            )}

            {/* ✅ SUBTÍTULO "ADMINISTRACIÓN" ELIMINADO PARA MEJORAR ESTÉTICA */}

            {user.super && (
              <ListItemLink
                to="/announcements"
                primary={i18n.t("mainDrawer.listItems.annoucements")}
                icon={renderIconAdministracao(AnnouncementIcon)}
                className={classes.listItem}
              />
            )}
            <ListItemLink
              to="/hub-notificame"
              primary="Meta"
              icon={renderIconAdministracao(() => <FaBell size={24} />)}
              className={classes.listItem}
            />
            {showOpenAi && (
              <ListItemLink
                to="/prompts"
                primary={i18n.t("mainDrawer.listItems.prompts")}
                icon={renderIconAdministracao(AllInclusive)}
                className={classes.listItem}
              />
            )}

            {showIntegrations && (
              <ListItemLink
                to="/queue-integration"
                primary={i18n.t("mainDrawer.listItems.queueIntegration")}
                icon={renderIconAdministracao(DeviceHubOutlined)}
                className={classes.listItem}
              />
            )}
            <ListItemLink
              to="/connections"
              primary={i18n.t("mainDrawer.listItems.connections")}
              icon={
                <Badge badgeContent={connectionWarning ? "!" : 0} color="error">
                  {renderIconAdministracao(SyncAltIcon)}
                </Badge>
              }
              className={classes.listItem}
            />
            <ListItemLink
              to="/files"
              primary={i18n.t("mainDrawer.listItems.files")}
              icon={renderIconAdministracao(AttachFile)}
              className={classes.listItem}
            />
            <ListItemLink
              to="/queues"
              primary={i18n.t("mainDrawer.listItems.queues")}
              icon={renderIconAdministracao(AccountTreeOutlinedIcon)}
              className={classes.listItem}
            />
            <ListItemLink
              to="/users"
              primary={i18n.t("mainDrawer.listItems.users")}
              icon={renderIconAdministracao(PeopleAltOutlinedIcon)}
              className={classes.listItem}
            />
            {showExternalApi && (
              <>
                <ListItemLink
                  to="/messages-api"
                  primary={i18n.t("mainDrawer.listItems.messagesAPI")}
                  icon={renderIconAdministracao(CodeRoundedIcon)}
                  className={classes.listItem}
                />
              </>
            )}
            <ListItemLink
              to="/financeiro"
              primary={i18n.t("mainDrawer.listItems.financeiro")}
              icon={renderIconAdministracao(LocalAtmIcon)}
              className={classes.listItem}
            />

            <ListItemLink
              to="/settings"
              primary={i18n.t("mainDrawer.listItems.settings")}
              icon={renderIconAdministracao(SettingsOutlinedIcon)}
              className={classes.listItem}
            />
			
			
            {!collapsed && (
              <React.Fragment>
                <Divider />
              {/* 
              // IMAGEM NO MENU
              <Hidden only={['sm', 'xs']}>
                <img style={{ width: "100%", padding: "10px" }} src={logo} alt="image" />            
              </Hidden> 
              */}
              <Typography style={{ fontSize: "12px", padding: "10px", textAlign: "right", fontWeight: "bold" }}>
                Watoolx{" "}
                <span style={{
                  backgroundColor: '#FFD700',
                  color: '#000',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  display: 'inline-block',
                  minWidth: '50px',
                  textAlign: 'center',
                  marginLeft: '4px'
                }}>
                  {getVersionText()}
                </span>
              </Typography>
              </React.Fragment>
            )}
          </>
        )}
      />
	  <Divider />
	  <li>
		<ListItem
          button
          dense
          onClick={handleClickLogout}
          className={`${classes.logoutButton} ${classes.listItem}`}
        >
          <ListItemIcon>
            <RotateRight />
          </ListItemIcon>
          <ListItemText primary={i18n.t("hardcodedElements.sair")} />
        </ListItem>
      </li>
    </div>
  );
};

export default MainListItems;
