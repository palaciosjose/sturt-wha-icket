import { logger } from "./logger";
import CampaignShipping from "../models/CampaignShipping";
import Campaign from "../models/Campaign";

export async function cleanCampaignData(campaignId: number) {
  try {
    logger.info(`[Clean] Limpiando datos de campaña ${campaignId}`);
    
    // Eliminar registros de envío de la campaña
    const deletedCount = await CampaignShipping.destroy({
      where: { campaignId }
    });
    
    logger.info(`[Clean] Eliminados ${deletedCount} registros de envío`);
    
    // Resetear estado de la campaña
    await Campaign.update(
      { status: "PROGRAMADA" },
      { where: { id: campaignId } }
    );
    
    logger.info(`[Clean] Estado de campaña ${campaignId} reseteado a PROGRAMADA`);
    
    return { success: true, deletedCount };
  } catch (error) {
    logger.error(`[Clean] Error limpiando campaña ${campaignId}:`, error);
    return { success: false, error };
  }
}

export async function resetAllCampaigns() {
  try {
    logger.info(`[Clean] Reseteando todas las campañas en progreso`);
    
    // Resetear campañas en progreso
    const updatedCount = await Campaign.update(
      { status: "PROGRAMADA" },
      { where: { status: "EM_ANDAMENTO" } }
    );
    
    logger.info(`[Clean] Reseteadas ${updatedCount[0]} campañas`);
    
    return { success: true, updatedCount: updatedCount[0] };
  } catch (error) {
    logger.error(`[Clean] Error reseteando campañas:`, error);
    return { success: false, error };
  }
}

export async function cleanDeliveredShippings() {
  try {
    logger.info(`[Clean] Limpiando registros de envío marcados como entregados`);
    
    // Eliminar registros que tienen deliveredAt pero no fueron realmente enviados
    const deletedCount = await CampaignShipping.destroy({
      where: {
        deliveredAt: { [require('sequelize').Op.ne]: null }
      }
    });
    
    logger.info(`[Clean] Eliminados ${deletedCount} registros de envío entregados`);
    
    return { success: true, deletedCount };
  } catch (error) {
    logger.error(`[Clean] Error limpiando envíos entregados:`, error);
    return { success: false, error };
  }
}

export async function cleanAllShippings() {
  try {
    logger.info(`[Clean] Limpiando todos los registros de envío`);
    
    // Eliminar todos los registros de envío
    const deletedCount = await CampaignShipping.destroy({
      where: {}
    });
    
    logger.info(`[Clean] Eliminados ${deletedCount} registros de envío`);
    
    return { success: true, deletedCount };
  } catch (error) {
    logger.error(`[Clean] Error limpiando todos los envíos:`, error);
    return { success: false, error };
  }
} 