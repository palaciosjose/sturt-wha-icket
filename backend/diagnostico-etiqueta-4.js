const { Op } = require("sequelize");
const Ticket = require("./src/models/Ticket");
const Tag = require("./src/models/Tag");
const TicketTag = require("./src/models/TicketTag");
const Contact = require("./src/models/Contact");
const Queue = require("./src/models/Queue");
const User = require("./src/models/User");
const Whatsapp = require("./src/models/Whatsapp");

const diagnosticoEtiqueta4 = async () => {
  try {
    console.log("🔍 [DIAGNÓSTICO] Iniciando análisis de etiqueta '4. COMPRA REALIZADA'");
    
    // 1. Buscar la etiqueta específica
    const etiqueta4 = await Tag.findOne({
      where: { 
        name: "4. compra realizada",
        companyId: 2
      }
    });
    
    if (!etiqueta4) {
      console.log("❌ Etiqueta '4. compra realizada' no encontrada");
      return;
    }
    
    console.log(`✅ Etiqueta encontrada:`, {
      id: etiqueta4.id,
      name: etiqueta4.name,
      companyId: etiqueta4.companyId,
      kanban: etiqueta4.kanban
    });
    
    // 2. Contar tickets con esta etiqueta
    const ticketsConEtiqueta4 = await TicketTag.findAll({
      where: { tagId: etiqueta4.id },
      include: [{
        model: Ticket,
        as: 'ticket',
        include: [{
          model: Contact,
          as: 'contact',
          attributes: ['id', 'name', 'number']
        }]
      }]
    });
    
    console.log(`📊 Total de tickets con etiqueta '4. COMPRA REALIZADA': ${ticketsConEtiqueta4.length}`);
    
    // 3. Analizar cada ticket
    console.log("\n🔍 [ANÁLISIS DETALLADO] Tickets con etiqueta '4. COMPRA REALIZADA':");
    
    for (let i = 0; i < ticketsConEtiqueta4.length; i++) {
      const ticketTag = ticketsConEtiqueta4[i];
      const ticket = ticketTag.ticket;
      
      console.log(`\n📋 Ticket ${i + 1}:`);
      console.log(`   ID: ${ticket.id}`);
      console.log(`   Status: ${ticket.status}`);
      console.log(`   CompanyId: ${ticket.companyId}`);
      console.log(`   Contact: ${ticket.contact?.name || 'N/A'} (${ticket.contact?.number || 'N/A'})`);
      console.log(`   CreatedAt: ${ticket.createdAt}`);
      console.log(`   UpdatedAt: ${ticket.updatedAt}`);
      
      // Verificar si el ticket existe en la tabla principal
      const ticketEnBD = await Ticket.findByPk(ticket.id);
      if (!ticketEnBD) {
        console.log(`   ⚠️  TICKET NO EXISTE EN TABLA PRINCIPAL`);
      } else {
        console.log(`   ✅ Ticket existe en tabla principal`);
      }
    }
    
    // 4. Verificar tickets que NO aparecen en Kanban
    console.log("\n🔍 [VERIFICACIÓN KANBAN] Tickets que deberían aparecer:");
    
    const ticketsParaKanban = await Ticket.findAll({
      where: {
        id: { [Op.in]: ticketsConEtiqueta4.map(tt => tt.ticketId) },
        companyId: 2
      },
      include: [{
        model: Contact,
        as: 'contact',
        attributes: ['id', 'name', 'number', 'isGroup']
      }],
      order: [['updatedAt', 'DESC']]
    });
    
    console.log(`📊 Tickets válidos para Kanban: ${ticketsParaKanban.length}`);
    
    // 5. Verificar filtros que podrían estar excluyendo tickets
    console.log("\n🔍 [VERIFICACIÓN FILTROS] Análisis de filtros:");
    
    // Verificar tickets con status específicos
    const ticketsPorStatus = ticketsParaKanban.reduce((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log(`📊 Distribución por status:`, ticketsPorStatus);
    
    // Verificar tickets con contactos que son grupos
    const ticketsConGrupos = ticketsParaKanban.filter(t => t.contact?.isGroup);
    console.log(`📊 Tickets con contactos que son grupos: ${ticketsConGrupos.length}`);
    
    // 6. Simular consulta del Kanban
    console.log("\n🔍 [SIMULACIÓN KANBAN] Consulta que ejecuta el Kanban:");
    
    const includeCondition = [
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
        through: { attributes: [] },
        required: false,
        separate: false
      },
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: ["name"]
      }
    ];
    
    const whereConditionConEtiquetas = {
      companyId: 2,
      id: { [Op.in]: ticketsConEtiqueta4.map(tt => tt.ticketId) }
    };
    
    console.log(`🔍 whereCondition:`, JSON.stringify(whereConditionConEtiquetas, null, 2));
    
    const ticketsKanban = await Ticket.findAndCountAll({
      where: whereConditionConEtiquetas,
      include: includeCondition,
      distinct: true,
      limit: 100,
      order: [["updatedAt", "DESC"]],
      subQuery: false
    });
    
    console.log(`📊 Resultado consulta Kanban: ${ticketsKanban.rows.length} tickets`);
    
    // 7. Comparar resultados
    console.log("\n🔍 [COMPARACIÓN] Análisis de diferencias:");
    console.log(`📊 Total en TicketTag: ${ticketsConEtiqueta4.length}`);
    console.log(`📊 Total válidos en BD: ${ticketsParaKanban.length}`);
    console.log(`📊 Total en consulta Kanban: ${ticketsKanban.rows.length}`);
    
    if (ticketsConEtiqueta4.length !== ticketsKanban.rows.length) {
      console.log(`⚠️  DISCREPANCIA DETECTADA: ${ticketsConEtiqueta4.length - ticketsKanban.rows.length} tickets faltantes`);
      
      // Identificar tickets faltantes
      const idsEnTicketTag = ticketsConEtiqueta4.map(tt => tt.ticketId);
      const idsEnKanban = ticketsKanban.rows.map(t => t.id);
      const idsFaltantes = idsEnTicketTag.filter(id => !idsEnKanban.includes(id));
      
      console.log(`🔍 IDs de tickets faltantes:`, idsFaltantes);
    } else {
      console.log(`✅ NO HAY DISCREPANCIA - Todos los tickets aparecen correctamente`);
    }
    
  } catch (error) {
    console.error("❌ Error en diagnóstico:", error);
  }
};

// Ejecutar diagnóstico
diagnosticoEtiqueta4()
  .then(() => {
    console.log("\n✅ Diagnóstico completado");
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ Error fatal:", error);
    process.exit(1);
  });
