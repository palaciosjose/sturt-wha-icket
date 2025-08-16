import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as TagsReportController from "../controllers/TagsReportController";

const tagsReportRoutes = Router();

// ✅ RUTA PARA OBTENER REPORTE DE ETIQUETAS
tagsReportRoutes.get("/tagsReport", isAuth, TagsReportController.index);

export default tagsReportRoutes;
