import { Sequelize, Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  companyId: number;
}

interface Response {
  contacts: Contact[];
  count: number;
  hasMore: boolean;
}

const ListContactsService = async ({
  searchParam = "",
  pageNumber = "1",
  companyId
}: Request): Promise<Response> => {
  const whereCondition = {
    [Op.and]: [
      {
        [Op.or]: [
          {
            name: Sequelize.where(
              Sequelize.fn("LOWER", Sequelize.col("name")),
              "LIKE",
              `%${searchParam.toLowerCase().trim()}%`
            )
          },
          { number: { [Op.like]: `%${searchParam.toLowerCase().trim()}%` } }
        ]
      },
      {
        companyId: {
          [Op.eq]: companyId
        }
      },
      {
        // ✅ FILTRO: Excluir grupos de WhatsApp (con sufijo @g.us)
        number: {
          [Op.notLike]: '%@g.us%'
        }
      }
    ]
  };

  // 🔍 DEBUG: Ver qué se está enviando a la base de datos
  console.log("🔍 ListContactsService - DEBUG:");
  console.log("📍 companyId:", companyId);
  console.log("📍 searchParam:", searchParam);
  console.log("📍 whereCondition:", JSON.stringify(whereCondition, null, 2));
  const limit = 30;
  const offset = limit * (+pageNumber - 1);

  // 🔍 DEBUG: Ver la consulta SQL que se ejecuta
  console.log("🔍 ListContactsService - Ejecutando consulta...");
  
  const { count, rows: contacts } = await Contact.findAndCountAll({
    where: whereCondition,
    limit,
    include: [
      {
        model: Ticket,
        as: "tickets",
        attributes: ["id", "status", "createdAt", "updatedAt"]
      }
    ],
    offset,
    order: [["name", "ASC"]]
  });

  // 🔍 DEBUG: Ver los resultados
  console.log("🔍 ListContactsService - Resultados:");
  console.log("📍 Total encontrado:", count);
  console.log("📍 Contactos retornados:", contacts.length);
  console.log("📍 Primeros 3 contactos:", contacts.slice(0, 3).map(c => ({ id: c.id, name: c.name, number: c.number })));

  const hasMore = count > offset + contacts.length;

  return {
    contacts,
    count,
    hasMore
  };
};

export default ListContactsService;
