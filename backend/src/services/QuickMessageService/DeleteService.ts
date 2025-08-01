import QuickMessage from "../../models/QuickMessage";
import AppError from "../../errors/AppError";
import { getIO } from "../../libs/socket";

const DeleteService = async (id: string): Promise<void> => {
  const record = await QuickMessage.findOne({
    where: { id }
  });

  if (!record) {
    throw new AppError("ERR_NO_QUICKMESSAGE_FOUND", 404);
  }

  // ✅ EMITIR EVENTO DE SOCKET PARA ELIMINACIÓN DE RESPUESTA RÁPIDA
  const io = getIO();
  io.to(`company-${record.companyId}-mainchannel`).emit(`company-${record.companyId}-quickMessage`, {
    action: "delete",
    quickMessageId: record.id
  });

  await record.destroy();
};

export default DeleteService;
