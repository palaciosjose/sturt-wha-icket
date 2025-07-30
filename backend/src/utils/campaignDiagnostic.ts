import { logger } from "./logger";
import Campaign from "../models/Campaign";
import CampaignShipping from "../models/CampaignShipping";
import ContactList from "../models/ContactList";
import ContactListItem from "../models/ContactListItem";
import Whatsapp from "../models/Whatsapp";
import { Op } from "sequelize";
import moment from "moment";

export async function diagnoseCampaignSystem() {
  // Diagnóstico simplificado - solo verificar estado básico
  try {
    const scheduledCampaigns = await Campaign.count({
      where: {
        status: "PROGRAMADA",
        scheduledAt: {
          [Op.gte]: moment().subtract(1, "hour").toDate(),
          [Op.lte]: moment().add(1, "hour").toDate()
        }
      }
    });

    const activeCampaigns = await Campaign.count({
      where: { status: "EM_ANDAMENTO" }
    });

    const whatsapps = await Whatsapp.count({
      where: { status: "CONNECTED" }
    });

    if (scheduledCampaigns > 0 || activeCampaigns > 0) {
      logger.info(`[Sistema] Campañas: ${scheduledCampaigns} programadas, ${activeCampaigns} activas, ${whatsapps} WhatsApp conectados`);
    }

  } catch (error) {
    logger.error("Error en diagnóstico:", error);
  }
}

export async function testCampaignQueue() {
  logger.info("=== PRUEBA DEL SISTEMA DE COLAS ===");
  
  try {
    // Crear una campaña de prueba
    const testCampaign = await Campaign.create({
      name: "TEST_CAMPAIGN_" + Date.now(),
      status: "PROGRAMADA",
      scheduledAt: moment().add(1, "minute").toDate(),
      confirmation: false,
      companyId: 1,
      contactListId: 1,
      whatsappId: 1,
      message1: "Mensaje de prueba"
    });
    
    logger.info(`Campaña de prueba creada: ID ${testCampaign.id}`);
    
    // Verificar que se procese en el próximo ciclo
    setTimeout(async () => {
      const updatedCampaign = await Campaign.findByPk(testCampaign.id);
      logger.info(`Estado de la campaña de prueba: ${updatedCampaign.status}`);
      
      // Limpiar campaña de prueba
      await testCampaign.destroy();
      logger.info("Campaña de prueba eliminada");
    }, 30000); // Esperar 30 segundos
    
  } catch (error) {
    logger.error("Error en prueba de cola:", error);
  }
} 