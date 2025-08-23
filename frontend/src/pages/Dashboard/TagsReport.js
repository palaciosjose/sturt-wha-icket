import React, { useEffect, useState, useCallback } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    LineElement,
    PointElement,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Button, Grid, TextField, Typography, Paper } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import api from '../../services/api';
import { format, subDays } from 'date-fns';
import { toast } from 'react-toastify';
import { i18n } from '../../translate/i18n';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    LineElement,
    PointElement
);

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2),
        display: 'flex',
        flexDirection: 'column',
        height: 400,
    },
    title: {
        marginBottom: theme.spacing(2),
        textAlign: 'center',
        fontWeight: 'bold',
    },
    filtersContainer: {
        marginBottom: theme.spacing(2),
    },
    chartContainer: {
        flex: 1,
        minHeight: 300,
    },
    totalContainer: {
        textAlign: 'center',
        marginBottom: theme.spacing(1),
        color: theme.palette.primary.main,
        fontWeight: 'bold',
    }
}));

export const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false, // No mostrar leyenda ya que usamos colores personalizados
        },
        tooltip: {
            callbacks: {
                label: function(context) {
                    return `${context.label}: ${context.parsed.y} ${i18n.t("tagsReport.chart.tooltip")}`;
                }
            }
        }
    },
    scales: {
        y: {
            beginAtZero: true,
            title: {
                display: true,
                text: i18n.t("tagsReport.chart.yAxisTitle")
            }
        },
        x: {
            title: {
                display: true,
                text: i18n.t("tagsReport.chart.xAxisTitle")
            }
        }
    }
};

export const TagsReport = () => {
    const classes = useStyles();
    
    // ESTABLECER FECHAS POR DEFECTO - Última semana
    const defaultInitialDate = subDays(new Date(), 7);
    const [initialDate, setInitialDate] = useState(defaultInitialDate);
    const [finalDate, setFinalDate] = useState(new Date());
    const [tagsData, setTagsData] = useState({ labels: [], data: [], colors: [], total: 0 });
    const [loading, setLoading] = useState(false);

    const companyId = localStorage.getItem("companyId");

    const handleGetTagsReport = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get(`/tagsReport`, {
                params: {
                    date_from: format(initialDate, 'yyyy-MM-dd'),
                    date_to: format(finalDate, 'yyyy-MM-dd'),
                    companyId: companyId
                }
            });
            setTagsData(data);
        } catch (error) {
            console.error('Error cargando reporte de etiquetas:', error);
            setTagsData({ labels: [], data: [], colors: [], total: 0 });
            if (error.response && error.response.status !== 404) {
                toast.error(i18n.t("tagsReport.messages.error"));
            }
        } finally {
            setLoading(false);
        }
    }, [initialDate, finalDate, companyId]);

    // CARGAR DATOS AUTOMÁTICAMENTE AL MOUNT
    useEffect(() => {
        handleGetTagsReport();
    }, [handleGetTagsReport]);

    const dataCharts = {
        labels: tagsData.labels,
        datasets: [
            {
                data: tagsData.data,
                backgroundColor: tagsData.colors,
                borderColor: tagsData.colors.map(color => color + '80'), // Versión transparente para bordes
                borderWidth: 2,
                borderRadius: 4,
                borderSkipped: false,
            }
        ],
    };

    return (
        <Paper className={classes.paper}>
            <Typography component="h2" variant="h6" className={classes.title}>
                <span role="img" aria-label="etiquetas">🏷️</span> {i18n.t("tagsReport.title")} ({tagsData.total})
            </Typography>
            
            <div className={classes.filtersContainer}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            label={i18n.t("tagsReport.filters.start")}
                            type="date"
                            value={format(initialDate, 'yyyy-MM-dd')}
                            onChange={(e) => {
                                const date = new Date(e.target.value);
                                if (!isNaN(date.getTime())) {
                                    setInitialDate(date);
                                }
                            }}
                            InputLabelProps={{
                                shrink: true,
                            }}
                            fullWidth
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            label={i18n.t("tagsReport.filters.end")}
                            type="date"
                            value={format(finalDate, 'yyyy-MM-dd')}
                            onChange={(e) => {
                                const date = new Date(e.target.value);
                                if (!isNaN(date.getTime())) {
                                    setFinalDate(date);
                                }
                            }}
                            InputLabelProps={{
                                shrink: true,
                            }}
                            fullWidth
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Button 
                            variant="contained" 
                            color="primary"
                            onClick={handleGetTagsReport}
                            fullWidth
                        >
                            {i18n.t("tagsReport.filters.filter")}
                        </Button>
                    </Grid>
                </Grid>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Typography>{i18n.t("tagsReport.messages.loading")}</Typography>
                </div>
            ) : tagsData.labels.length > 0 ? (
                <div className={classes.chartContainer}>
                    <Bar options={options} data={dataCharts} />
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Typography>{i18n.t("tagsReport.messages.noData")}</Typography>
                </div>
            )}
        </Paper>
    );
};
