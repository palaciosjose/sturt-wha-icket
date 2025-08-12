import { Router } from "express";
import isAuth from "../middleware/isAuth";
import { sendNotificaMeMessage, getNotificaMeStatus } from "../controllers/NotificaMeController";

const notificaMeRoutes = Router();

// ✅ RUTAS PROTEGIDAS POR AUTENTICACIÓN
notificaMeRoutes.use(isAuth);

// ✅ ENVIAR MENSAJE POR NOTIFICAME
notificaMeRoutes.post("/send", sendNotificaMeMessage);

// ✅ OBTENER ESTADO DE CANALES
notificaMeRoutes.get("/status", getNotificaMeStatus);

export default notificaMeRoutes;
