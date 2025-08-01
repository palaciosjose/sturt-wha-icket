import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import { getIO } from "../../libs/socket";

const DeleteWhatsAppService = async (id: string): Promise<void> => {
  const whatsapp = await Whatsapp.findOne({
    where: { id }
  });

  if (!whatsapp) {
    throw new AppError("ERR_NO_WAPP_FOUND", 404);
  }

  // ✅ EMITIR EVENTO DE SOCKET PARA ELIMINACIÓN DE WHATSAPP
  const io = getIO();
  io.to(`company-${whatsapp.companyId}-mainchannel`).emit(`company-${whatsapp.companyId}-whatsapp`, {
    action: "delete",
    whatsappId: whatsapp.id
  });

  await whatsapp.destroy();
};

export default DeleteWhatsAppService;
