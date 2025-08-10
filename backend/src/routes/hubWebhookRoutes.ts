import express from "express";
import * as HubWebhookController from "../controllers/HubWebhookController";
import * as NotificaMeSendController from "../controllers/NotificaMeSendController";

const routes = express.Router();

// ✅ Ruta principal del webhook para NotificaMe
// POST /{token}
routes.post("/:token", HubWebhookController.handleWebhook);

// ✅ Ruta de prueba del webhook (opcional)
routes.get("/test/:token", (req, res) => {
  res.json({ 
    message: "Webhook funcionando correctamente",
    token: req.params.token,
    timestamp: new Date().toISOString()
  });
});

// ✅ Rutas para envío de mensajes a través de NotificaMe
routes.post("/notificame/send", NotificaMeSendController.sendMessage);
routes.get("/notificame/status/:messageId", NotificaMeSendController.checkMessageStatus);

export default routes;
