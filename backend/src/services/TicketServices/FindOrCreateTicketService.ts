import { subHours } from "date-fns";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Queue from "../../models/Queue";
import Prompt from "../../models/Prompt";
import ShowTicketService from "./ShowTicketService";
import FindOrCreateATicketTrakingService from "./FindOrCreateATicketTrakingService";
import Setting from "../../models/Setting";
import Whatsapp from "../../models/Whatsapp";
import { getIO } from "../../libs/socket";

interface TicketData {
  status?: string;
  companyId?: number;
  unreadMessages?: number;
}

const FindOrCreateTicketService = async (
  contact: Contact,
  whatsappId: number,
  unreadMessages: number,
  companyId: number,
  groupContact?: Contact
): Promise<Ticket> => {
  // 🔧 MEJORAR: Buscar primero por contacto sin filtrar por whatsappId
  // Esto evita crear tickets duplicados para el mismo contacto
  let ticket = await Ticket.findOne({
    where: {
      status: {
        [Op.or]: ["open", "pending"]  // ✅ Solo tickets activos (no cerrados)
      },
      contactId: groupContact ? groupContact.id : contact.id,
      companyId
      // ✅ Removido whatsappId para permitir encontrar tickets existentes
    },
    include: [
      { model: Queue, as: 'queue', include: [{ model: Prompt, as: 'prompt' }] }
    ],
    order: [["updatedAt", "DESC"]]  // ✅ Ordenar por última actividad
  });

  if (ticket) {
    const updateData: Partial<TicketData & { whatsappId?: number | null }> = {
      unreadMessages
    };
    if (whatsappId && whatsappId > 0) {
      updateData.whatsappId = whatsappId;
    }
    await ticket.update(updateData as any);
  }
  
  if (ticket?.status === "closed") {
    await ticket.update({ queueId: null, userId: null });
  }

  if (!ticket && groupContact) {
    ticket = await Ticket.findOne({
      where: {
        contactId: groupContact.id
      },
      include: [
        { model: Queue, as: 'queue', include: [{ model: Prompt, as: 'prompt' }] }
      ],
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages,
        queueId: null,
        companyId
      });
      await FindOrCreateATicketTrakingService({
        ticketId: ticket.id,
        companyId,
        whatsappId: ticket.whatsappId || null, // ✅ Permitir null para NotificaMe
        userId: ticket.userId
      });
    }
    const msgIsGroupBlock = await Setting.findOne({
      where: { key: "timeCreateNewTicket" }
    });
  
    const value = msgIsGroupBlock ? parseInt(msgIsGroupBlock.value, 10) : 7200;
  }

  if (!ticket && !groupContact) {
    ticket = await Ticket.findOne({
      where: {
        updatedAt: {
          [Op.between]: [+subHours(new Date(), 2), +new Date()]
        },
        contactId: contact.id
      },
      include: [
        { model: Queue, as: 'queue', include: [{ model: Prompt, as: 'prompt' }] }
      ],
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages,
        queueId: null,
        companyId
      });
      await FindOrCreateATicketTrakingService({
        ticketId: ticket.id,
        companyId,
        whatsappId: whatsappId || null, // ✅ Permitir null para NotificaMe
        userId: ticket.userId
      });
    }
  }
  
  const whatsapp = whatsappId && whatsappId > 0
    ? await Whatsapp.findOne({ where: { id: whatsappId } })
    : null;

  // ✅ ACTUALIZAR TICKET EXISTENTE CON PROMPTID Y QUEUEID SI NO LOS TIENE
  if (ticket && whatsapp && (!ticket.promptId || !ticket.queueId)) {
    console.log("🔍 ACTUALIZANDO TICKET EXISTENTE - PromptId actual:", ticket.promptId, "QueueId actual:", ticket.queueId);
    
    const updateData: any = {};
    
    if (whatsapp.promptId && !ticket.promptId) {
      updateData.promptId = whatsapp.promptId;
      console.log("✅ ACTUALIZANDO PROMPTID DEL TICKET:", whatsapp.promptId);
    }
    
    if (whatsapp.queues && whatsapp.queues.length > 0 && !ticket.queueId) {
      updateData.queueId = whatsapp.queues[0].id;
      console.log("✅ ACTUALIZANDO QUEUEID DEL TICKET:", whatsapp.queues[0].id);
    }
    
    if (updateData.promptId) {
      updateData.useIntegration = true;
      console.log("✅ ACTIVANDO INTEGRACIÓN DEL TICKET");
    }
    
    if (Object.keys(updateData).length > 0) {
      await ticket.update(updateData);
      console.log("✅ TICKET ACTUALIZADO CON CONFIGURACIÓN DE WHATSAPP");
    }
  }

  let wasCreated = false;

  if (!ticket) {
    // ✅ OBTENER CONFIGURACIÓN DEL WHATSAPP PARA ASIGNAR PROMPTID
    let promptId = null;
    let queueId = null;
    
    if (whatsapp) {
      console.log("🔍 CONFIGURACIÓN WHATSAPP - ID:", whatsapp.id);
      console.log("🔍 CONFIGURACIÓN WHATSAPP - PromptId:", whatsapp.promptId);
      console.log("🔍 CONFIGURACIÓN WHATSAPP - Queues:", whatsapp.queues ? whatsapp.queues.map(q => q.id) : []);
      
      // ✅ ASIGNAR PROMPTID SI ESTÁ CONFIGURADO
      if (whatsapp.promptId) {
        promptId = whatsapp.promptId;
        console.log("✅ ASIGNANDO PROMPTID AL TICKET:", promptId);
      }
      
      // ✅ ASIGNAR PRIMER DEPARTAMENTO SI ESTÁ CONFIGURADO
      if (whatsapp.queues && whatsapp.queues.length > 0) {
        queueId = whatsapp.queues[0].id;
        console.log("✅ ASIGNANDO QUEUEID AL TICKET:", queueId);
      }
    }
    
    ticket = await Ticket.create({
      contactId: groupContact ? groupContact.id : contact.id,
      status: "pending",
      isGroup: !!groupContact,
      unreadMessages,
      whatsappId: whatsapp ? whatsapp.id : null,
      whatsapp: whatsapp || undefined,
      companyId,
      promptId, // ✅ ASIGNAR PROMPTID DEL WHATSAPP
      queueId,  // ✅ ASIGNAR QUEUEID DEL WHATSAPP
      useIntegration: !!promptId // ✅ ACTIVAR INTEGRACIÓN SI HAY PROMPT
    });
    await FindOrCreateATicketTrakingService({
      ticketId: ticket.id,
      companyId,
      whatsappId,
      userId: ticket.userId
    });
    wasCreated = true;
  }

  ticket = await ShowTicketService(ticket.id, companyId);

  // Emitir evento 'create' si el ticket fue creado en esta llamada
  if (wasCreated) {
    const io = getIO();
    io.to(`company-${ticket.companyId}-pending`).emit(`company-${ticket.companyId}-ticket`, {
      action: "create",
      ticket,
      ticketId: ticket.id,
    });
  }

  return ticket;
};

export default FindOrCreateTicketService;
