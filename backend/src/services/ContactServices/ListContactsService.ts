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
  console.log("📍 whereCondition keys:", Object.keys(whereCondition));
  console.log("📍 whereCondition Op.and:", whereCondition[Op.and] ? "✅ PRESENTE" : "❌ AUSENTE");
  console.log("📍 whereCondition Op.or:", whereCondition[Op.and]?.[0]?.[Op.or] ? "✅ PRESENTE" : "❌ AUSENTE");
  console.log("📍 whereCondition companyId:", whereCondition[Op.and]?.[1]?.companyId ? "✅ PRESENTE" : "❌ AUSENTE");
  console.log("📍 whereCondition number filter:", whereCondition[Op.and]?.[2]?.number ? "✅ PRESENTE" : "❌ AUSENTE");
  const limit = 30;
  const offset = limit * (+pageNumber - 1);

  // 🔍 DEBUG: Ver la consulta SQL que se ejecuta
  console.log("🔍 ListContactsService - Ejecutando consulta...");
  
  // 🔍 DEBUG: Ver si hay algún problema con la consulta
  try {
    // 🔍 DEBUG: Mostrar la consulta SQL que se va a ejecutar
    console.log("🔍 ListContactsService - whereCondition completo:", whereCondition);
    
    // 🔍 DEBUG: Verificar si hay algún problema con Sequelize
    console.log("🔍 ListContactsService - Op.and:", Op.and);
    console.log("🔍 ListContactsService - Op.notLike:", Op.notLike);
    
    // 🔍 DEBUG: Mostrar la consulta SQL que se va a ejecutar
    console.log("🔍 ListContactsService - whereCondition completo:", whereCondition);
    
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
    
    console.log("🔍 ListContactsService - Consulta ejecutada exitosamente");
    
    // 🔍 DEBUG: Verificar si hay grupos en los resultados
    const gruposEncontrados = contacts.filter(c => c.number.includes('@g.us'));
    console.log("🔍 ListContactsService - Grupos encontrados:", gruposEncontrados.length);
    if (gruposEncontrados.length > 0) {
      console.log("🔍 ListContactsService - Ejemplos de grupos:", gruposEncontrados.slice(0, 3).map(c => ({ id: c.id, name: c.name, number: c.number })));
    }
    
    // 🔍 DEBUG: Verificar TODOS los números para entender qué está pasando
    console.log("🔍 ListContactsService - TODOS los números de contactos:");
    contacts.forEach((contact, index) => {
      console.log(`  ${index + 1}. ID: ${contact.id}, Name: ${contact.name}, Number: ${contact.number}`);
    });
    
    // 🔍 DEBUG: Verificar si hay números largos que podrían ser grupos
    const numerosLargos = contacts.filter(c => c.number.length > 15);
    console.log("🔍 ListContactsService - Números largos (>15 dígitos):", numerosLargos.length);
    if (numerosLargos.length > 0) {
      console.log("🔍 ListContactsService - Ejemplos de números largos:", numerosLargos.slice(0, 5).map(c => ({ id: c.id, name: c.name, number: c.number })));
    }
    
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
    
  } catch (error) {
    console.error("❌ ListContactsService - Error en la consulta:", error);
    throw error;
  }
};

export default ListContactsService;
