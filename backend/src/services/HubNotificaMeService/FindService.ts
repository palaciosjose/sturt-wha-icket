import HubNotificaMe from "../../models/HubNotificaMe";

interface Request {
  companyId: string;
}

const FindService = async ({ companyId }: Request): Promise<HubNotificaMe[]> => {
  const records: HubNotificaMe[] = await HubNotificaMe.findAll({
    where: {
      companyId
    },
    order: [["createdAt", "DESC"]]
  });

  return records;
};

export default FindService; 