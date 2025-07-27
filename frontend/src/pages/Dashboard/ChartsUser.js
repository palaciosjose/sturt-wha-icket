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
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import esLocale from 'date-fns/locale/es';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { Button, Stack, TextField } from '@mui/material';
import Typography from "@material-ui/core/Typography";
import api from '../../services/api';
import { format } from 'date-fns';
import { toast } from 'react-toastify';


import './button.css';
import { i18n } from '../../translate/i18n';



ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ChartDataLabels
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

export const ChatsUser = () => {
    
    // ✅ ESTABLECER FECHAS POR DEFECTO - Última semana
    const defaultInitialDate = new Date();
    defaultInitialDate.setDate(defaultInitialDate.getDate() - 7);
    
    const [initialDate, setInitialDate] = useState(defaultInitialDate);
    const [finalDate, setFinalDate] = useState(new Date());
    const [ticketsData, setTicketsData] = useState({ data: [] });
    const [loading, setLoading] = useState(false);

    const companyId = localStorage.getItem("companyId");

    const handleGetTicketsInformation = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get(`/dashboard/ticketsUsers?initialDate=${format(initialDate, 'yyyy-MM-dd')}&finalDate=${format(finalDate, 'yyyy-MM-dd')}&companyId=${companyId}`);
            setTicketsData(data);
        } catch (error) {
            console.error('Error cargando datos de usuarios:', error);
            setTicketsData({ data: [] });
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

        labels: ticketsData && ticketsData?.data.length > 0 && ticketsData?.data.map((item) => item.nome),
        datasets: [
            {
                data: ticketsData?.data.length > 0 && ticketsData?.data.map((item, index) => {
                    return item.quantidade
                }),
                backgroundColor: '#2DDD7F',
            },

        ],
    };

    return (
        <>
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
                {i18n.t("dashboard.cards.totalConversationsByUsers")}
            </Typography>

            <Stack direction={'row'} spacing={2} alignItems={'center'} sx={{ my: 2, }} >

                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={esLocale}>
                    <DatePicker
                        value={initialDate}
                        onChange={(newValue) => { setInitialDate(newValue) }}
                        label={i18n.t("dashboard.filters.start")}
                        textField={(params) => <TextField fullWidth {...params} sx={{ width: '20ch' }} />}

                    />
                </LocalizationProvider>

                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={esLocale}>
                    <DatePicker
                        value={finalDate}
                        onChange={(newValue) => { setFinalDate(newValue) }}
                        label={i18n.t("dashboard.filters.end")}
                        textField={(params) => <TextField fullWidth {...params} sx={{ width: '20ch' }} />}
                    />
                </LocalizationProvider>

                <Button className="buttonHover" onClick={handleGetTicketsInformation} variant='contained'>{i18n.t("dashboard.filters.filter")}</Button>

            </Stack>
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