import express from "express";
import isAuth from "../middleware/isAuth";

import * as CampaignController from "../controllers/CampaignController";
import multer from "multer";
import uploadConfig from "../config/upload";
import { cleanCampaignData, resetAllCampaigns, cleanDeliveredShippings, cleanAllShippings } from "../utils/cleanCampaignData";

const upload = multer(uploadConfig);

const routes = express.Router();

routes.get("/campaigns/list", isAuth, CampaignController.findList);

routes.get("/campaigns", isAuth, CampaignController.index);

routes.get("/campaigns/:id", isAuth, CampaignController.show);

routes.post("/campaigns", isAuth, CampaignController.store);

routes.put("/campaigns/:id", isAuth, CampaignController.update);

routes.delete("/campaigns/:id", isAuth, CampaignController.remove);

routes.post("/campaigns/:id/cancel", isAuth, CampaignController.cancel);

routes.post("/campaigns/:id/restart", isAuth, CampaignController.restart);

routes.post(
  "/campaigns/:id/media-upload",
  isAuth,
  upload.array("file"),
  CampaignController.mediaUpload
);

routes.delete(
  "/campaigns/:id/media-upload",
  isAuth,
  CampaignController.deleteMedia
);

// Rutas temporales para limpiar datos
routes.post("/campaigns/:id/clean", isAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await cleanCampaignData(parseInt(id));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

routes.post("/campaigns/reset-all", isAuth, async (req, res) => {
  try {
    const result = await resetAllCampaigns();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Nuevas rutas para limpiar registros de envío
routes.post("/campaigns/clean-delivered", isAuth, async (req, res) => {
  try {
    const result = await cleanDeliveredShippings();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

routes.post("/campaigns/clean-all-shippings", isAuth, async (req, res) => {
  try {
    const result = await cleanAllShippings();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ruta para envío manual de mensajes de campaña
routes.post("/campaigns/:campaignId/shipping/:shippingId/send", isAuth, async (req, res) => {
  try {
    const { campaignId, shippingId } = req.params;
    
    // Importar las funciones necesarias
    const CampaignShipping = require("../models/CampaignShipping").default;
    const Campaign = require("../models/Campaign").default;
    const GetWhatsappWbot = require("../helpers/GetWhatsappWbot").default;
    const moment = require("moment");
    
    // Buscar el envío
    const shipping = await CampaignShipping.findByPk(shippingId);
    if (!shipping) {
      return res.status(404).json({ error: "Envío no encontrado" });
    }
    
    // Buscar la campaña
    const campaign = await Campaign.findByPk(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: "Campaña no encontrada" });
    }
    
    // Obtener la instancia de WhatsApp
    const wbot = await GetWhatsappWbot(campaign.whatsapp);
    if (!wbot) {
      return res.status(500).json({ error: "WhatsApp no disponible" });
    }
    
    // Enviar el mensaje
    const chatId = `${shipping.number}@s.whatsapp.net`;
    const message = shipping.message || "Mensaje de campaña";
    
    await wbot.sendMessage(chatId, {
      text: message
    });
    
    // Actualizar el registro
    await shipping.update({
      deliveredAt: moment().toDate(),
      jobId: `MANUAL_SEND_${Date.now()}`
    });
    
    res.json({ 
      success: true, 
      message: "Mensaje enviado exitosamente",
      shippingId: shipping.id,
      number: shipping.number
    });
    
  } catch (error) {
    console.error("Error en envío manual:", error);
    res.status(500).json({ error: error.message });
  }
});

export default routes;
