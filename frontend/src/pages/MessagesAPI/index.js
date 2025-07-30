import React, { useState, useEffect, useContext } from "react";
import { useHistory } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";

import { i18n } from "../../translate/i18n";
import { Button, CircularProgress, Grid, TextField, Typography } from "@material-ui/core";
import { Field, Form, Formik } from "formik";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
// import api from "../../services/api";
import axios from "axios";
import usePlans from "../../hooks/usePlans";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(2),
    paddingBottom: 100
  },
  mainHeader: {
    marginTop: theme.spacing(1),
  },
  elementMargin: {
    padding: theme.spacing(2),
  },
  formContainer: {
    maxWidth: 500,
  },
  textRight: {
    textAlign: "right"
  }
}));

const MessagesAPI = () => {
  const classes = useStyles();
  const history = useHistory();
  const { user } = useContext(AuthContext);
  const companyId = user?.companyId;

  const [formMessageTextData,] = useState({ token: '', number: '', body: '' })
  const [formMessageMediaData,] = useState({ token: '', number: '', medias: '' })
  const [file, setFile] = useState({})

  const { getPlanCompany } = usePlans();

  useEffect(() => {
    async function fetchData() {
      if (companyId) {
        const planConfigs = await getPlanCompany(undefined, companyId);
        if (!planConfigs.plan.useExternalApi) {
          toast.error(i18n.t("messagesAPI.messages.noPermission"));
          setTimeout(() => {
            history.push(`/`)
          }, 1000);
        }
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getEndpoint = () => {
    return (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080') + '/api/messages/send'
  }

  const handleSendTextMessage = async (values) => {
    const { number, body } = values;
    const data = { number, body };
    try {
      await axios.request({
        url: getEndpoint(),
        method: 'POST',
        data,
        headers: {
          'Content-type': 'application/json',
          'Authorization': `Bearer ${values.token}`
        }
      })
      toast.success(i18n.t("messagesAPI.messages.success"));
    } catch (err) {
      toastError(err);
    }
  }

  const handleSendMediaMessage = async (values) => {
    try {
      const firstFile = file[0];
      const data = new FormData();
      data.append('number', values.number);
      data.append('body', firstFile.name);
      data.append('medias', firstFile);
      await axios.request({
        url: getEndpoint(),
        method: 'POST',
        data,
        headers: {
          'Content-type': 'multipart/form-data',
          'Authorization': `Bearer ${values.token}`
        }
      })
      toast.success(i18n.t("messagesAPI.messages.success"));
    } catch (err) {
      toastError(err);
    }
  }

  const renderFormMessageText = () => {
    return (
      <Formik
        initialValues={formMessageTextData}
        enableReinitialize={true}
        onSubmit={(values, actions) => {
          setTimeout(async () => {
            await handleSendTextMessage(values);
            actions.setSubmitting(false);
            actions.resetForm()
          }, 400);
        }}
        className={classes.elementMargin}
      >
        {({ isSubmitting }) => (
          <Form className={classes.formContainer}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Field
                  as={TextField}
                  label={i18n.t("messagesAPI.textMessage.token")}
                  name="token"
                  autoFocus
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  className={classes.textField}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Field
                  as={TextField}
                  label={i18n.t("messagesAPI.textMessage.number")}
                  name="number"
                  autoFocus
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  className={classes.textField}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <Field
                  as={TextField}
                  label={i18n.t("messagesAPI.textMessage.body")}
                  name="body"
                  autoFocus
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  className={classes.textField}
                  required
                />
              </Grid>
              <Grid item xs={12} className={classes.textRight}>
                <Button
                  type="submit"
                  color="primary"
                  variant="contained"
                  className={classes.btnWrapper}
                >
                  {isSubmitting ? (
                    <CircularProgress
                      size={24}
                      className={classes.buttonProgress}
                    />
                  ) : 'Enviar'}
                </Button>
              </Grid>
            </Grid>
          </Form>
        )}
      </Formik>
    )
  }

  const renderFormMessageMedia = () => {
    return (
      <Formik
        initialValues={formMessageMediaData}
        enableReinitialize={true}
        onSubmit={(values, actions) => {
          setTimeout(async () => {
            await handleSendMediaMessage(values);
            actions.setSubmitting(false);
            actions.resetForm()
            document.getElementById('medias').files = null
            document.getElementById('medias').value = null
          }, 400);
        }}
        className={classes.elementMargin}
      >
        {({ isSubmitting }) => (
          <Form className={classes.formContainer}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Field
                  as={TextField}
                  label={i18n.t("messagesAPI.mediaMessage.token")}
                  name="token"
                  autoFocus
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  className={classes.textField}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Field
                  as={TextField}
                  label={i18n.t("messagesAPI.mediaMessage.number")}
                  name="number"
                  autoFocus
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  className={classes.textField}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <input type="file" name="medias" id="medias" required onChange={(e) => setFile(e.target.files)} />
              </Grid>
              <Grid item xs={12} className={classes.textRight}>
                <Button
                  type="submit"
                  color="primary"
                  variant="contained"
                  className={classes.btnWrapper}
                >
                  {isSubmitting ? (
                    <CircularProgress
                      size={24}
                      className={classes.buttonProgress}
                    />
                  ) : i18n.t("messagesAPI.documentation.send")}
                </Button>
              </Grid>
            </Grid>
          </Form>
        )}
      </Formik>
    )
  }

  return (
    <Paper
      className={classes.mainPaper}
      style={{marginLeft: "5px"}}
      // className={classes.elementMargin}
      variant="outlined"
    >
      <Typography variant="h5">
        {i18n.t("messagesAPI.documentation.title")}
      </Typography>
      <Typography variant="h6" color="primary" className={classes.elementMargin}>
        {i18n.t("messagesAPI.documentation.methods")}
      </Typography>
      <Typography component="div">
        <ol>
          <li>{i18n.t("messagesAPI.documentation.textMessages")}</li>
          <li>{i18n.t("messagesAPI.documentation.mediaMessages")}</li>
        </ol>
      </Typography>
      <Typography variant="h6" color="primary" className={classes.elementMargin}>
        {i18n.t("messagesAPI.documentation.instructions")}
      </Typography>
      <Typography className={classes.elementMargin} component="div">
        <b>{i18n.t("messagesAPI.documentation.importantNotes")}</b><br />
        <ul>
          <li>{i18n.t("messagesAPI.instructions.tokenRequired")}</li>
          <li>
            {i18n.t("messagesAPI.instructions.numberFormat")}
            <ul>
              <li>{i18n.t("messagesAPI.instructions.countryCode")}</li>
              <li>{i18n.t("messagesAPI.instructions.areaCode")}</li>
              <li>{i18n.t("messagesAPI.instructions.number")}</li>
            </ul>
          </li>
        </ul>
      </Typography>
      <Typography variant="h6" color="primary" className={classes.elementMargin}>
        1. {i18n.t("messagesAPI.documentation.textMessages")}
      </Typography>
      <Grid container>
        <Grid item xs={12} sm={6}>
          <Typography className={classes.elementMargin} component="div">
            <p>{i18n.t("messagesAPI.apiInfo.textMessageInfo")}</p>
            <b>{i18n.t("messagesAPI.documentation.endpoint")}: </b> {getEndpoint()} <br />
            <b>{i18n.t("messagesAPI.documentation.method")}: </b> POST <br />
            <b>{i18n.t("messagesAPI.documentation.headers")}: </b> {i18n.t("messagesAPI.apiInfo.authorization")} <br />
            <b>{i18n.t("messagesAPI.documentation.body")}: </b> {i18n.t("messagesAPI.apiInfo.exampleBody")}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography className={classes.elementMargin}>
            <b>{i18n.t("messagesAPI.documentation.testSend")}</b>
          </Typography>
          {renderFormMessageText()}
        </Grid>
      </Grid>
      <Typography variant="h6" color="primary" className={classes.elementMargin}>
        2. {i18n.t("messagesAPI.documentation.mediaMessages")}
      </Typography>
      <Grid container>
        <Grid item xs={12} sm={6}>
          <Typography className={classes.elementMargin} component="div">
            <p>{i18n.t("messagesAPI.apiInfo.mediaMessageInfo")}</p>
            <b>{i18n.t("messagesAPI.documentation.endpoint")}: </b> {getEndpoint()} <br />
            <b>{i18n.t("messagesAPI.documentation.method")}: </b> POST <br />
            <b>{i18n.t("messagesAPI.documentation.headers")}: </b> {i18n.t("messagesAPI.apiInfo.multipartForm")} <br />
            <b>{i18n.t("messagesAPI.documentation.formData")}: </b> <br />
            <ul>
              <li>
                <b>number: </b> {i18n.t("messagesAPI.apiInfo.exampleNumber")}
              </li>
              <li>
                <b>medias: </b> {i18n.t("messagesAPI.apiInfo.exampleFile")}
              </li>
            </ul>
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography className={classes.elementMargin}>
            <b>{i18n.t("messagesAPI.documentation.testSend")}</b>
          </Typography>
          {renderFormMessageMedia()}
        </Grid>
      </Grid>
    </Paper>
  );
};

export default MessagesAPI;