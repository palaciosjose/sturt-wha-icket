import React, { useContext, useState, useEffect } from "react";

import Paper from "@material-ui/core/Paper";
import Container from "@material-ui/core/Container";
import Grid from "@material-ui/core/Grid";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import TextField from "@material-ui/core/TextField";
import FormHelperText from "@material-ui/core/FormHelperText";
import Typography from "@material-ui/core/Typography";
import MobileFriendlyIcon from '@material-ui/icons/MobileFriendly';
import StoreIcon from '@material-ui/icons/Store';
import CallIcon from "@material-ui/icons/Call";
import GroupAddIcon from "@material-ui/icons/GroupAdd";
import HourglassEmptyIcon from "@material-ui/icons/HourglassEmpty";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import AccessAlarmIcon from '@material-ui/icons/AccessAlarm';
import TimerIcon from '@material-ui/icons/Timer';

import { makeStyles } from "@material-ui/core/styles";
import { grey, blue } from "@material-ui/core/colors";
import { toast } from "react-toastify";

import ButtonWithSpinner from "../../components/ButtonWithSpinner";

import TableAttendantsStatus from "../../components/Dashboard/TableAttendantsStatus";
import { isArray } from "lodash";

import { AuthContext } from "../../context/Auth/AuthContext";

import useDashboard from "../../hooks/useDashboard";
import useContacts from "../../hooks/useContacts";
import { ChatsUser } from "./ChartsUser"

import { isEmpty } from "lodash";
import moment from "moment";
import { ChartsDate } from "./ChartsDate";
import { TagsReport } from "./TagsReport";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(2),
  },
  fixedHeightPaper: {
    padding: theme.spacing(2),
    display: "flex",
    flexDirection: "column",
    height: 240,
    overflowY: "auto",
    ...theme.scrollbarStyles,
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
  iframeDashboard: {
    width: "100%",
    height: "calc(100vh - 64px)",
    border: "none",
  },
  customFixedHeightPaper: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: 120,
  },
  customFixedHeightPaperLg: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: "100%",
  },
    card0: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#1e3a8a",
    color: "#ffffff",
  },
      card00: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#1e3a8a",
    color: "#ffffff",
  },
  card1: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#1e3a8a",
    color: "#ffffff",
  },
  card2: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#1e3a8a",
    color: "#ffffff",
  },
  card3: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#1e3a8a",
    color: "#ffffff",
  },
  card4: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#1e3a8a",
    color: "#ffffff",
  },
  card5: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#1e3a8a",
    color: "#ffffff",
  },
  card6: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#1e3a8a",
    color: "#ffffff",
  },
  card7: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#1e3a8a",
    color: "#ffffff",
  },
  card8: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#1e3a8a",
    color: "#ffffff",
  },
  card9: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#1e3a8a",
    color: "#ffffff",
  },
  fixedHeightPaper2: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
  },
}));

const Dashboard = () => {
  const classes = useStyles();
  const [counters, setCounters] = useState({});
  const [attendants, setAttendants] = useState([]);
  const [period, setPeriod] = useState(0);
  const [filterType, setFilterType] = useState(1);
  const [dateFrom, setDateFrom] = useState(moment("1", "D").format("YYYY-MM-DD"));
  const [dateTo, setDateTo] = useState(moment().format("YYYY-MM-DD"));
  const [loading, setLoading] = useState(false);
  const { find } = useDashboard();

  const { user } = useContext(AuthContext);

  useEffect(() => {
    // ✅ CARGAR DATOS AUTOMÁTICAMENTE AL ABRIR EL DASHBOARD
    async function firstLoad() {
      // Establecer valores por defecto para mostrar datos útiles
      if (filterType === 1) {
        // Si es filtro por fecha, usar últimos 7 días por defecto
        const defaultDateFrom = moment().subtract(7, 'days').format("YYYY-MM-DD");
        const defaultDateTo = moment().format("YYYY-MM-DD");
        setDateFrom(defaultDateFrom);
        setDateTo(defaultDateTo);
      } else {
        // Si es filtro por período, usar últimos 7 días por defecto
        setPeriod(7);
      }
      
      // Cargar datos automáticamente
      await fetchData();
    }
    
    setTimeout(() => {
      firstLoad();
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
    async function handleChangePeriod(value) {
    setPeriod(value);
  }

  async function handleChangeFilterType(value) {
    setFilterType(value);
    if (value === 1) {
      setPeriod(0);
    } else {
      setDateFrom("");
      setDateTo("");
    }
  }

  async function fetchData() {
    setLoading(true);

    let params = {};

    if (period > 0) {
      params = {
        days: period,
      };
    }

    if (!isEmpty(dateFrom) && moment(dateFrom).isValid()) {
      params = {
        ...params,
        date_from: moment(dateFrom).format("YYYY-MM-DD"),
      };
    }

    if (!isEmpty(dateTo) && moment(dateTo).isValid()) {
      params = {
        ...params,
        date_to: moment(dateTo).format("YYYY-MM-DD"),
      };
    }

    // ✅ MEJORAR MANEJO DE PARÁMETROS - Si no hay parámetros, usar últimos 7 días por defecto
    if (Object.keys(params).length === 0) {
      params = {
        days: 7, // Usar últimos 7 días por defecto
      };
    }

    try {
      const data = await find(params);

      // ✅ MEJORAR MANEJO DE DATOS - Asegurar que counters tenga valores por defecto
      if (data && data.counters) {
        setCounters({
          avgSupportTime: data.counters.avgSupportTime || 0,
          avgWaitTime: data.counters.avgWaitTime || 0,
          supportHappening: data.counters.supportHappening || 0,
          supportPending: data.counters.supportPending || 0,
          supportFinished: data.counters.supportFinished || 0,
          leads: data.counters.leads || 0,
          totalCompanies: data.counters.totalCompanies || 0,
          totalWhatsappSessions: data.counters.totalWhatsappSessions || 0,
        });
      } else {
        // ✅ VALORES POR DEFECTO SI NO HAY DATOS
        setCounters({
          avgSupportTime: 0,
          avgWaitTime: 0,
          supportHappening: 0,
          supportPending: 0,
          supportFinished: 0,
          leads: 0,
          totalCompanies: 0,
          totalWhatsappSessions: 0,
        });
      }

      if (isArray(data?.attendants)) {
        setAttendants(data.attendants);
      } else {
        setAttendants([]);
      }
    } catch (error) {
      console.error("Error al cargar datos del dashboard:", error);
      toast.error(i18n.t("dashboard.errors.loadData"));
      
      // ✅ VALORES POR DEFECTO EN CASO DE ERROR
      setCounters({
        avgSupportTime: 0,
        avgWaitTime: 0,
        supportHappening: 0,
        supportPending: 0,
        supportFinished: 0,
        leads: 0,
        totalCompanies: 0,
        totalWhatsappSessions: 0,
      });
      setAttendants([]);
    }

    setLoading(false);
  }

    function formatTime(minutes) {
    return moment()
      .startOf("day")
      .add(minutes, "minutes")
      .format("HH[h] mm[m]");
  }

  const GetContacts = (all) => {
    let props = {};
    if (all) {
      props = {};
    }
    const { count } = useContacts(props);
    return count;
  };
  
    function renderFilters() {
    if (filterType === 1) {
      return (
        <>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label={i18n.t("dashboard.filters.initialDate")}
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={classes.fullWidth}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label={i18n.t("dashboard.filters.finalDate")}
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={classes.fullWidth}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
        </>
      );
    } else {
      return (
        <Grid item xs={12} sm={6} md={4}>
          <FormControl className={classes.selectContainer}>
            <InputLabel id="period-selector-label">{i18n.t("dashboard.filters.period")}</InputLabel>
            <Select
              labelId="period-selector-label"
              id="period-selector"
              value={period}
              onChange={(e) => handleChangePeriod(e.target.value)}
            >
              <MenuItem value={0}>{i18n.t("dashboard.filters.noSelection")}</MenuItem>
              <MenuItem value={3}>{i18n.t("dashboard.filters.last3Days")}</MenuItem>
              <MenuItem value={7}>{i18n.t("dashboard.filters.last7Days")}</MenuItem>
              <MenuItem value={15}>{i18n.t("dashboard.filters.last15Days")}</MenuItem>
              <MenuItem value={30}>{i18n.t("dashboard.filters.last30Days")}</MenuItem>
              <MenuItem value={60}>{i18n.t("dashboard.filters.last60Days")}</MenuItem>
              <MenuItem value={90}>{i18n.t("dashboard.filters.last90Days")}</MenuItem>
            </Select>
            <FormHelperText>{i18n.t("dashboard.filters.selectPeriod")}</FormHelperText>
          </FormControl>
        </Grid>
      );
    }
  }

  return (
    <div>
      <Container maxWidth="lg" className={classes.container}>
        <Grid container spacing={3} justifyContent="flex-end">
		
				  {/* FILTROS */}
          <Grid item xs={12} sm={6} md={4}>
            <FormControl className={classes.selectContainer}>
              <InputLabel id="period-selector-label">{i18n.t("dashboard.filters.filterType")}</InputLabel>
              <Select
                labelId="period-selector-label"
                value={filterType}
                onChange={(e) => handleChangeFilterType(e.target.value)}
              >
                <MenuItem value={1}>{i18n.t("dashboard.filters.dateFilter")}</MenuItem>
                <MenuItem value={2}>{i18n.t("dashboard.filters.periodFilter")}</MenuItem>
              </Select>
              <FormHelperText>{i18n.t("dashboard.filters.selectPeriod")}</FormHelperText>
            </FormControl>
          </Grid>

          {renderFilters()}

          {/* BOTAO FILTRAR */}
          <Grid item xs={12} className={classes.alignRight}>
            <ButtonWithSpinner
              loading={loading}
              onClick={() => fetchData()}
              variant="contained"
              color="primary"
            >
              {i18n.t("dashboard.filters.filter")}
            </ButtonWithSpinner>
          </Grid>
		
		{/* CONEXÕES */}
		 {user.super && (	  
		  <Grid item xs={12} sm={6} md={3}>
            <Paper
              className={classes.card0}
              style={{ overflow: "hidden" }}
              elevation={4}
            >
              <Grid container spacing={3}>
                <Grid item xs={8}>
                  <Typography
                    component="h3"
                    variant="h6"
                    paragraph
                  >
                    {i18n.t("dashboard.cards.activeConnections")}
                  </Typography>
                  <Grid item>
                    <Typography
                      component="h1"
                      variant="h4"
                    >
                      {counters.totalWhatsappSessions}
                    </Typography>
                  </Grid>
                </Grid>
                <Grid item xs={2}>
                  <MobileFriendlyIcon
                    style={{
                      fontSize: 100,
                      color: "#fff",
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
		  )}
		
		  
		 {/* EMPRESAS */}
		 {user.super && (
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              className={classes.card00}
              style={{ overflow: "hidden" }}
              elevation={4}
            >
              <Grid container spacing={3}>
                <Grid item xs={8}>
                  <Typography
                    component="h3"
                    variant="h6"
                    paragraph
                  >
                    {i18n.t("dashboard.cards.companies")}
                  </Typography>
                  <Grid item>
                    <Typography
                      component="h1"
                      variant="h4"
                    >
                      {counters.totalCompanies}
                    </Typography>
                  </Grid>
                </Grid>
                <Grid item xs={2}>
                  <StoreIcon
                    style={{
                      fontSize: 100,
                      color: "#fff",
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
		  )}

          {/* EM ATENDIMENTO */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              className={classes.card1}
              style={{ overflow: "hidden" }}
              elevation={4}
            >
              <Grid container spacing={3}>
                <Grid item xs={8}>
                  <Typography
                    component="h3"
                    variant="h6"
                    paragraph
                  >
                    {i18n.t("dashboard.cards.inConversation")}
                  </Typography>
                  <Grid item>
                    <Typography
                      component="h1"
                      variant="h4"
                    >
                      {counters.supportHappening}
                    </Typography>
                  </Grid>
                </Grid>
                <Grid item xs={2}>
                  <CallIcon
                    style={{
                      fontSize: 100,
                      color: "#fff",
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* AGUARDANDO */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              className={classes.card2}
              style={{ overflow: "hidden" }}
              elevation={6}
            >
              <Grid container spacing={3}>
                <Grid item xs={8}>
                  <Typography
                    component="h3"
                    variant="h6"
                    paragraph
                  >
                    {i18n.t("dashboard.cards.waiting")}
                  </Typography>
                  <Grid item>
                    <Typography
                      component="h1"
                      variant="h4"
                    >
                      {counters.supportPending}
                    </Typography>
                  </Grid>
                </Grid>
                <Grid item xs={4}>
                  <HourglassEmptyIcon
                    style={{
                      fontSize: 100,
                      color: "#fff",
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* ATENDENTES ATIVOS */}
			  {/*<Grid item xs={12} sm={6} md={4}>
            <Paper
              className={classes.card6}
              style={{ overflow: "hidden" }}
              elevation={6}
            >
              <Grid container spacing={3}>
                <Grid item xs={8}>
                  <Typography
                    component="h3"
                    variant="h6"
                    paragraph
                  >
                    Conversas Ativas
                  </Typography>
                  <Grid item>
                    <Typography
                      component="h1"
                      variant="h4"
                    >
                      {GetUsers()}
                      <span
                        style={{ color: "#805753" }}
                      >
                        /{attendants.length}
                      </span>
                    </Typography>
                  </Grid>
                </Grid>
                <Grid item xs={4}>
                  <RecordVoiceOverIcon
                    style={{
                      fontSize: 100,
                      color: "#fff",
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
</Grid>*/}

          {/* FINALIZADOS */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              className={classes.card3}
              style={{ overflow: "hidden" }}
              elevation={6}
            >
              <Grid container spacing={3}>
                <Grid item xs={8}>
                  <Typography
                    component="h3"
                    variant="h6"
                    paragraph
                  >
                    {i18n.t("dashboard.cards.finished")}
                  </Typography>
                  <Grid item>
                    <Typography
                      component="h1"
                      variant="h4"
                    >
                      {counters.supportFinished}
                    </Typography>
                  </Grid>
                </Grid>
                <Grid item xs={4}>
                  <CheckCircleIcon
                    style={{
                      fontSize: 100,
                      color: "#fff",
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* NOVOS CONTATOS */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              className={classes.card4}
              style={{ overflow: "hidden" }}
              elevation={6}
            >
              <Grid container spacing={3}>
                <Grid item xs={8}>
                  <Typography
                    component="h3"
                    variant="h6"
                    paragraph
                  >
                    {i18n.t("dashboard.cards.newContacts")}
                  </Typography>
                  <Grid item>
                    <Typography
                      component="h1"
                      variant="h4"
                    >
                      {GetContacts(true)}
                    </Typography>
                  </Grid>
                </Grid>
                <Grid item xs={4}>
                  <GroupAddIcon
                    style={{
                      fontSize: 100,
                      color: "#fff",
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          
          {/* T.M. DE ATENDIMENTO */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              className={classes.card8}
              style={{ overflow: "hidden" }}
              elevation={6}
            >
              <Grid container spacing={3}>
                <Grid item xs={8}>
                  <Typography
                    component="h3"
                    variant="h6"
                    paragraph
                  >
                    {i18n.t("dashboard.cards.avgConversationTime")}
                  </Typography>
                  <Grid item>
                    <Typography
                      component="h1"
                      variant="h4"
                    >
                      {formatTime(counters.avgSupportTime)}
                    </Typography>
                  </Grid>
                </Grid>
                <Grid item xs={4}>
                  <AccessAlarmIcon
                    style={{
                      fontSize: 100,
                      color: "#fff",
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* T.M. DE ESPERA */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              className={classes.card9}
              style={{ overflow: "hidden" }}
              elevation={6}
            >
              <Grid container spacing={3}>
                <Grid item xs={8}>
                  <Typography
                    component="h3"
                    variant="h6"
                    paragraph
                  >
                    {i18n.t("dashboard.cards.avgWaitTime")}
                  </Typography>
                  <Grid item>
                    <Typography
                      component="h1"
                      variant="h4"
                    >
                      {formatTime(counters.avgWaitTime)}
                    </Typography>
                  </Grid>
                </Grid>
                <Grid item xs={4}>
                  <TimerIcon
                    style={{
                      fontSize: 100,
                      color: "#fff",
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
		 

          {/* USUARIOS ONLINE */}
          <Grid item xs={12}>
            {attendants.length ? (
              <TableAttendantsStatus
                attendants={attendants}
                loading={loading}
              />
            ) : null}
          </Grid>

          {/* TOTAL DE ATENDIMENTOS POR USUARIO */}
          <Grid item xs={12}>
            <Paper className={classes.fixedHeightPaper2}>
              <ChatsUser />
            </Paper>
          </Grid>

          {/* TOTAL DE ATENDIMENTOS */}
          <Grid item xs={12}>
            <Paper className={classes.fixedHeightPaper2}>
              <ChartsDate />
            </Paper>
          </Grid>

          {/* ✅ NUEVO REPORTE: ETIQUETAS POR PERIODO */}
          <Grid item xs={12}>
            <Paper className={classes.fixedHeightPaper2}>
              <TagsReport />
            </Paper>
          </Grid>

        </Grid>
      </Container >
    </div >
  );
};

export default Dashboard;
