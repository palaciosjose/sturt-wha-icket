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

  // ✅ CONSTRUIR WHERE CONDITION PARA KANBAN
  // ✅ CORREGIDO: Simplificar filtros para evitar restricciones excesivas
  // ✅ NUEVO: Remover filtro de status para mostrar tickets abiertos Y cerrados
  whereCondition = {
    companyId: companyId
    // ✅ REMOVIDO: Filtro de status para mostrar todos los tickets (abiertos + cerrados)
    // status: { [Op.or]: ["pending", "open"] }
    // ✅ REMOVIDO: Filtros restrictivos de userId y queueId que causaban 0 resultados
    // [Op.or]: [{ userId: userId }, { status: "pending" }],
    // queueId: { [Op.or]: [[], null] }
  };

  // ✅ FILTRAR SOLO CONTACTOS INDIVIDUALES (NO GRUPOS DE WHATSAPP)
  // Kanban está diseñado exclusivamente para contactos directos
  // ✅ CORREGIDO: Remover filtro problemático y usar aproximación más simple
  // whereCondition = {
  //   ...whereCondition,
  //   "$Contact.isGroup$": false
  // };

  // ✅ NUEVA APROXIMACIÓN: Filtrar después de obtener los tickets
  // Esto evita problemas de sintaxis con Sequelize

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
          "$Contact.name$": where(
            fn("LOWER", col("Contact.name")),
            "LIKE",
            `%${sanitizedSearchParam}%`
          )
        },
        { "$Contact.number$": { [Op.like]: `%${sanitizedSearchParam}%` } },
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
      console.log(`🔄 [Kanban] Primeros 10 IDs:`, idsConEtiquetas.slice(0, 10));
      
      // ✅ VERIFICAR QUE LOS IDs EXISTAN EN LA TABLA TICKETS
      if (idsConEtiquetas.length > 0) {
        const ticketsExistentes = await Ticket.findAll({
          where: { id: { [Op.in]: idsConEtiquetas } },
          attributes: ['id', 'status', 'companyId'],
          raw: true
        });
        console.log(`🔄 [Kanban] Tickets existentes en BD: ${ticketsExistentes.length}`);
        console.log(`🔄 [Kanban] Primeros 5 tickets existentes:`, ticketsExistentes.slice(0, 5));
        
        // ✅ VERIFICAR STATUS DE LOS TICKETS
        const statusCounts = ticketsExistentes.reduce((acc, ticket) => {
          acc[ticket.status] = (acc[ticket.status] || 0) + 1;
          return acc;
        }, {});
        console.log(`🔄 [Kanban] Distribución de status:`, statusCounts);
      }
      
      // 2. Obtener tickets con etiquetas kanban (prioridad alta)
      // ✅ IMPORTANTE: NO aplicar filtros de status para tickets con etiquetas kanban
      const whereConditionSinStatus = { ...whereCondition };
      delete whereConditionSinStatus.status; // Remover filtro de status
      
      console.log(`🔄 [Kanban] DEBUG - whereConditionSinStatus:`, JSON.stringify(whereConditionSinStatus, null, 2));
      console.log(`🔄 [Kanban] DEBUG - idsConEtiquetas (primeros 5):`, idsConEtiquetas.slice(0, 5));
      
      // ✅ VERIFICAR CONSULTA SQL GENERADA
      const consultaSQL = await Ticket.findOne({
        where: {
          ...whereConditionSinStatus,
          id: { [Op.in]: idsConEtiquetas }
        },
        include: includeCondition,
        logging: console.log // ✅ MOSTRAR SQL GENERADO
      });
      
      // ✅ VERIFICAR CONSULTA SIMPLE SIN INCLUDES
      console.log(`🔄 [Kanban] Probando consulta simple sin includes...`);
      const consultaSimple = await Ticket.findAll({
        where: {
          id: { [Op.in]: idsConEtiquetas }
        },
        attributes: ['id', 'status', 'companyId'],
        raw: true
      });
      console.log(`🔄 [Kanban] Consulta simple sin includes: ${consultaSimple.length} tickets`);
      
      // ✅ VERIFICAR CONSULTA CON SOLO CONTACT (NO GRUPOS)
      console.log(`🔄 [Kanban] Probando consulta con filtro de contacto...`);
      const consultaConContact = await Ticket.findAll({
        where: {
          id: { [Op.in]: idsConEtiquetas }
          // ✅ CORREGIDO: Remover filtro problemático de Contact.isGroup
          // "$Contact.isGroup$": false
        },
        include: [{
          model: Contact,
          as: "contact",
          attributes: ["id", "name", "number", "email", "profilePicUrl", "isGroup"]
        }],
        raw: true
      });
      console.log(`🔄 [Kanban] Consulta con filtro de contacto: ${consultaConContact.length} tickets`);
      
      // ✅ VERIFICAR CONSULTA CON WHERE CONDITION COMPLETO
      console.log(`🔄 [Kanban] Probando consulta con whereCondition completo...`);
      const consultaConWhereCompleto = await Ticket.findAll({
        where: {
          ...whereConditionSinStatus,
          id: { [Op.in]: idsConEtiquetas }
        },
        attributes: ['id', 'status', 'companyId'],
        raw: true
      });
      console.log(`🔄 [Kanban] Consulta con whereCondition completo: ${consultaConWhereCompleto.length} tickets`);
      
      // ✅ VERIFICAR CONSULTA CON INCLUDE CONDITION
      console.log(`🔄 [Kanban] Probando consulta con includeCondition...`);
      const consultaConInclude = await Ticket.findAll({
        where: {
          ...whereConditionSinStatus,
          id: { [Op.in]: idsConEtiquetas }
        },
        include: includeCondition,
        attributes: ['id', 'status', 'companyId'],
        raw: true
      });
      console.log(`🔄 [Kanban] Consulta con includeCondition: ${consultaConInclude.length} tickets`);
      
      // ✅ VERIFICAR CONSULTA CON DISTINCT Y SUBQUERY
      console.log(`🔄 [Kanban] Probando consulta con distinct y subQuery...`);
      const consultaConDistinct = await Ticket.findAndCountAll({
        where: {
          ...whereConditionSinStatus,
          id: { [Op.in]: idsConEtiquetas }
        },
        include: includeCondition,
        distinct: true,
        subQuery: false
      });
      console.log(`🔄 [Kanban] Consulta con distinct y subQuery: ${consultaConDistinct.rows.length} tickets`);
      
      // ✅ VERIFICAR CONSULTA CON LIMIT
      console.log(`🔄 [Kanban] Probando consulta con limit...`);
      const consultaConLimit = await Ticket.findAndCountAll({
        where: {
          ...whereConditionSinStatus,
          id: { [Op.in]: idsConEtiquetas }
        },
        include: includeCondition,
        distinct: true,
        limit: 51,
        subQuery: false
      });
      console.log(`🔄 [Kanban] Consulta con limit: ${consultaConLimit.rows.length} tickets`);
      
      // ✅ VERIFICAR CONSULTA CON ORDER
      console.log(`🔄 [Kanban] Probando consulta con order...`);
      const consultaConOrder = await Ticket.findAndCountAll({
        where: {
          ...whereConditionSinStatus,
          id: { [Op.in]: idsConEtiquetas }
        },
        include: includeCondition,
        distinct: true,
        limit: 51,
        order: [["updatedAt", "DESC"]],
        subQuery: false
      });
      console.log(`🔄 [Kanban] Consulta con order: ${consultaConOrder.rows.length} tickets`);
      
      // ✅ VERIFICAR CONTENIDO EXACTO DEL WHERE CONDITION
      console.log(`🔄 [Kanban] === ANÁLISIS DETALLADO DEL WHERE CONDITION ===`);
      console.log(`🔄 [Kanban] whereCondition original:`, JSON.stringify(whereCondition, null, 2));
      console.log(`🔄 [Kanban] whereConditionSinStatus:`, JSON.stringify(whereConditionSinStatus, null, 2));
      console.log(`🔄 [Kanban] whereCondition final aplicado:`, JSON.stringify({
        ...whereConditionSinStatus,
        id: { [Op.in]: idsConEtiquetas }
      }, null, 2));
      console.log(`🔄 [Kanban] === FIN DEL ANÁLISIS ===`);
      
      // ✅ VERIFICAR CONTENIDO EXACTO DEL INCLUDE CONDITION
      console.log(`🔄 [Kanban] === ANÁLISIS DETALLADO DEL INCLUDE CONDITION ===`);
      console.log(`🔄 [Kanban] includeCondition:`, JSON.stringify(includeCondition, null, 2));
      console.log(`🔄 [Kanban] === FIN DEL ANÁLISIS ===`);
      
      // ✅ VERIFICAR CONTENIDO EXACTO DEL WHERE CONDITION PARA TICKETS SIN ETIQUETAS
      console.log(`🔄 [Kanban] === ANÁLISIS DETALLADO DEL WHERE CONDITION SIN ETIQUETAS ===`);
      console.log(`🔄 [Kanban] whereCondition para tickets sin etiquetas:`, JSON.stringify({
        ...whereCondition,
        id: { [Op.notIn]: idsConEtiquetas }
      }, null, 2));
      console.log(`🔄 [Kanban] === FIN DEL ANÁLISIS ===`);
      
      const ticketsConEtiquetas = await Ticket.findAndCountAll({
        where: {
          ...whereConditionSinStatus,
          id: { [Op.in]: idsConEtiquetas }
        },
        include: includeCondition,
        distinct: true,
        limit: 51, // ✅ MOSTRAR TODOS los tickets con etiquetas kanban disponibles
        order: [["updatedAt", "DESC"]],
        subQuery: false
      });
      
      console.log(`🔄 [Kanban] DEBUG - Consulta SQL ejecutada para tickets con etiquetas`);
      console.log(`🔄 [Kanban] DEBUG - whereCondition final:`, JSON.stringify({
        ...whereConditionSinStatus,
        id: { [Op.in]: idsConEtiquetas }
      }, null, 2));
      
      console.log(`🔄 [Kanban] Tickets con etiquetas encontrados: ${ticketsConEtiquetas.rows.length}`);
      
      // 3. Obtener tickets sin etiquetas (prioridad baja)
      const ticketsSinEtiquetas = await Ticket.findAndCountAll({
        where: {
          ...whereCondition,
          id: { [Op.notIn]: idsConEtiquetas }
        },
        include: includeCondition,
        distinct: true,
        limit: 50, // ✅ CAMBIADO: De 20 a 50 tickets por página
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
      const limit = 100; // ✅ Aumentar el límite para mostrar más tickets
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