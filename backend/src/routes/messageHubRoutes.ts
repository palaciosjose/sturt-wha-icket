import { Router } from "express";
import isAuth from "../middleware/isAuth";
import { send, store } from "../controllers/MessageHubController";

const messageHubRoutes = Router();

// ✅ RUTAS PROTEGIDAS POR AUTENTICACIÓN
messageHubRoutes.use(isAuth);

// ✅ ENVIAR MENSAJE POR NOTIFICAME
messageHubRoutes.post("/:ticketId", send);

// ✅ CREAR TICKET DE NOTIFICAME
messageHubRoutes.post("/", store);

export default messageHubRoutes;
