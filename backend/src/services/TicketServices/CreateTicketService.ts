import AppError from "../../errors/AppError";
import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import Ticket from "../../models/Ticket";
import ShowContactService from "../ContactServices/ShowContactService";
import { getIO } from "../../libs/socket";
import GetDefaultWhatsAppByUser from "../../helpers/GetDefaultWhatsAppByUser";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";

interface Request {
  contactId: number;
  status: string;
  userId: number;
  companyId: number;
  queueId?: number;
  whatsappId?: string;
  channel?: string;
}

const CreateTicketService = async ({
  contactId,
  status,
  userId,
  queueId,
  companyId,
  whatsappId,
  channel = "whatsapp"
}: Request): Promise<Ticket> => {
  let whatsapp;

  if (whatsappId !== undefined && whatsappId !== null && whatsappId !==  "") {
    whatsapp = await ShowWhatsAppService(whatsappId, companyId)
  }
  
  let defaultWhatsapp = await GetDefaultWhatsAppByUser(userId);

  if (whatsapp) {
    defaultWhatsapp = whatsapp;
  }
  if (!defaultWhatsapp)
    defaultWhatsapp = await GetDefaultWhatsApp(companyId);

  await CheckContactOpenTickets(contactId, whatsappId, channel);

  const { isGroup } = await ShowContactService(contactId, companyId);

  const [{ id }] = await Ticket.findOrCreate({
    where: {
      contactId,
      companyId,
      whatsappId
    },
    defaults: {
      contactId,
      companyId,
      whatsappId: whatsappId || (defaultWhatsapp ? defaultWhatsapp.id : null), // ✅ Permitir null para NotificaMe
      status,
      isGroup,
      userId,
      channel
    }
  });

  await Ticket.update(
    { companyId, queueId, userId, whatsappId: whatsappId || (defaultWhatsapp ? defaultWhatsapp.id : null), status, channel },
    { where: { id } }
  );

  const ticket = await Ticket.findByPk(id, { include: ["contact", "queue"] });

  if (!ticket) {
    throw new AppError("ERR_CREATING_TICKET");
  }

  const io = getIO();

  io.to(ticket.id.toString()).emit("ticket", {
    action: "update",
    ticket
  });

  return ticket;
};

export default CreateTicketService;
