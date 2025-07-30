import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import { Op } from "sequelize";

interface Request {
  oldWhatsappId: number;
  newWhatsappId: number;
  companyId: number;
}

const ReassignTicketsService = async ({
  oldWhatsappId,
  newWhatsappId,
  companyId
}: Request): Promise<{ reassignedCount: number; deletedCount: number }> => {
  
  try {
    console.log(`🔄 Reasignando tickets de WhatsApp ID ${oldWhatsappId} a ${newWhatsappId}`);
    
    // 1. Verificar que la nueva conexión existe
    const newWhatsapp = await Whatsapp.findOne({
      where: { id: newWhatsappId, companyId }
    });
    
    if (!newWhatsapp) {
      throw new Error("Nueva conexión de WhatsApp no encontrada");
    }
    
    // 2. Contar tickets que serán reasignados
    const ticketsToReassign = await Ticket.count({
      where: { 
        whatsappId: oldWhatsappId, 
        companyId,
        status: { [Op.in]: ["open", "pending"] }
      }
    });
    
    // 3. Reasignar tickets activos
    const reassignedResult = await Ticket.update(
      { whatsappId: newWhatsappId },
      { 
        where: { 
          whatsappId: oldWhatsappId, 
          companyId,
          status: { [Op.in]: ["open", "pending"] }
        }
      }
    );
    
    // 4. Eliminar tickets cerrados (opcional)
    const deletedResult = await Ticket.destroy({
      where: { 
        whatsappId: oldWhatsappId, 
        companyId,
        status: "closed"
      }
    });
    
    console.log(`✅ Reasignados: ${reassignedResult[0]} tickets`);
    console.log(`🗑️ Eliminados: ${deletedResult} tickets cerrados`);
    
    return {
      reassignedCount: reassignedResult[0],
      deletedCount: deletedResult
    };
    
  } catch (error) {
    console.error("❌ Error reasignando tickets:", error);
    throw error;
  }
};

export default ReassignTicketsService;