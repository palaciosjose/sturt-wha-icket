import { FindOptions } from "sequelize/types";
import Queue from "../../models/Queue";
import Whatsapp from "../../models/Whatsapp";

interface Request {
  companyId: number;
  session?: number | string;
}

const ListWhatsAppsService = async ({
  session,
  companyId
}: Request): Promise<Whatsapp[]> => {
  const options: FindOptions = {
    where: {
      companyId
    },
    include: [
      {
        model: Queue,
        as: "queues",
        attributes: ["id", "name", "color", "greetingMessage"]
      }
    ],
    attributes: [
      "id", "name", "session", "qrcode", "status", "battery", 
      "plugged", "retries", "greetingMessage", "farewellMessage", 
      "complationMessage", "outOfHoursMessage", "ratingMessage", 
      "provider", "isDefault", "createdAt", "updatedAt", 
      "companyId", "token", "transferQueueId", "timeToTransfer", 
      "promptId", "integrationId", "maxUseBotQueues", "timeUseBotQueues", 
      "expiresTicket", "number", "waName", "expiresInactiveMessage",
      "avatar", "instance"
    ]
  };

  if (session !== undefined && session == 0) {
    options.attributes = { exclude: ["session"] };
  }

  const whatsapps = await Whatsapp.findAll(options);

  return whatsapps;
};

export default ListWhatsAppsService;
