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
      attributes: ["id", "name", "color"]
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

  // ✅ CORRECCIÓN CRÍTICA: INCLUIR TICKETS CON ETIQUETAS KANBAN ACTIVAS
  // Cuando se llama desde el Kanban, incluir automáticamente tickets con etiquetas kanban
  let ticketIdsConEtiquetasKanban: number[] = [];
  
  if (!Array.isArray(tags) || tags.length === 0) {
    try {
      console.log("🔄 [Kanban] Iniciando corrección para incluir tickets con etiquetas kanban...");
      
      // Obtener todas las etiquetas kanban activas para esta empresa
      const etiquetasKanban = await Tag.findAll({
        where: {
          kanban: 1,
          companyId: companyId
        },
        attributes: ['id', 'name'],
        raw: true
      });

      console.log(`🔄 [Kanban] Etiquetas kanban encontradas: ${etiquetasKanban.length}`, 
        etiquetasKanban.map(tag => `${tag.name} (ID: ${tag.id})`));

      if (etiquetasKanban.length > 0) {
        const tagIds = etiquetasKanban.map(tag => tag.id);
        
        // Obtener todos los tickets que tienen estas etiquetas kanban
        const ticketsConEtiquetasKanban = await TicketTag.findAll({
          where: {
            tagId: { [Op.in]: tagIds }
          },
          attributes: ['ticketId'],
          raw: true
        });

        console.log(`🔄 [Kanban] Tickets con etiquetas kanban encontrados: ${ticketsConEtiquetasKanban.length}`);

        if (ticketsConEtiquetasKanban.length > 0) {
          ticketIdsConEtiquetasKanban = ticketsConEtiquetasKanban.map(tt => tt.ticketId);
          
          console.log(`🔄 [Kanban] Modificando consulta para incluir ${ticketIdsConEtiquetasKanban.length} tickets con etiquetas kanban`);
          console.log(`🔄 [Kanban] Consulta modificada - tickets a incluir:`, ticketIdsConEtiquetasKanban.slice(0, 5));
        }
      }
    } catch (error) {
      console.error("❌ [Kanban] Error obteniendo etiquetas kanban:", error);
      // Si hay error, continuar con la lógica original
    }
  }

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

  // ✅ CORRECCIÓN FINAL: INCLUIR TICKETS CON ETIQUETAS KANBAN
  // Si tenemos tickets con etiquetas kanban, modificar la consulta para incluirlos
  if (ticketIdsConEtiquetasKanban.length > 0) {
    console.log(`🔄 [Kanban] Aplicando corrección final - incluyendo ${ticketIdsConEtiquetasKanban.length} tickets con etiquetas kanban`);
    
    // ✅ CORRECCIÓN AGRESIVA: FORZAR INCLUSIÓN DE TODOS LOS TICKETS KANBAN
    // En lugar de usar Op.or complejo, vamos a hacer una consulta separada y combinar resultados
    
    try {
      console.log(`🔄 [Kanban] Ejecutando consulta separada para tickets con etiquetas kanban...`);
      
      // Hacer una consulta separada para tickets con etiquetas kanban (SIN LIMIT)
      const ticketsKanban = await Ticket.findAndCountAll({
        where: {
          id: { [Op.in]: ticketIdsConEtiquetasKanban },
          companyId: companyId,
          status: { [Op.or]: ["pending", "open"] }
        },
        include: includeCondition,
        distinct: true,
        order: [["updatedAt", "DESC"]],
        subQuery: false
      });
      
      console.log(`🔄 [Kanban] Consulta separada - tickets kanban encontrados: ${ticketsKanban.rows.length}`);
      
      // Hacer la consulta original para tickets sin etiquetas kanban (SIN LIMIT)
      const ticketsOriginales = await Ticket.findAndCountAll({
        where: whereCondition,
        include: includeCondition,
        distinct: true,
        order: [["updatedAt", "DESC"]],
        subQuery: false
      });
      
      console.log(`🔄 [Kanban] Consulta original - tickets encontrados: ${ticketsOriginales.rows.length}`);
      
      // Combinar resultados: tickets originales + tickets kanban
      const todosLosTickets = [...ticketsOriginales.rows, ...ticketsKanban.rows];
      
      // Eliminar duplicados por ID
      const ticketsUnicos = todosLosTickets.filter((ticket, index, self) => 
        index === self.findIndex(t => t.id === ticket.id)
      );
      
      console.log(`🔄 [Kanban] Resultado final combinado: ${ticketsUnicos.length} tickets únicos`);
      console.log(`🔄 [Kanban] Tickets por etiqueta:`, ticketsUnicos.map(t => ({
        id: t.id,
        tags: t.tags?.map(tag => tag.name) || []
      })).slice(0, 10));
      
      // Aplicar limit solo al resultado final
      const limit = 40;
      const offset = limit * (+pageNumber - 1);
      const hasMore = ticketsUnicos.length > offset + limit;
      
      return {
        tickets: ticketsUnicos.slice(offset, offset + limit),
        count: ticketsUnicos.length,
        hasMore
      };
      
    } catch (error) {
      console.error("❌ [Kanban] Error en consulta separada:", error);
      // Si falla, continuar con la lógica original
    }
  }

  const { count, rows: tickets } = await Ticket.findAndCountAll({
    where: whereCondition,
    include: includeCondition,
    distinct: true,
    limit,
    offset,
    order: [["updatedAt", "DESC"]],
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