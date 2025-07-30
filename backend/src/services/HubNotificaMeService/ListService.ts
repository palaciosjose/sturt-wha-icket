import { Op } from "sequelize";
import HubNotificaMe from "../../models/HubNotificaMe";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  companyId: number;
}

interface Response {
  records: HubNotificaMe[];
  count: number;
  hasMore: boolean;
}

const ListService = async ({
  searchParam = "",
  pageNumber = "1",
  companyId
}: Request): Promise<Response> => {
  const whereCondition = {
    [Op.or]: [
      {
        nome: {
          [Op.like]: `%${searchParam}%`
        }
      },
      {
        token: {
          [Op.like]: `%${searchParam}%`
        }
      },
      {
        tipo: {
          [Op.like]: `%${searchParam}%`
        }
      }
    ],
    companyId
  };

  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: records } = await HubNotificaMe.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const hasMore = count > offset + records.length;

  return {
    records,
    count,
    hasMore
  };
};

export default ListService; 