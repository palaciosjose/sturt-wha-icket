import Tag from "../../models/Tag";
import AppError from "../../errors/AppError";
import { getIO } from "../../libs/socket";

const DeleteService = async (id: string | number): Promise<void> => {
  const tag = await Tag.findOne({
    where: { id }
  });

  if (!tag) {
    throw new AppError("ERR_NO_TAG_FOUND", 404);
  }

  // ✅ EMITIR EVENTO DE SOCKET PARA ELIMINACIÓN DE ETIQUETA
  const io = getIO();
  io.to(`company-${tag.companyId}-mainchannel`).emit(`company-${tag.companyId}-tag`, {
    action: "delete",
    tagId: tag.id
  });

  await tag.destroy();
};

export default DeleteService;
