import AppError from "../../errors/AppError";
import HubNotificaMe from "../../models/HubNotificaMe";

const ShowService = async (id: string): Promise<HubNotificaMe> => {
  const record = await HubNotificaMe.findByPk(id);

  if (!record) {
    throw new AppError("ERR_NO_HUBNOTIFICAME_FOUND", 404);
  }

  return record;
};

export default ShowService; 