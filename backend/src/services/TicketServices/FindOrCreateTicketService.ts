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
        whatsappId: ticket.whatsappId,
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
        whatsappId: ticket.whatsappId,
        userId: ticket.userId
      });
    }
  }
  
  const whatsapp = whatsappId && whatsappId > 0
    ? await Whatsapp.findOne({ where: { id: whatsappId } })
    : null;

  let wasCreated = false;

  if (!ticket) {
    ticket = await Ticket.create({
      contactId: groupContact ? groupContact.id : contact.id,
      status: "pending",
      isGroup: !!groupContact,
      unreadMessages,
      whatsappId: whatsapp ? whatsapp.id : null,
      whatsapp: whatsapp || undefined,
      companyId
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
