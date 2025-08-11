import { Op } from "sequelize";
import AppError from "../errors/AppError";
import Ticket from "../models/Ticket";

const CheckContactOpenTickets = async (contactId: number, whatsappId?: string | null): Promise<void> => {
  let ticket;

  // ✅ Si whatsappId es null/undefined, filtrar explícitamente por whatsappId: null (caso NotificaMe)
  if (whatsappId === null || whatsappId === undefined || whatsappId === "") {
    ticket = await Ticket.findOne({
      where: {
        contactId,
        status: { [Op.or]: ["open", "pending"] },
        whatsappId: null
      }
    });
  } else {
    ticket = await Ticket.findOne({
      where: {
        contactId,
        status: { [Op.or]: ["open", "pending"] },
        whatsappId
      }
    });
  }

  if (ticket) {
    throw new AppError("ERR_OTHER_OPEN_TICKET");
  }
};

export default CheckContactOpenTickets;
