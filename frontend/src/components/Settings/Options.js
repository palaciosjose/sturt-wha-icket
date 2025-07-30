import React, { useEffect, useState } from "react";

import Grid from "@material-ui/core/Grid";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import FormHelperText from "@material-ui/core/FormHelperText";
import TextField from "@material-ui/core/TextField";
import useSettings from "../../hooks/useSettings";
import { toast } from 'react-toastify';
import { makeStyles } from "@material-ui/core/styles";
import { grey, blue } from "@material-ui/core/colors";
import { Tabs, Tab } from "@material-ui/core";
import OnlyForSuperUser from '../../components/OnlyForSuperUser';
import useAuth from '../../hooks/useAuth.js';
import { i18n } from '../../translate/i18n.js';

//import 'react-toastify/dist/ReactToastify.css';
 
const useStyles = makeStyles((theme) => ({
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  fixedHeightPaper: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: 240,
  },
  tab: {
    backgroundColor: theme.palette.options,  //DARK MODE PLW DESIGN//
    borderRadius: 4,
    width: "100%",
    "& .MuiTab-wrapper": {
      color: theme.palette.fontecor,
    },   //DARK MODE PLW DESIGN//
    "& .MuiTabs-flexContainer": {
      justifyContent: "center"
    }


  },
  paper: {
    padding: theme.spacing(2),
    display: "flex",
    alignItems: "center",
    marginBottom: 12,
    width: "100%",
  },
  cardAvatar: {
    fontSize: "55px",
    color: grey[500],
    backgroundColor: "#ffffff",
    width: theme.spacing(7),
    height: theme.spacing(7),
  },
  cardTitle: {
    fontSize: "18px",
    color: blue[700],
  },
  cardSubtitle: {
    color: grey[600],
    fontSize: "14px",
  },
  alignRight: {
    textAlign: "right",
  },
  fullWidth: {
    width: "100%",
  },
  selectContainer: {
    width: "100%",
    textAlign: "left",
  },
}));

export default function Options(props) {
  const { settings, scheduleTypeChanged } = props;
  const classes = useStyles();

  const [currentUser, setCurrentUser] = useState({});
  const { getCurrentUserInfo } = useAuth();
  useEffect(() => {
    async function findData() {
      try {
        const user = await getCurrentUserInfo();
        setCurrentUser(user);
      } catch (e) {
        toast.error(e);
      }
    }
    findData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

 

  const [userRating, setUserRating] = useState("disabled");
  const [scheduleType, setScheduleType] = useState("disabled");
  const [callType, setCallType] = useState("enabled");
  const [chatbotType, setChatbotType] = useState("");
  const [CheckMsgIsGroup, setCheckMsgIsGroupType] = useState("enabled");

  const [loadingUserRating, setLoadingUserRating] = useState(false);
  const [loadingScheduleType, setLoadingScheduleType] = useState(false);
      const [loadingCallType, setLoadingCallType] = useState(false);
  const [loadingChatbotType, setLoadingChatbotType] = useState(false);
  const [loadingCheckMsgIsGroup, setLoadingCheckMsgIsGroup] = useState(false);
 
  // Configuración de zona horaria
  const [timezoneType, setTimezoneType] = useState("America/Lima");
  const [loadingTimezoneType, setLoadingTimezoneType] = useState(false);
  
  // recursos a mais...
  const [trial, settrial] = useState('3');
  const [loadingtrial, setLoadingtrial] = useState(false);

  const [viewregister, setviewregister] = useState('disabled');
  const [loadingviewregister, setLoadingviewregister] = useState(false);

  const [allowregister, setallowregister] = useState('disabled');
  const [loadingallowregister, setLoadingallowregister] = useState(false);

  const [SendGreetingAccepted, setSendGreetingAccepted] = useState("disabled");
  const [loadingSendGreetingAccepted, setLoadingSendGreetingAccepted] = useState(false);
  
  const [SettingsTransfTicket, setSettingsTransfTicket] = useState("disabled");
  const [loadingSettingsTransfTicket, setLoadingSettingsTransfTicket] = useState(false);
  
  const [sendGreetingMessageOneQueues, setSendGreetingMessageOneQueues] = useState("disabled");
  const [loadingSendGreetingMessageOneQueues, setLoadingSendGreetingMessageOneQueues] = useState(false);

  // HUB NOTIFICAME TOKEN
  const [hubNotificaMeToken, setHubNotificaMeToken] = useState("");
  const [loadingHubNotificaMeToken, setLoadingHubNotificaMeToken] = useState(false);

  const { update } = useSettings();

  useEffect(() => {
    if (Array.isArray(settings) && settings.length) {
      const userRating = settings.find((s) => s.key === "userRating");
      if (userRating) {
        setUserRating(userRating.value);
      }
      const scheduleType = settings.find((s) => s.key === "scheduleType");
      if (scheduleType) {
        setScheduleType(scheduleType.value);
      }
      const callType = settings.find((s) => s.key === "call");
      if (callType) {
        setCallType(callType.value);
      }
      const CheckMsgIsGroup = settings.find((s) => s.key === "CheckMsgIsGroup");
      if (CheckMsgIsGroup) {
        setCheckMsgIsGroupType(CheckMsgIsGroup.value);
      }

      const allowregister = settings.find((s) => s.key === 'allowregister');
      if (allowregister) {
        setallowregister(allowregister.value);
      }
      
      const SendGreetingAccepted = settings.find((s) => s.key === "sendGreetingAccepted");
      if (SendGreetingAccepted) {
        setSendGreetingAccepted(SendGreetingAccepted.value);
      }
	  
	  const SettingsTransfTicket = settings.find((s) => s.key === "sendMsgTransfTicket");
      if (SettingsTransfTicket) {
        setSettingsTransfTicket(SettingsTransfTicket.value);
      }


      const viewregister = settings.find((s) => s.key === 'viewregister');
      if (viewregister) {
        setviewregister(viewregister.value);
      }

      const sendGreetingMessageOneQueues = settings.find((s) => s.key === "sendGreetingMessageOneQueues");
      if (sendGreetingMessageOneQueues) {
        setSendGreetingMessageOneQueues(sendGreetingMessageOneQueues.value)
      }

      // HUB NOTIFICAME: leer valor actual del token
      const hubToken = settings.find((s) => s.key === "hubToken");
      if (hubToken) {
        setHubNotificaMeToken(hubToken.value);
      }

      const chatbotType = settings.find((s) => s.key === "chatBotType");
      if (chatbotType) {
        setChatbotType(chatbotType.value);
      }
	  
	  const trial = settings.find((s) => s.key === 'trial');
      if (trial) {
        settrial(trial.value);
      }

      const timezoneType = settings.find((s) => s.key === "timezone");
      if (timezoneType) {
        setTimezoneType(timezoneType.value);
        // Guardar en localStorage para uso inmediato
        localStorage.setItem("timezone", timezoneType.value);
      } else {
        // Valor por defecto si no existe la configuración
        setTimezoneType("America/Lima");
        localStorage.setItem("timezone", "America/Lima");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  async function handleChangeUserRating(value) {
    setUserRating(value);
    setLoadingUserRating(true);
    await update({
      key: "userRating",
      value,
    });
    toast.success(i18n.t("settings.success"));
    setLoadingUserRating(false);
  }

  async function handleallowregister(value) {
    setallowregister(value);
    setLoadingallowregister(true);
    await update({
      key: 'allowregister',
      value,
    });
    toast.success(i18n.t("settings.success"));
    setLoadingallowregister(false);
  }
  
    async function handleSendGreetingMessageOneQueues(value) {
    setSendGreetingMessageOneQueues(value);
    setLoadingSendGreetingMessageOneQueues(true);
    await update({
      key: "sendGreetingMessageOneQueues",
      value,
    });
	toast.success(i18n.t("settings.success"));
    setLoadingSendGreetingMessageOneQueues(false);
  }

  async function handleviewregister(value) {
    setviewregister(value);
    setLoadingviewregister(true);
    await update({
      key: 'viewregister',
      value,
    });
    toast.success(i18n.t("settings.success"));
    setLoadingviewregister(false);
  }
  
    async function handletrial(value) {
    settrial(value);
    setLoadingtrial(true);
    await update({
      key: 'trial',
      value,
    });
    toast.success(i18n.t("settings.success"));
    setLoadingtrial(false);
  }


  async function handleScheduleType(value) {
    setScheduleType(value);
    setLoadingScheduleType(true);
    await update({
      key: "scheduleType",
      value,
    });
    toast.success(i18n.t("settings.success"));
    setLoadingScheduleType(false);
    scheduleTypeChanged(value);
  }

  async function handleCallType(value) {
    setCallType(value);
    setLoadingCallType(true);
    await update({
      key: "call",
      value,
    });
    toast.success(i18n.t("settings.success"));
    setLoadingCallType(false);
  }

  async function handleChatbotType(value) {
    setChatbotType(value);
    setLoadingChatbotType(true);
    await update({
      key: "chatBotType",
      value,
    });
    toast.success(i18n.t("settings.success"));
    setLoadingChatbotType(false);
  }

  async function handleGroupType(value) {
    setCheckMsgIsGroupType(value);
    setLoadingCheckMsgIsGroup(true);
    await update({
      key: "CheckMsgIsGroup",
      value,
    });
    toast.success(i18n.t("settings.success"));
    setLoadingCheckMsgIsGroup(false);
  }
  
  async function handleSendGreetingAccepted(value) {
    setSendGreetingAccepted(value);
    setLoadingSendGreetingAccepted(true);
    await update({
      key: "sendGreetingAccepted",
      value,
    });
	toast.success(i18n.t("settings.success"));
    setLoadingSendGreetingAccepted(false);
  }  

  async function handleSettingsTransfTicket(value) {
    setSettingsTransfTicket(value);
    setLoadingSettingsTransfTicket(true);
    await update({
      key: "sendMsgTransfTicket",
      value,
    });

    toast.success(i18n.t("settings.success"));
    setLoadingSettingsTransfTicket(false);
  } 
 


  async function handleChangeTimezone(value) {
    setTimezoneType(value);
    setLoadingTimezoneType(true);
    await update({
      key: "timezone",
      value,
    });
    // Guardar en localStorage para uso inmediato en el frontend
    localStorage.setItem("timezone", value);
    toast.success(i18n.t("settings.success"));
    setLoadingTimezoneType(false);
  }

  async function handleChangeHubNotificaMe(value) {
    setHubNotificaMeToken(value);

    if (value.length === 36) {
      // ✅ Solo si tiene 36 caracteres exactos
      setLoadingHubNotificaMeToken(true);
      await update({
        key: "hubToken",
        value,
      });
      toast.success(i18n.t("settings.success"));
      setLoadingHubNotificaMeToken(false);
    } else {
      // Opcional: puedes mostrar un aviso si quieres
      // toast.info("Debe tener exactamente 36 caracteres para guardar.");
    }
  }
  return (
    <>
      <Grid spacing={3} container>
        <Grid xs={12} sm={12} md={12} item>
          <FormControl className={classes.selectContainer}>
            <InputLabel id="ratings-label">{i18n.t("settings.options.userRating")}</InputLabel>
            <Select
              labelId="ratings-label"
              value={userRating}
              onChange={async (e) => {
                handleChangeUserRating(e.target.value);
              }}
            >
              <MenuItem value={"disabled"}>{i18n.t("settings.states.disabled")}</MenuItem>
              <MenuItem value={"enabled"}>{i18n.t("settings.states.enabled")}</MenuItem>
            </Select>
            <FormHelperText>
              {loadingUserRating && i18n.t("settings.states.updating")}
            </FormHelperText>
          </FormControl>
        </Grid>
        <Grid xs={12} sm={12} md={12} item>
          <FormControl className={classes.selectContainer}>
            <InputLabel id="schedule-type-label">
              {i18n.t("settings.options.scheduleType")}
            </InputLabel>
            <Select
              labelId="schedule-type-label"
              value={scheduleType}
              onChange={async (e) => {
                handleScheduleType(e.target.value);
              }}
            >
              <MenuItem value={"disabled"}>{i18n.t("settings.states.disabled")}</MenuItem>
              <MenuItem value={"queue"}>{i18n.t("settings.states.queue")}</MenuItem>
              <MenuItem value={"company"}>{i18n.t("settings.states.company")}</MenuItem>
            </Select>
            <FormHelperText>
              {loadingScheduleType && i18n.t("settings.states.updating")}
            </FormHelperText>
          </FormControl>
        </Grid>
        <Grid xs={12} sm={12} md={12} item>
          <FormControl className={classes.selectContainer}>
            <InputLabel id="group-type-label">
              {i18n.t("settings.options.ignoreGroupMessages")}
            </InputLabel>
            <Select
              labelId="group-type-label"
              value={CheckMsgIsGroup}
              onChange={async (e) => {
                handleGroupType(e.target.value);
              }}
            >
              <MenuItem value={"disabled"}>{i18n.t("settings.states.deactivated")}</MenuItem>
              <MenuItem value={"enabled"}>{i18n.t("settings.states.activated")}</MenuItem>
            </Select>
            <FormHelperText>
              {loadingCheckMsgIsGroup && i18n.t("settings.states.updating")}
            </FormHelperText>
          </FormControl>
        </Grid>
        <Grid xs={12} sm={12} md={12} item>
          <FormControl className={classes.selectContainer}>
            <InputLabel id="call-type-label">
              {i18n.t("settings.options.acceptCall")}
            </InputLabel>
            <Select
              labelId="call-type-label"
              value={callType}
              onChange={async (e) => {
                handleCallType(e.target.value);
              }}
            >
              <MenuItem value={"disabled"}>{i18n.t("settings.states.notAccept")}</MenuItem>
              <MenuItem value={"enabled"}>{i18n.t("settings.states.accept")}</MenuItem>
            </Select>
            <FormHelperText>
              {loadingCallType && i18n.t("settings.states.updating")}
            </FormHelperText>
          </FormControl>
        </Grid>
       <Grid xs={12} sm={12} md={12} item>
          <FormControl className={classes.selectContainer}>
            <InputLabel id="chatbot-type-label">
              {i18n.t("settings.options.chatbotType")}
            </InputLabel>
            <Select
              labelId="chatbot-type-label"
              value={chatbotType}
              onChange={async (e) => {
                handleChatbotType(e.target.value);
              }}
            >
              <MenuItem value={"text"}>{i18n.t("settings.states.text")}</MenuItem>
			 {/*<MenuItem value={"button"}>Botão</MenuItem>*/}
             {/*<MenuItem value={"list"}>Lista</MenuItem>*/}
            </Select>
            <FormHelperText>
              {loadingChatbotType && i18n.t("settings.states.updating")}
            </FormHelperText>
          </FormControl>
        </Grid>
		{/* ENVIAR SAUDAÇÃO AO ACEITAR O TICKET */}
        <Grid xs={12} sm={12} md={12} item>
          <FormControl className={classes.selectContainer}>
            <InputLabel id="sendGreetingAccepted-label">{i18n.t("settings.options.sendGreetingAccepted")}</InputLabel>
            <Select
              labelId="sendGreetingAccepted-label"
              value={SendGreetingAccepted}
              onChange={async (e) => {
                handleSendGreetingAccepted(e.target.value);
              }}
            >
              <MenuItem value={"disabled"}>{i18n.t("settings.states.disabled")}</MenuItem>
              <MenuItem value={"enabled"}>{i18n.t("settings.states.enabled")}</MenuItem>
            </Select>
            <FormHelperText>
              {loadingSendGreetingAccepted && i18n.t("settings.states.updating")}
            </FormHelperText>
          </FormControl>
        </Grid>
		{/* ENVIAR SAUDAÇÃO AO ACEITAR O TICKET */}
		
		{/* ENVIAR MENSAGEM DE TRANSFERENCIA DE SETOR/ATENDENTE */}
        <Grid xs={12} sm={12} md={12} item>
          <FormControl className={classes.selectContainer}>
            <InputLabel id="sendMsgTransfTicket-label">{i18n.t("settings.options.sendTransferMessage")}</InputLabel>
            <Select
              labelId="sendMsgTransfTicket-label"
              value={SettingsTransfTicket}
              onChange={async (e) => {
                handleSettingsTransfTicket(e.target.value);
              }}
            >
              <MenuItem value={"disabled"}>{i18n.t("settings.states.disabled")}</MenuItem>
              <MenuItem value={"enabled"}>{i18n.t("settings.states.enabled")}</MenuItem>
            </Select>
            <FormHelperText>
              {loadingSettingsTransfTicket && i18n.t("settings.states.updating")}
            </FormHelperText>
          </FormControl>
        </Grid>
		
		{/* ENVIAR SAUDAÇÃO QUANDO HOUVER SOMENTE 1 FILA */}
        <Grid xs={12} sm={12} md={12} item>
          <FormControl className={classes.selectContainer}>
            <InputLabel id="sendGreetingMessageOneQueues-label">{i18n.t("settings.options.sendGreetingOneQueue")}</InputLabel>
            <Select
              labelId="sendGreetingMessageOneQueues-label"
              value={sendGreetingMessageOneQueues}
              onChange={async (e) => {
                handleSendGreetingMessageOneQueues(e.target.value);
              }}
            >
              <MenuItem value={"disabled"}>{i18n.t("settings.states.disabled")}</MenuItem>
              <MenuItem value={"enabled"}>{i18n.t("settings.states.enabled")}</MenuItem>
            </Select>
            <FormHelperText>
              {loadingSendGreetingMessageOneQueues && i18n.t("settings.states.updating")}
            </FormHelperText>
          </FormControl>
        </Grid>
	
		
      </Grid>
	  
		<OnlyForSuperUser
				user={currentUser}
				yes={() => (
				  <>
					<Grid spacing={3} container>
					  <Tabs
						value={0}
						indicatorColor='primary'
						textColor='primary'
						scrollButtons='on'
						variant='scrollable'
						className={classes.tab}
						style={{
						  marginBottom: 20,
						  marginTop: 20,
						}}
					  >
						<Tab label={i18n.t("settings.options.globalSettings")} />
					  </Tabs>
					</Grid>


            <Grid xs={12} sm={12} md={12} item>
                <FormControl className={classes.selectContainer}>
                  <InputLabel id='allowregister-label'>
                    {i18n.t("settings.options.registrationAllowed")}
                  </InputLabel>
                  <Select
                    labelId='allowregister-label'
                    value={allowregister}
                    onChange={async (e) => {
                      handleallowregister(e.target.value);
                    }}
                  >
                    <MenuItem value={'disabled'}>{i18n.t("settings.states.no")}</MenuItem>
                    <MenuItem value={'enabled'}>{i18n.t("settings.states.yes")}</MenuItem>
                  </Select>
                  <FormHelperText>
                    {loadingallowregister && i18n.t("settings.states.updating")}
                  </FormHelperText>
                </FormControl>
              </Grid>

				  <Grid xs={12} sm={12} md={12} item>
                <FormControl className={classes.selectContainer}>
                  <InputLabel id='viewregister-label'>
                    {i18n.t("settings.options.registrationVisible")}
                  </InputLabel>
                  <Select
                    labelId='viewregister-label'
                    value={viewregister}
                    onChange={async (e) => {
                      handleviewregister(e.target.value);
                    }}
                  >
                    <MenuItem value={'disabled'}>{i18n.t("settings.states.no")}</MenuItem>
                    <MenuItem value={'enabled'}>{i18n.t("settings.states.yes")}</MenuItem>
                  </Select>
                  <FormHelperText>
                    {loadingviewregister && i18n.t("settings.states.updating")}
                  </FormHelperText>
                </FormControl>
              </Grid>
			  
			                <Grid xs={12} sm={12} md={12} item>
                <FormControl className={classes.selectContainer}>
                  <InputLabel id='trial-label'>{i18n.t("settings.options.trialTime")}</InputLabel>
                  <Select
                    labelId='trial-label'
                    value={trial}
                    onChange={async (e) => {
                      handletrial(e.target.value);
                    }}
                  >
                    <MenuItem value={'1'}>1</MenuItem>
                    <MenuItem value={'2'}>2</MenuItem>
                    <MenuItem value={'3'}>3</MenuItem>
                    <MenuItem value={'4'}>4</MenuItem>
                    <MenuItem value={'5'}>5</MenuItem>
                    <MenuItem value={'6'}>6</MenuItem>
                    <MenuItem value={'7'}>7</MenuItem>
                  </Select>
                  <FormHelperText>
                    {loadingtrial && 'Atualizando...'}
                  </FormHelperText>
                </FormControl>
              </Grid>

      </>
        )}
      />
	        {/*-----------------CONFIGURACIÓN DE ZONA HORARIA-----------------*/}
      <Grid spacing={3} container
        style={{ marginBottom: 10 }}>
        <Tabs
          value={0}
          indicatorColor="primary"
          textColor="primary"
          scrollButtons="on"
          variant="scrollable"
          className={classes.tab}
        >
          <Tab label="ZONA HORARIA" />
        </Tabs>
        <Grid xs={12} sm={12} md={12} item>
          <FormControl className={classes.selectContainer}>
            <InputLabel id="timezone-label">Zona Horaria para Campañas</InputLabel>
            <Select
              labelId="timezone-label"
              id="timezone"
              name="timezone"
              value={timezoneType}
              onChange={async (e) => {
                handleChangeTimezone(e.target.value);
              }}
              variant="outlined"
            >
              <MenuItem value="America/Lima">Perú (America/Lima)</MenuItem>
              <MenuItem value="America/Sao_Paulo">Brasil (America/Sao_Paulo)</MenuItem>
              <MenuItem value="America/Argentina/Buenos_Aires">Argentina (America/Argentina/Buenos_Aires)</MenuItem>
              <MenuItem value="America/Santiago">Chile (America/Santiago)</MenuItem>
              <MenuItem value="America/Bogota">Colombia (America/Bogota)</MenuItem>
              <MenuItem value="America/Mexico_City">México (America/Mexico_City)</MenuItem>
              <MenuItem value="America/New_York">Estados Unidos - Este (America/New_York)</MenuItem>
              <MenuItem value="America/Los_Angeles">Estados Unidos - Oeste (America/Los_Angeles)</MenuItem>
              <MenuItem value="Europe/Madrid">España (Europe/Madrid)</MenuItem>
              <MenuItem value="Europe/London">Reino Unido (Europe/London)</MenuItem>
              <MenuItem value="Asia/Tokyo">Japón (Asia/Tokyo)</MenuItem>
              <MenuItem value="UTC">UTC (Tiempo Universal)</MenuItem>
            </Select>
            <FormHelperText>
              {loadingTimezoneType ? "Actualizando..." : "Selecciona tu zona horaria para campañas masivas"}
            </FormHelperText>
          </FormControl>
        </Grid>
      </Grid>

      {/*-----------------HUB NOTIFICAME-----------------*/}
      <Grid spacing={3} container style={{ marginBottom: 10 }}>
        <Tabs
          value={0}
          indicatorColor="primary"
          textColor="primary"
          scrollButtons="on"
          variant="scrollable"
          className={classes.tab}
        >
          <Tab label="HUB NOTIFICAME" />
        </Tabs>
        <Grid xs={12} sm={12} md={12} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="HubNotificaMe"
              name="HubNotificaMe"
              margin="dense"
              label="Token Account"
              variant="outlined"
              value={hubNotificaMeToken}
              onChange={async (e) => {
                handleChangeHubNotificaMe(e.target.value);
              }}
            />
            <FormHelperText>
              {loadingHubNotificaMeToken && "Actualizando..."}
            </FormHelperText>
          </FormControl>
        </Grid>
      </Grid>
    </>
  );
}