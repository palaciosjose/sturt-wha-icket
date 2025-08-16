import { Request, Response } from "express";
import TagsReportService, { TagsReportParams } from "../services/ReportService/TagsReportService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log("🔍 TagsReportController.index - Iniciando...");
    
    let params: TagsReportParams = req.query;
    const { companyId } = req.user;

    // ✅ MEJORAR MANEJO DE PARÁMETROS - Si no hay parámetros, usar últimos 7 días por defecto
    if (!params || Object.keys(params).length === 0) {
      params = {
        days: 7,
      };
    }

    const tagsReportData = await TagsReportService(companyId, params);

    // ✅ MEJORAR RESPUESTA - Asegurar que siempre devuelva datos válidos
    const response = {
      labels: tagsReportData.labels || [],
      data: tagsReportData.data || [],
      colors: tagsReportData.colors || [],
      total: tagsReportData.total || 0,
    };

    console.log("✅ TagsReportController.index - Datos obtenidos:", {
      totalLabels: response.labels.length,
      totalTickets: response.total
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error("❌ Error en TagsReportController:", error);
    return res.status(500).json({
      labels: [],
      data: [],
      colors: [],
      total: 0,
      error: "Error interno del servidor",
    });
  }
};
