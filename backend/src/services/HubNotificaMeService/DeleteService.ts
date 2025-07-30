import AppError from "../../errors/AppError";
import HubNotificaMe from "../../models/HubNotificaMe";

const DeleteService = async (id: string): Promise<void> => {
  const record = await HubNotificaMe.findByPk(id);

  if (!record) {
    throw new AppError("ERR_NO_HUBNOTIFICAME_FOUND", 404);
  }

  await record.destroy();
};

export default DeleteService; 