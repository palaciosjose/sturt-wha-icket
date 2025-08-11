import express from "express";
import * as WebhookHubController from "../controllers/WebhookHubController";
import * as NotificaMeSendController from "../controllers/NotificaMeSendController";

const routes = express.Router();

// ✅ Ruta principal del webhook para NotificaMe (montada en /hub-webhook)
// POST /hub-webhook/{channelId}
routes.post("/:channelId", WebhookHubController.listen);

// ✅ Ruta de prueba del webhook (opcional)
routes.get("/test/:channelId", (req, res) => {
  res.json({ 
    message: "Webhook funcionando correctamente",
    channelId: req.params.channelId,
    timestamp: new Date().toISOString()
  });
});

// ✅ Rutas para envío de mensajes a través de NotificaMe
routes.post("/notificame/send", NotificaMeSendController.sendMessage);
routes.get("/notificame/status/:messageId", NotificaMeSendController.checkMessageStatus);

export default routes;
