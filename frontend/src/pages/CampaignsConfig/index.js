import React, { useEffect, useState } from "react";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import { toast } from "react-toastify";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import api from "../../services/api";

import { i18n } from "../../translate/i18n";
import {
  Box,
  Button,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Divider,
} from "@material-ui/core";
import ConfirmationModal from "../../components/ConfirmationModal";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
  textRight: {
    textAlign: "right",
  },
  tabPanelsContainer: {
    padding: theme.spacing(2),
  },
}));

const initialSettings = {
  messageInterval: 20,
  longerIntervalAfter: 20,
  greaterInterval: 60,
  variables: [],
};

const CampaignsConfig = () => {
  const classes = useStyles();

  const [settings, setSettings] = useState(initialSettings);
  const [showVariablesForm, setShowVariablesForm] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [variable, setVariable] = useState({ key: "", value: "" });

  useEffect(() => {
    api.get("/campaign-settings").then(({ data }) => {
      const settingsList = [];
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((item) => {
          settingsList.push([item.key, JSON.parse(item.value)]);
        });
        setSettings(Object.fromEntries(settingsList));
      }
    });
  }, []);

  const handleOnChangeVariable = (e) => {
    if (e.target.value !== null) {
      const changedProp = {};
      changedProp[e.target.name] = e.target.value;
      setVariable((prev) => ({ ...prev, ...changedProp }));
    }
  };

  const handleOnChangeSettings = (e) => {
    const changedProp = {};
    changedProp[e.target.name] = e.target.value;
    setSettings((prev) => ({ ...prev, ...changedProp }));
  };

  const addVariable = () => {
    setSettings((prev) => {
      const variablesExists = settings.variables.filter(
        (v) => v.key === variable.key
      );
      const variables = prev.variables;
      if (variablesExists.length === 0) {
        variables.push(Object.assign({}, variable));
        setVariable({ key: "", value: "" });
      }
      return { ...prev, variables };
    });
  };

  const removeVariable = () => {
    const newList = settings.variables.filter((v) => v.key !== selectedKey);
    setSettings((prev) => ({ ...prev, variables: newList }));
    setSelectedKey(null);
  };

  const saveSettings = async () => {
    await api.post("/campaign-settings", { settings });
    toast.success(i18n.t("campaignsConfig.messages.saveSuccess"));
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={i18n.t("campaigns.confirmationModal.deleteTitle")}
        open={confirmationOpen}
        onClose={() => setConfirmationOpen(false)}
        onConfirm={removeVariable}
      >
        {i18n.t("campaigns.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <MainHeader>
        <Grid style={{ width: "99.6%" }} container>
          <Grid xs={12} item>
            <Title>{i18n.t("campaignsConfig.title")}</Title>
          </Grid>
        </Grid>
      </MainHeader>
      <Paper className={classes.mainPaper} variant="outlined">
        <Box className={classes.tabPanelsContainer}>
          <Grid spacing={2} container>
            {/* ✅ INFORMACIÓN DE AYUDA */}
            <Grid xs={12} item>
              <Paper style={{ padding: 16, marginBottom: 16, backgroundColor: "#e3f2fd", border: "1px solid #2196f3" }}>
                <Typography variant="body2">
                  <strong><span role="img" aria-label="idea">💡</span> ¿Para qué sirve esta configuración?</strong><br/>
                  • <strong>Intervalos:</strong> Controlan el tiempo entre mensajes para evitar bloqueos de WhatsApp<br/>
                  • <strong>Variables:</strong> Crean atajos personalizados para usar en tus mensajes de campaña
                </Typography>
              </Paper>
            </Grid>
            
            <Grid xs={12} item>
              <Typography component={"h3"} variant="h6" style={{ marginBottom: 8 }}>
                {i18n.t("campaignsConfig.intervals")}
              </Typography>
              <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
                {i18n.t("campaignsConfig.help.intervals")}
              </Typography>
            </Grid>
            <Grid xs={12} md={4} item>
              <FormControl
                variant="outlined"
                className={classes.formControl}
                fullWidth
              >
                <InputLabel id="messageInterval-label">
                  {i18n.t("campaignsConfig.form.randomTriggerInterval")}
                </InputLabel>
                <Select
                  name="messageInterval"
                  id="messageInterval"
                  labelId="messageInterval-label"
                  label={i18n.t("campaignsConfig.form.randomTriggerInterval")}
                  value={settings.messageInterval}
                  onChange={(e) => handleOnChangeSettings(e)}
                >
                  <MenuItem value={0}>{i18n.t("campaignsConfig.form.noInterval")}</MenuItem>
                  <MenuItem value={5}>5 {i18n.t("campaignsConfig.form.seconds")}</MenuItem>
                  <MenuItem value={10}>10 {i18n.t("campaignsConfig.form.seconds")}</MenuItem>
                  <MenuItem value={15}>15 {i18n.t("campaignsConfig.form.seconds")}</MenuItem>
                  <MenuItem value={20}>20 {i18n.t("campaignsConfig.form.seconds")}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid xs={12} md={4} item>
              <FormControl
                variant="outlined"
                className={classes.formControl}
                fullWidth
              >
                <InputLabel id="longerIntervalAfter-label">
                  {i18n.t("campaignsConfig.form.longerIntervalAfter")}
                </InputLabel>
                <Select
                  name="longerIntervalAfter"
                  id="longerIntervalAfter"
                  labelId="longerIntervalAfter-label"
                  label={i18n.t("campaignsConfig.form.longerIntervalAfter")}
                  value={settings.longerIntervalAfter}
                  onChange={(e) => handleOnChangeSettings(e)}
                >
                  <MenuItem value={0}>{i18n.t("campaignsConfig.form.notDefined")}</MenuItem>
                  <MenuItem value={1}>1 {i18n.t("campaignsConfig.form.second")}</MenuItem>
                  <MenuItem value={5}>5 {i18n.t("campaignsConfig.form.seconds")}</MenuItem>
                  <MenuItem value={10}>10 {i18n.t("campaignsConfig.form.seconds")}</MenuItem>
                  <MenuItem value={15}>15 {i18n.t("campaignsConfig.form.seconds")}</MenuItem>
                  <MenuItem value={20}>20 {i18n.t("campaignsConfig.form.seconds")}</MenuItem>
                  <MenuItem value={30}>30 {i18n.t("campaignsConfig.form.seconds")}</MenuItem>
                  <MenuItem value={40}>40 {i18n.t("campaignsConfig.form.seconds")}</MenuItem>
                  <MenuItem value={60}>60 {i18n.t("campaignsConfig.form.seconds")}</MenuItem>
                  <MenuItem value={80}>80 {i18n.t("campaignsConfig.form.seconds")}</MenuItem>
                  <MenuItem value={100}>100 {i18n.t("campaignsConfig.form.seconds")}</MenuItem>
                  <MenuItem value={120}>120 {i18n.t("campaignsConfig.form.seconds")}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid xs={12} md={4} item>
              <FormControl
                variant="outlined"
                className={classes.formControl}
                fullWidth
              >
                <InputLabel id="greaterInterval-label">
                  {i18n.t("campaignsConfig.form.greaterTriggerInterval")}
                </InputLabel>
                <Select
                  name="greaterInterval"
                  id="greaterInterval"
                  labelId="greaterInterval-label"
                  label={i18n.t("campaignsConfig.form.greaterTriggerInterval")}
                  value={settings.greaterInterval}
                  onChange={(e) => handleOnChangeSettings(e)}
                >
                  <MenuItem value={0}>{i18n.t("campaignsConfig.form.noInterval")}</MenuItem>
                  <MenuItem value={1}>1 {i18n.t("campaignsConfig.form.second")}</MenuItem>
                  <MenuItem value={5}>5 {i18n.t("campaignsConfig.form.seconds")}</MenuItem>
                  <MenuItem value={10}>10 {i18n.t("campaignsConfig.form.seconds")}</MenuItem>
                  <MenuItem value={15}>15 {i18n.t("campaignsConfig.form.seconds")}</MenuItem>
                  <MenuItem value={20}>20 {i18n.t("campaignsConfig.form.seconds")}</MenuItem>
                  <MenuItem value={30}>30 {i18n.t("campaignsConfig.form.seconds")}</MenuItem>
                  <MenuItem value={40}>40 {i18n.t("campaignsConfig.form.seconds")}</MenuItem>
                  <MenuItem value={60}>60 {i18n.t("campaignsConfig.form.seconds")}</MenuItem>
                  <MenuItem value={80}>80 {i18n.t("campaignsConfig.form.seconds")}</MenuItem>
                  <MenuItem value={100}>100 {i18n.t("campaignsConfig.form.seconds")}</MenuItem>
                  <MenuItem value={120}>120 {i18n.t("campaignsConfig.form.seconds")}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {/* ✅ SECCIÓN DE VARIABLES */}
            <Grid xs={12} item>
              <Divider style={{ margin: "24px 0" }} />
              <Typography component={"h3"} variant="h6" style={{ marginBottom: 8 }}>
                Variables Personalizadas
              </Typography>
              <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
                {i18n.t("campaignsConfig.help.variables")}
              </Typography>
            </Grid>
            
            <Grid xs={12} className={classes.textRight} item>
              <Button
                onClick={() => setShowVariablesForm(!showVariablesForm)}
                color="primary"
                style={{ marginRight: 10 }}
              >
                {i18n.t("campaignsConfig.buttons.addVariable")}
              </Button>
              <Button
                onClick={saveSettings}
                color="primary"
                variant="contained"
              >
                {i18n.t("campaignsConfig.buttons.saveConfigurations")}
              </Button>
            </Grid>
            {showVariablesForm && (
              <>
                {/* ✅ INFORMACIÓN DE AYUDA PARA VARIABLES */}
                <Grid xs={12} item>
                  <Paper style={{ padding: 16, marginBottom: 16, backgroundColor: "#e8f5e8", border: "1px solid #4caf50" }}>
                    <Typography variant="body2">
                      <strong><span role="img" aria-label="herramienta">🔧</span> Variables Personalizadas</strong><br/>
                      {i18n.t("campaignsConfig.help.variables")}<br/>
                      <strong>Ejemplo:</strong> {i18n.t("campaignsConfig.help.example")}
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid xs={12} md={6} item>
                  <TextField
                    label={i18n.t("campaignsConfig.variables.shortcut")}
                    variant="outlined"
                    value={variable.key}
                    name="key"
                    onChange={handleOnChangeVariable}
                    fullWidth
                    placeholder="Ej: empresa"
                    helperText="Palabra clave para usar en mensajes"
                  />
                </Grid>
                <Grid xs={12} md={6} item>
                  <TextField
                    label={i18n.t("campaignsConfig.variables.content")}
                    variant="outlined"
                    value={variable.value}
                    name="value"
                    onChange={handleOnChangeVariable}
                    fullWidth
                    placeholder="Ej: Mi Empresa S.A."
                    helperText="Valor que reemplazará el atajo"
                  />
                </Grid>
                <Grid xs={12} className={classes.textRight} item>
                  <Button
                    onClick={() => setShowVariablesForm(!showVariablesForm)}
                    color="primary"
                    style={{ marginRight: 10 }}
                  >
                    {i18n.t("campaignsConfig.buttons.close")}
                  </Button>
                  <Button
                    onClick={addVariable}
                    color="primary"
                    variant="contained"
                  >
                    {i18n.t("campaignsConfig.buttons.add")}
                  </Button>
                </Grid>
              </>
            )}
            {settings.variables.length > 0 && (
              <Grid xs={12} className={classes.textRight} item>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell style={{ width: "1%" }}></TableCell>
                      <TableCell>{i18n.t("campaignsConfig.variables.shortcut")}</TableCell>
                      <TableCell>{i18n.t("campaignsConfig.variables.content")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.isArray(settings.variables) &&
                      settings.variables.map((v, k) => (
                        <TableRow key={k}>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedKey(v.key);
                                setConfirmationOpen(true);
                              }}
                            >
                              <DeleteOutlineIcon />
                            </IconButton>
                          </TableCell>
                          <TableCell>{"{" + v.key + "}"}</TableCell>
                          <TableCell>{v.value}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </Grid>
            )}
          </Grid>
        </Box>
      </Paper>
    </MainContainer>
  );
};

export default CampaignsConfig;
