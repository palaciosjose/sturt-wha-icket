import { Request, Response } from "express";
import DashboardDataService, { DashboardData, Params } from "../services/ReportService/DashbardDataService";
import { TicketsAttendance } from "../services/ReportService/TicketsAttendance";
import { TicketsDayService } from "../services/ReportService/TicketsDayService";

type IndexQuery = {
  initialDate: string;
  finalDate: string;
  companyId: number | any;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log("🔍 DashboardController.index - Iniciando...");
    let params: Params = req.query;
    const { companyId } = req.user;

    // ✅ MEJORAR MANEJO DE PARÁMETROS - Si no hay parámetros, usar últimos 7 días por defecto
    if (!params || Object.keys(params).length === 0) {
      params = {
        days: 7,
      };
    }

    const dashboardData: DashboardData = await DashboardDataService(
      companyId,
      params
    );

    // ✅ MEJORAR RESPUESTA - Asegurar que siempre devuelva datos válidos
    const response = {
      counters: dashboardData.counters || {},
      attendants: dashboardData.attendants || [],
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("❌ Error en DashboardController:", error);
    return res.status(500).json({
      counters: {},
      attendants: [],
      error: "Error interno del servidor",
    });
  }
};

export const reportsUsers = async (req: Request, res: Response): Promise<Response> => {

  const { initialDate, finalDate, companyId } = req.query as IndexQuery

  const { data } = await TicketsAttendance({ initialDate, finalDate, companyId });

  return res.json({ data });

}

export const reportsDay = async (req: Request, res: Response): Promise<Response> => {

  const { initialDate, finalDate, companyId } = req.query as IndexQuery

  const { count, data } = await TicketsDayService({ initialDate, finalDate, companyId });

  return res.json({ count, data });

}
