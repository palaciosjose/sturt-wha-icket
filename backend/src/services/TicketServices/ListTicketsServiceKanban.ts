import { Op, fn, where, col, Filterable, Includeable } from "sequelize";
import { startOfDay, endOfDay, parseISO } from "date-fns";

import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import User from "../../models/User";
import ShowUserService from "../UserServices/ShowUserService";
import Tag from "../../models/Tag";
import TicketTag from "../../models/TicketTag";
import { intersection } from "lodash";
import Whatsapp from "../../models/Whatsapp";
import Sequelize from "sequelize";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  status?: string;
  date?: string;
  updatedAt?: string;
  showAll?: string;
  userId: string;
  withUnreadMessages?: string;
  queueIds: number[];
  tags: number[];
  users: number[];
  companyId: number;
}

interface Response {
  tickets: Ticket[];
  count: number;
  hasMore: boolean;
}

const ListTicketsServiceKanban = async ({
  searchParam = "",
  pageNumber = "1",
  queueIds,
  tags,
  users,
  status,
  date,
  updatedAt,
  showAll,
  userId,
  withUnreadMessages,
  companyId
}: Request): Promise<Response> => {
  let whereCondition: Filterable["where"] = {
    [Op.or]: [{ userId }, { status: "pending" }],
    queueId: { [Op.or]: [queueIds, null] }
  };
  let includeCondition: Includeable[];

  includeCondition = [
    {
      model: Contact,
      as: "contact",
      attributes: ["id", "name", "number", "email", "profilePicUrl", "isGroup"]
    },
    {
      model: Queue,
      as: "queue",
      attributes: ["id", "name", "color"]
    },
    {
      model: User,
      as: "user",
      attributes: ["id", "name"]
    },
    {
      model: Tag,
      as: "tags",
      attributes: ["id", "name", "color"],
      through: { attributes: [] }, // ✅ FORZAR CARGA DE RELACIÓN MANY-TO-MANY
      required: false, // ✅ NO REQUERIR QUE TENGAN ETIQUETAS
      separate: false // ✅ NO SEPARAR LA CONSULTA
    },
    {
      model: Whatsapp,
      as: "whatsapp",
      attributes: ["name"]
    },
  ];

  if (showAll === "true") {
    whereCondition = { queueId: { [Op.or]: [queueIds, null] } };
  }

  whereCondition = {
    ...whereCondition,
    status: { [Op.or]: ["pending", "open"] }
  };

  // ✅ FILTRAR SOLO CONTACTOS INDIVIDUALES (NO GRUPOS DE WHATSAPP)
  // Kanban está diseñado exclusivamente para contactos directos
  whereCondition = {
    ...whereCondition,
    "$contact.isGroup$": false
  };

  if (searchParam) {
    const sanitizedSearchParam = searchParam.toLocaleLowerCase().trim();

    includeCondition = [
      ...includeCondition,
      {
        model: Message,
        as: "messages",
        attributes: ["id", "body"],
        where: {
          body: where(
            fn("LOWER", col("body")),
            "LIKE",
            `%${sanitizedSearchParam}%`
          )
        },
        required: false,
        duplicating: false
      }
    ];

    whereCondition = {
      ...whereCondition,
      [Op.or]: [
        {
          "$contact.name$": where(
            fn("LOWER", col("contact.name")),
            "LIKE",
            `%${sanitizedSearchParam}%`
          )
        },
        { "$contact.number$": { [Op.like]: `%${sanitizedSearchParam}%` } },
        {
          "$message.body$": where(
            fn("LOWER", col("body")),
            "LIKE",
            `%${sanitizedSearchParam}%`
          )
        }
      ]
    };
  }

  if (date) {
    whereCondition = {
      createdAt: {
        [Op.between]: [+startOfDay(parseISO(date)), +endOfDay(parseISO(date))]
      }
    };
  }

  if (updatedAt) {
    whereCondition = {
      updatedAt: {
        [Op.between]: [
          +startOfDay(parseISO(updatedAt)),
          +endOfDay(parseISO(updatedAt))
        ]
      }
    };
  }

  if (withUnreadMessages === "true") {
    const user = await ShowUserService(userId);
    const userQueueIds = user.queues.map(queue => queue.id);

    whereCondition = {
      [Op.or]: [{ userId }, { status: "pending" }],
      queueId: { [Op.or]: [userQueueIds, null] },
      unreadMessages: { [Op.gt]: 0 }
    };
  }

  if (Array.isArray(tags) && tags.length > 0) {
    const ticketsTagFilter: any[] | null = [];
    for (let tag of tags) {
      const ticketTags = await TicketTag.findAll({
        where: { tagId: tag }
      });
      if (ticketTags) {
        ticketsTagFilter.push(ticketTags.map(t => t.ticketId));
      }
    }

    const ticketsIntersection: number[] = intersection(...ticketsTagFilter);

    whereCondition = {
      ...whereCondition,
      id: {
        [Op.in]: ticketsIntersection
      }
    };
  }

  if (Array.isArray(users) && users.length > 0) {
    const ticketsUserFilter: any[] | null = [];
    for (let user of users) {
      const ticketUsers = await Ticket.findAll({
        where: { userId: user }
      });
      if (ticketUsers) {
        ticketsUserFilter.push(ticketUsers.map(t => t.id));
      }
    }

    const ticketsIntersection: number[] = intersection(...ticketsUserFilter);

    whereCondition = {
      ...whereCondition,
      id: {
        [Op.in]: ticketsIntersection
      }
    };
  }

  const limit = 40;
  const offset = limit * (+pageNumber - 1);

  whereCondition = {
    ...whereCondition,
    companyId
  };

  // ✅ SOLUCIÓN: Cambiar orden para primera página balanceada
  let orderClause;
  
  if (+pageNumber === 1) {
    // ✅ Primera página: Ordenar por prioridad (tickets con etiquetas kanban primero)
    console.log(`🔄 [Kanban] Primera página - Aplicando orden por prioridad`);
    
    try {
      console.log(`🔄 [Kanban] Ejecutando consulta separada para tickets con etiquetas kanban...`);
      
      // 1. Obtener IDs de tickets con etiquetas kanban primero
      const ticketIdsConEtiquetas = await TicketTag.findAll({
        attributes: ['ticketId'],
        include: [{
          model: Tag,
          as: 'tag',
          where: { kanban: 1, companyId: companyId },
          attributes: []
        }],
        raw: true
      });
      
      const idsConEtiquetas = ticketIdsConEtiquetas.map(t => t.ticketId);
      console.log(`🔄 [Kanban] IDs de tickets con etiquetas kanban: ${idsConEtiquetas.length}`);
      
      // 2. Obtener tickets con etiquetas kanban (prioridad alta)
      // ✅ IMPORTANTE: NO aplicar filtros de status para tickets con etiquetas kanban
      const whereConditionSinStatus = { ...whereCondition };
      delete whereConditionSinStatus.status; // Remover filtro de status
      
      const ticketsConEtiquetas = await Ticket.findAndCountAll({
        where: {
          ...whereConditionSinStatus,
          id: { [Op.in]: idsConEtiquetas }
        },
        include: includeCondition,
        distinct: true,
        limit: 20, // Solo 20 para no saturar
        order: [["updatedAt", "DESC"]],
        subQuery: false
      });
      
      console.log(`🔄 [Kanban] Tickets con etiquetas encontrados: ${ticketsConEtiquetas.rows.length}`);
      
      // 3. Obtener tickets sin etiquetas (prioridad baja)
      const ticketsSinEtiquetas = await Ticket.findAndCountAll({
        where: {
          ...whereCondition,
          id: { [Op.notIn]: idsConEtiquetas }
        },
        include: includeCondition,
        distinct: true,
        limit: 20, // Solo 20 para no saturar
        order: [["updatedAt", "DESC"]],
        subQuery: false
      });
      
      console.log(`🔄 [Kanban] Tickets sin etiquetas encontrados: ${ticketsSinEtiquetas.rows.length}`);
      
      // 4. Combinar resultados: tickets con etiquetas PRIMERO + tickets sin etiquetas
      const todosLosTickets = [...ticketsConEtiquetas.rows, ...ticketsSinEtiquetas.rows];
      
      // 5. Eliminar duplicados por ID
      const ticketsUnicos = todosLosTickets.filter((ticket, index, self) => 
        index === self.findIndex(t => t.id === ticket.id)
      );
      
      console.log(`🔄 [Kanban] Resultado final combinado: ${ticketsUnicos.length} tickets únicos`);
      
      // 6. Aplicar limit solo al resultado final
      const limit = 40;
      const hasMore = ticketsUnicos.length > limit;
      
      return {
        tickets: ticketsUnicos.slice(0, limit),
        count: ticketsUnicos.length,
        hasMore
      };
      
    } catch (error) {
      console.error("❌ [Kanban] Error en consulta separada:", error);
      // Si falla, usar orden cronológico normal
      console.log(`🔄 [Kanban] Fallback a orden cronológico normal`);
      orderClause = [["updatedAt", "DESC"]];
    }
  } else {
    // ✅ Páginas siguientes: Orden cronológico normal
    orderClause = [["updatedAt", "DESC"]];
  }

  const { count, rows: tickets } = await Ticket.findAndCountAll({
    where: whereCondition,
    include: includeCondition,
    distinct: true,
    limit,
    offset,
    order: orderClause,
    subQuery: false
  });
  
  console.log(`🔄 [Kanban] Consulta final ejecutada - tickets encontrados: ${tickets.length}`);
  
  const hasMore = count > offset + tickets.length;

  return {
    tickets,
    count,
    hasMore
  };
};

export default ListTicketsServiceKanban;