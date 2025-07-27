import React, { useContext, useState, useEffect } from 'react';
import { useHistory } from "react-router-dom";

import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import {
  makeStyles,
} from "@material-ui/core";
import { i18n } from "../../translate/i18n";
import { toast } from 'react-toastify';
import Grid from "@material-ui/core/Grid";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import { grey, blue } from "@material-ui/core/colors";
import { Tabs, Tab } from "@material-ui/core";
import ButtonWithSpinner from "../ButtonWithSpinner";


const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
  },
  mainPaper: {
    width: "100%",
    flex: 1,
    padding: theme.spacing(2),
  },
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
    background: "#f3f4f6",
    borderRadius: 4,
    width: "100%",
    "& .MuiTab-wrapper": {
      color: "#1e3a8a"
    },
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
  buttonContainer: {
    textAlign: "right",
    padding: theme.spacing(1),
  },
  fileInput: {
  	background: "red",
  },
  fileInputLabel: {
    display: "inline-block",
    backgroundColor: "#1e3a8a",
    color: "#fff",
    padding: "8px 16px",
    borderRadius: "4px",
    cursor: "pointer",
    "& input": {
      display: "none",
    },
  },
}));

const Uploader = () => {
  const [file, setFile] = useState(null);
  const [selectedOption, setSelectedOption] = useState("");
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const history = useHistory();
  const [selectedFileName, setSelectedFileName] = useState('');

	

  // trava para nao acessar pagina que não pode 
  useEffect(() => {
    async function fetchData() {
      if (!user.super) {
        toast.error(i18n.t("uploader.messages.noPermission"));
        setTimeout(() => {
          history.push(`/`)
        }, 500);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


const handleFileChange = (event) => {
  const selectedFile = event.target.files[0];
  const allowedTypes = ["image/png", "image/x-icon", "image/svg+xml"];
  
  if (selectedFile && allowedTypes.includes(selectedFile.type)) {
    setFile(selectedFile);
    setSelectedFileName(selectedFile.name);
  } else {
    setFile(null);
    setSelectedFileName(null);
    toast.error(i18n.t("uploader.messages.invalidFormat"));
  }
};

  const handleOptionChange = (event) => {
    setSelectedOption(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!file) {
      toast.warn(i18n.t("uploader.messages.chooseFile"));
      return;
    }

    if (!selectedOption) {
      toast.warn(i18n.t("uploader.messages.chooseDestination"));
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.post(`/settings/media-upload?ref=${selectedOption}`, formData);

      if (response.data.mensagem === 'Arquivo Anexado') {
        toast.success(i18n.t("uploader.messages.fileSent"));
        window.location.reload();

      }
    } catch (error) {
      console.log(error);
    }
  };

return (
  <>
    <Grid spacing={3} container>
      <Tabs
        value={0}
        indicatorColor="primary"
        textColor="primary"
        scrollButtons="on"
        variant="scrollable"
        className={classes.tab}
        style={{
          marginBottom: 20,
          marginTop: 20
        }}
      >
        <Tab label={i18n.t("uploader.title")} />
      </Tabs>

      <form onSubmit={handleSubmit} className={classes.fullWidth}>
      
      	<Grid item xs={12} sm={12} md={12} style={{ display: 'flex' }}>
          <FormControl className={classes.selectContainer}>
            <InputLabel id="selectOption-label">{i18n.t("uploader.selectOption")}</InputLabel>
            <Select
              labelId="selectOption-label"
              value={selectedOption}
              onChange={handleOptionChange}
              style={{ marginTop: 15, marginBottom: 15}}
            >
              <MenuItem value="signup">{i18n.t("uploader.options.signup")}</MenuItem>
              <MenuItem value="login">{i18n.t("uploader.options.login")}</MenuItem>
              <MenuItem value="interno">{i18n.t("uploader.options.internal")}</MenuItem>
			  <MenuItem value="favicon">{i18n.t("uploader.options.favicon")}</MenuItem>
              <MenuItem value="favicon-256x256">{i18n.t("uploader.options.favicon256")}</MenuItem>
			  <MenuItem value="apple-touch-icon">{i18n.t("uploader.options.appleTouch")}</MenuItem>
            </Select>
          </FormControl>
        </Grid>


        <Grid item xs={12} sm={12} md={12} style={{ display: 'flex' }}>
  			<FormControl className={classes.fullWidth}>
   				<label className={classes.fileInputLabel}>
      			<input
        			type="file"
        			onChange={handleFileChange}
        			className={classes.fileInput}
                    style={{ marginTop: 15, marginBottom: 15 }}
      			/>
      			{selectedFileName ? selectedFileName : i18n.t("uploader.fileInput")}
    			</label>
  			</FormControl>
		</Grid>
        
        <Grid item xs={12} sm={12} md={12} style={{ display: 'flex' }}>
          <ButtonWithSpinner
            type="submit"
            className={`${classes.fullWidth} ${classes.button}`}
            style={{ marginTop: 15, marginBottom: 15}}
            variant="contained"
            color="primary"
          >
            {i18n.t("uploader.sendFile")}
          </ButtonWithSpinner>
        </Grid>
      </form>
    </Grid>
  </>
);
};

export default Uploader;