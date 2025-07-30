import React, { useState, useEffect, useCallback } from "react";
import { makeStyles, Paper, Typography, Modal } from "@material-ui/core";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import { i18n } from "../../translate/i18n";
import useHelps from "../../hooks/useHelps";

const useStyles = makeStyles(theme => ({
  mainPaperContainer: {
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 200px)',
  },
  mainPaper: {
    width: '100%',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: theme.spacing(2),
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  helpPaper: {
    position: 'relative',
    width: '100%',
    maxWidth: '320px',
    padding: 0,
    boxShadow: theme.shadows[2],
    borderRadius: theme.spacing(1),
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: '#fff',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: theme.shadows[4],
    },
  },
  paperHover: {
    // Los estilos de hover se movieron al helpPaper
  },
  videoThumbnail: {
    width: '100%',
    height: '180px', // Altura fija para mantener proporción 16:9
    objectFit: 'cover',
    objectPosition: 'center',
    display: 'block',
    backgroundColor: '#f0f0f0', // Color de fondo mientras carga
  },
  videoThumbnailContainer: {
    position: 'relative',
    width: '100%',
    height: '180px',
  },
  videoDuration: {
    position: 'absolute',
    bottom: '8px',
    right: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: '2px 4px',
    borderRadius: '2px',
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: 1,
  },
  videoContent: {
    padding: theme.spacing(1.5),
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  videoTitle: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.2,
    marginBottom: theme.spacing(0.5),
    color: '#030303',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  videoDescription: {
    fontSize: '0.75rem',
    lineHeight: 1.3,
    color: '#606060',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    marginTop: 'auto',
  },
  videoModal: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoModalContent: {
    outline: 'none',
    width: '90%',
    maxWidth: 1024,
    aspectRatio: '16/9',
    position: 'relative',
    backgroundColor: 'white',
    borderRadius: theme.spacing(1),
    overflow: 'hidden',
  },
}));

const Helps = () => {
  const classes = useStyles();
  const [records, setRecords] = useState([]);
  const { list } = useHelps();
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const helps = await list();
      setRecords(helps);
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openVideoModal = (video) => {
    setSelectedVideo(video);
  };

  const closeVideoModal = () => {
    setSelectedVideo(null);
  };

  const handleModalClose = useCallback((event) => {
    if (event.key === "Escape") {
      closeVideoModal();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleModalClose);
    return () => {
      document.removeEventListener("keydown", handleModalClose);
    };
  }, [handleModalClose]);

  const renderVideoModal = () => {
    return (
      <Modal
        open={Boolean(selectedVideo)}
        onClose={closeVideoModal}
        className={classes.videoModal}
      >
        <div className={classes.videoModalContent}>
          {selectedVideo && (
            <iframe
              style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}
              src={`https://www.youtube.com/embed/${selectedVideo}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </Modal>
    );
  };

  const renderHelps = () => {
    return (
      <>
        <div className={`${classes.mainPaper} ${classes.mainPaperContainer}`}>
          {records.length ? records.map((record, key) => (
            <Paper key={key} className={`${classes.helpPaper} ${classes.paperHover}`} onClick={() => openVideoModal(record.video)}>
              <div className={classes.videoThumbnailContainer}>
                <img
                  src={`https://img.youtube.com/vi/${record.video}/hqdefault.jpg`}
                  alt="Thumbnail"
                  className={classes.videoThumbnail}
                  loading="lazy"
                />
                <div className={classes.videoDuration}>
                  ▶
                </div>
              </div>
              <div className={classes.videoContent}>
                <Typography variant="button" className={classes.videoTitle}>
                  {record.title}
                </Typography>
                <Typography variant="caption" className={classes.videoDescription}>
                  {record.description}
                </Typography>
              </div>
            </Paper>
          )) : null}
        </div>
      </>
    );
  };

  return (
    <MainContainer>
      <MainHeader>
        <Title>{i18n.t("helps.title")} ({records.length})</Title>
        <MainHeaderButtonsWrapper></MainHeaderButtonsWrapper>
      </MainHeader>
      <div className={classes.mainPaper}>
        {renderHelps()}
      </div>
      {renderVideoModal()}
    </MainContainer>
  );
};

export default Helps;