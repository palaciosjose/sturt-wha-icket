import AppError from "../../errors/AppError";
import QuickMessage from "../../models/QuickMessage";
import { getIO } from "../../libs/socket";

interface Data {
  shortcode: string;
  message: string;
  userId: number | string;
  id?: number | string;
  geral?: boolean;
}

const UpdateService = async (data: Data): Promise<QuickMessage> => {
  const { id, shortcode, message, userId, geral } = data;

  const record = await QuickMessage.findByPk(id);

  if (!record) {
    throw new AppError("ERR_NO_TICKETNOTE_FOUND", 404);
  }

  await record.update({
    shortcode,
    message,
    userId,
	geral
  });

  // ✅ EMITIR EVENTO DE SOCKET PARA ACTUALIZACIÓN DE RESPUESTA RÁPIDA
  const io = getIO();
  io.to(`company-${record.companyId}-mainchannel`).emit(`company-${record.companyId}-quickMessage`, {
    action: "update",
    quickMessage: record
  });

  return record;
};

export default UpdateService;
