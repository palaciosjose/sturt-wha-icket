import express from "express";
import isAuth from "../middleware/isAuth";

import * as WhatsAppController from "../controllers/WhatsAppController";

const whatsappRoutes = express.Router();

whatsappRoutes.get("/whatsapp/", isAuth, WhatsAppController.index);

whatsappRoutes.post("/whatsapp/", isAuth, WhatsAppController.store);

whatsappRoutes.get("/whatsapp/:whatsappId", isAuth, WhatsAppController.show);
whatsappRoutes.get("/whatsapp/:whatsappId/info", isAuth, WhatsAppController.getInfo);

whatsappRoutes.put("/whatsapp/:whatsappId", isAuth, WhatsAppController.update);

whatsappRoutes.post("/whatsapp-restart/", isAuth, WhatsAppController.restart);

// ✅ NUEVAS RUTAS PARA GESTIÓN DE TICKETS
whatsappRoutes.post("/whatsapp/reassign-tickets", isAuth, WhatsAppController.reassignTickets);
whatsappRoutes.delete("/whatsapp/:whatsappId/tickets", isAuth, WhatsAppController.deleteOrphanTickets);

whatsappRoutes.delete(
  "/whatsapp/:whatsappId",
  isAuth,
  WhatsAppController.remove
);

export default whatsappRoutes;
