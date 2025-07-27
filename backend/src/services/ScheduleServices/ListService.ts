import { Op, Sequelize } from "sequelize";
import Contact from "../../models/Contact";
import Schedule from "../../models/Schedule";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";

interface Request {
  searchParam?: string;
  contactId?: number | string;
  userId?: number | string;
  companyId?: number;
  pageNumber?: string | number;
}

interface Response {
  schedules: Schedule[];
  count: number;
  hasMore: boolean;
}

const ListService = async ({
  searchParam,
  contactId = "",
  userId = "",
  pageNumber = "1",
  companyId
}: Request): Promise<Response> => {
  let whereCondition = {};
  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  if (searchParam) {
    whereCondition = {
      [Op.or]: [
        {
          "$Schedule.body$": Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("Schedule.body")),
            "LIKE",
            `%${searchParam.toLowerCase()}%`
          )
        },
        {
          "$Contact.name$": Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("contact.name")),
            "LIKE",
            `%${searchParam.toLowerCase()}%`
          )
        },
      ],
    }
  }

  if (contactId !== "") {
    whereCondition = {
      ...whereCondition,
      contactId
    }
  }

  if (userId !== "") {
    whereCondition = {
      ...whereCondition,
      userId
    }
  }

  whereCondition = {
    ...whereCondition,
    companyId: {
      [Op.eq]: companyId
    },
    // Ocultar recordatorios del sistema de recordatorios del calendario
    [Op.or]: [
      { isReminderSystem: { [Op.ne]: true } },
      { reminderType: { [Op.ne]: 'reminder' } },
      { isReminderSystem: null }
    ]
  }

  const { count, rows: schedules } = await Schedule.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    include: [
      { model: Contact, as: "contact", attributes: ["id", "name"] },
      { model: User, as: "user", attributes: ["id", "name"] },
      { model: Whatsapp, as: "whatsapp", attributes: ["id", "name"] },
    ]
  });

  const hasMore = count > offset + schedules.length;

  return {
    schedules,
    count,
    hasMore
  };
};

export default ListService;
