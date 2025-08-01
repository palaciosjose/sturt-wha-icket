import * as Yup from "yup";

import AppError from "../../errors/AppError";
import Tag from "../../models/Tag";
import ShowService from "./ShowService";
import { getIO } from "../../libs/socket";

interface TagData {
  id?: number;
  name?: string;
  color?: string;
  kanban?: number;
}

interface Request {
  tagData: TagData;
  id: string | number;
}

const UpdateUserService = async ({
  tagData,
  id
}: Request): Promise<Tag | undefined> => {
  const tag = await ShowService(id);

  const schema = Yup.object().shape({
    name: Yup.string().min(3)
  });

  const { name, color, kanban } = tagData;

  try {
    await schema.validate({ name });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  await tag.update({
    name,
    color,
    kanban
  });

  await tag.reload();

  // ✅ EMITIR EVENTO DE SOCKET PARA ACTUALIZACIÓN DE ETIQUETA
  const io = getIO();
  io.to(`company-${tag.companyId}-mainchannel`).emit(`company-${tag.companyId}-tag`, {
    action: "update",
    tag
  });

  return tag;
};

export default UpdateUserService;
