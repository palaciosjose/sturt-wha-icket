import { Op } from "sequelize";
import Ticket from "../../models/Ticket"
import Whatsapp from "../../models/Whatsapp"
import { getIO } from "../../libs/socket"
import formatBody from "../../helpers/Mustache";
import SendWhatsAppMessage from "./SendWhatsAppMessage";
import moment from "moment";
import ShowTicketService from "../TicketServices/ShowTicketService";
import { verifyMessage } from "./wbotMessageListener";
import TicketTraking from "../../models/TicketTraking";
import UpdateTicketService from "../TicketServices/UpdateTicketService";

export const ClosedAllOpenTickets = async (companyId: number): Promise<void> => {
  console.log(`🔍 [AutoClose] Iniciando verificación para empresa ${companyId}`);
  try {
    const { rows: tickets } = await Ticket.findAndCountAll({
      where: { status: { [Op.in]: ["open", "pending"] }, companyId },
      order: [["updatedAt", "DESC"]]
    });

    if (tickets.length === 0) {
      console.log(`ℹ️ [AutoClose] No hay tickets para verificar en empresa ${companyId}`);
      return;
    }

    // ✅ AGRUPAR TICKETS POR WHATSAPP PARA EVITAR LOGS REPETITIVOS
    const whatsappGroups = new Map<number, any[]>();
    tickets.forEach(ticket => {
      if (ticket.whatsappId) {
        if (!whatsappGroups.has(ticket.whatsappId)) {
          whatsappGroups.set(ticket.whatsappId, []);
        }
        whatsappGroups.get(ticket.whatsappId)!.push(ticket);
      }
    });

    console.log(`🔍 [AutoClose] Verificando ${tickets.length} tickets para cierre por inactividad`);
    
    let ticketsProcessed = 0;
    let ticketsClosed = 0;

    // ✅ PROCESAR POR GRUPOS DE WHATSAPP
    for (const [whatsappId, whatsappTickets] of whatsappGroups) {
      try {
        const whatsapp = await Whatsapp.findByPk(whatsappId);
        
        if (!whatsapp) {
          console.log(`⚠️ [AutoClose] WhatsApp ${whatsappId} no encontrado`);
          continue;
        }

        const { expiresInactiveMessage, expiresTicket } = whatsapp;
        
        // ✅ MOSTRAR UN SOLO MENSAJE INFORMATIVO POR WHATSAPP
        if (expiresTicket && expiresTicket > 0) {
          console.log(`ℹ️ [AutoClose] WhatsApp ${whatsappId} está activo - ${whatsappTickets.length} tickets`);
        } else {
          console.log(`ℹ️ [AutoClose] WhatsApp ${whatsappId} sin configuración de cierre por inactividad`);
        }

        // ✅ PROCESAR TICKETS DE ESTE WHATSAPP
        for (const ticket of whatsappTickets) {
          try {
            const showTicket = await ShowTicketService(ticket.id, companyId);
            
            if (expiresTicket && expiresTicket > 0) {
              const expiresTicketMinutes = expiresTicket;
              const dataLimite = new Date();
              dataLimite.setMinutes(dataLimite.getMinutes() - expiresTicketMinutes);

              if ((showTicket.status === "open" || showTicket.status === "pending") && !showTicket.isGroup) {
                const dataUltimaInteracaoChamado = new Date(showTicket.updatedAt);

                if (dataUltimaInteracaoChamado < dataLimite) {
                  console.log(`🔒 [AutoClose] CERRANDO TICKET ${showTicket.id} POR INACTIVIDAD:`);
                  console.log(`  - Estado actual: ${showTicket.status}`);
                  console.log(`  - Última interacción: ${dataUltimaInteracaoChamado.toLocaleString()}`);
                  console.log(`  - Límite de inactividad: ${dataLimite.toLocaleString()}`);
                  console.log(`  - Tiempo de inactividad: ${expiresTicketMinutes} minutos`);

                  if (expiresInactiveMessage && expiresInactiveMessage.trim() !== "") {
                    console.log(`  - Mensaje de cierre: "${expiresInactiveMessage}"`);
                  }

                  await UpdateTicketService({
                    ticketData: { status: "closed" },
                    ticketId: showTicket.id,
                    companyId
                  });

                  ticketsClosed++;
                }
              }
            }
            ticketsProcessed++;
          } catch (error) {
            console.error(`❌ [AutoClose] Error procesando ticket ${ticket.id}:`, error);
          }
        }
      } catch (error) {
        console.error(`❌ [AutoClose] Error procesando WhatsApp ${whatsappId}:`, error);
      }
    }

    console.log(`✅ [AutoClose] Verificación completada para empresa ${companyId}:`);
    console.log(`  - Tickets procesados: ${ticketsProcessed}`);
    console.log(`  - Tickets cerrados: ${ticketsClosed}`);
  } catch (e: any) {
    console.error('❌ [AutoClose] Error en verificación de tickets automáticos:', e);
  }
};
