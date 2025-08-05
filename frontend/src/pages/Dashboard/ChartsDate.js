import React, { useEffect, useState, useCallback } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Button, Grid, TextField } from '@material-ui/core';
import Typography from "@material-ui/core/Typography";
import api from '../../services/api';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { i18n } from '../../translate/i18n';
import './button.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

export const options = {
    responsive: true,
    plugins: {
        legend: {
            position: 'top',
            display: false,
        },
        title: {
            display: true,
            text: 'Gráfico de Conversas',
            position: 'left',
        },
        datalabels: {
            display: true,
            anchor: 'start',
            offset: -30,
            align: "start",
            color: "#fff",
            textStrokeColor: "#000",
            textStrokeWidth: 2,
            font: {
                size: 20,
                weight: "bold"

            },
        }
    },
};

export const ChartsDate = () => {

    // ✅ ESTABLECER FECHAS POR DEFECTO - Última semana
    const defaultInitialDate = new Date();
    defaultInitialDate.setDate(defaultInitialDate.getDate() - 7);
    
    const [initialDate, setInitialDate] = useState(defaultInitialDate);
    const [finalDate, setFinalDate] = useState(new Date());
    const [ticketsData, setTicketsData] = useState({ data: [], count: 0 });
    const [loading, setLoading] = useState(false);

    const companyId = localStorage.getItem("companyId");

    const handleGetTicketsInformation = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get(`/dashboard/ticketsDay?initialDate=${format(initialDate, 'yyyy-MM-dd')}&finalDate=${format(finalDate, 'yyyy-MM-dd')}&companyId=${companyId}`);
            setTicketsData(data);
        } catch (error) {
            console.error('Error cargando datos por fecha:', error);
            setTicketsData({ data: [], count: 0 });
            // ✅ NO MOSTRAR ERROR SI NO HAY DATOS - Es normal que no haya datos
            if (error.response && error.response.status !== 404) {
                toast.error(i18n.t("dashboard.errors.errorGettingConversationInfo"));
            }
        } finally {
            setLoading(false);
        }
    }, [initialDate, finalDate, companyId]);

    // ✅ CARGAR DATOS AUTOMÁTICAMENTE AL MOUNT
    useEffect(() => {
        handleGetTicketsInformation();
    }, [handleGetTicketsInformation]);

    const dataCharts = {

        labels: ticketsData && ticketsData?.data.length > 0 && ticketsData?.data.map((item) => (item.hasOwnProperty('horario') ? `De ${item.horario}:00 a ${item.horario}:59` : item.data)),
        datasets: [
            {
                // label: 'Dataset 1',
                data: ticketsData?.data.length > 0 && ticketsData?.data.map((item, index) => {
                    return item.total
                }),
                backgroundColor: '#2DDD7F',
            },
        ],
    };

    return (
        <>
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
                {i18n.t("dashboard.cards.totalAttendances")} ({ticketsData?.count})
            </Typography>

            <Grid container spacing={2} style={{ margin: '16px 0' }}>

                <Grid item xs={12} sm={6} md={3}>
                    <TextField
                        label={i18n.t("dashboard.filters.start")}
                        type="date"
                        value={initialDate instanceof Date && !isNaN(initialDate) ? format(initialDate, 'yyyy-MM-dd') : ''}
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
                        style={{ width: '200px' }}
                    />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <TextField
                        label={i18n.t("dashboard.filters.end")}
                        type="date"
                        value={finalDate instanceof Date && !isNaN(finalDate) ? format(finalDate, 'yyyy-MM-dd') : ''}
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
                        style={{ width: '200px' }}
                    />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Button className="buttonHover" onClick={handleGetTicketsInformation} variant='contained' >{i18n.t("dashboard.filters.filter")}</Button>
                </Grid>

            </Grid>
            {loading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Typography>Cargando datos...</Typography>
                </div>
            ) : (
                <Bar options={options} data={dataCharts} style={{ maxWidth: '100%', maxHeight: '280px', }} />
            )}
        </>
    );
}