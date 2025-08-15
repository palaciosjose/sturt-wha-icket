const { Op } = require("sequelize");
const sequelize = require("./dist/database").default;
const Ticket = require("./dist/models/Ticket").default;
const Tag = require("./dist/models/Tag").default;
const TicketTag = require("./dist/models/TicketTag").default;
const Contact = require("./dist/models/Contact").default;
const Queue = require("./dist/models/Queue").default;
const User = require("./dist/models/User").default;
const Whatsapp = require("./dist/models/Whatsapp").default;

async function testKanbanDebug() {
  try {
    console.log("🚀 [TEST] Iniciando diagnóstico del Kanban...");
    
    // ✅ VERIFICAR CONEXIÓN A LA BASE DE DATOS
    console.log(`\n🔍 [TEST] 0. Verificando conexión a la base de datos...`);
    try {
      await sequelize.authenticate();
      console.log(`   ✅ Conexión a BD exitosa`);
    } catch (error) {
      console.error(`   ❌ Error de conexión a BD:`, error);
      return;
    }
    
    // ✅ VERIFICAR SI HAY DATOS EN LAS TABLAS
    console.log(`\n🔍 [TEST] 0.1. Verificando datos en las tablas...`);
    
    const totalTags = await Tag.count();
    console.log(`   ✅ Total de etiquetas en BD: ${totalTags}`);
    
    const totalTickets = await Ticket.count();
    console.log(`   ✅ Total de tickets en BD: ${totalTickets}`);
    
    const totalTicketTags = await TicketTag.count();
    console.log(`   ✅ Total de relaciones TicketTag en BD: ${totalTicketTags}`);
    
    // ✅ VERIFICAR EMPRESAS DISPONIBLES
    console.log(`\n🔍 [TEST] 0.2. Verificando empresas disponibles...`);
    const Company = require("./dist/models/Company").default;
    const todasLasEmpresas = await Company.findAll({
      attributes: ['id', 'name'],
      raw: true
    });
    
    console.log(`   ✅ Total de empresas en BD: ${todasLasEmpresas.length}`);
    todasLasEmpresas.forEach(empresa => {
      console.log(`      - ID: ${empresa.id}, Nombre: ${empresa.name}`);
    });
    
    // ✅ VERIFICAR USUARIOS DISPONIBLES
    console.log(`\n🔍 [TEST] 0.3. Verificando usuarios disponibles...`);
    const todosLosUsuarios = await User.findAll({
      attributes: ['id', 'name', 'email', 'companyId'],
      raw: true
    });
    
    console.log(`   ✅ Total de usuarios en BD: ${todosLosUsuarios.length}`);
    todosLosUsuarios.forEach(usuario => {
      console.log(`      - ID: ${usuario.id}, Nombre: ${usuario.name}, Company: ${usuario.companyId}`);
    });
    
    // ✅ CONFIGURACIÓN DE PRUEBA
    const companyId = 1; // Empresa "Empresa Demo" (que SÍ existe)
    const userId = 1; // Usuario "Leo" de la empresa 1
    
    console.log(`\n📋 [TEST] Configuración de prueba:`);
    console.log(`   - Company ID: ${companyId} (Empresa Demo)`);
    console.log(`   - User ID: ${userId} (Leo)`);
    
    // ✅ 1. VERIFICAR ETIQUETAS KANBAN
    console.log(`\n🔍 [TEST] 1. Verificando etiquetas kanban...`);
    const etiquetasKanban = await Tag.findAll({
      where: { kanban: 1, companyId: companyId },
      attributes: ['id', 'name', 'color', 'kanban'],
      raw: true
    });
    
    console.log(`   ✅ Etiquetas kanban encontradas: ${etiquetasKanban.length}`);
    etiquetasKanban.forEach(tag => {
      console.log(`      - ID: ${tag.id}, Nombre: ${tag.name}, Color: ${tag.color}`);
    });
    
    // ✅ VERIFICAR TODAS LAS ETIQUETAS DE LA EMPRESA
    console.log(`\n🔍 [TEST] 1.1. Verificando todas las etiquetas de la empresa...`);
    const todasLasEtiquetas = await Tag.findAll({
      where: { companyId: companyId },
      attributes: ['id', 'name', 'color', 'kanban'],
      raw: true
    });
    
    console.log(`   ✅ Total de etiquetas de la empresa: ${todasLasEtiquetas.length}`);
    todasLasEtiquetas.forEach(tag => {
      console.log(`      - ID: ${tag.id}, Nombre: ${tag.name}, Kanban: ${tag.kanban}`);
    });
    
    // ✅ 2. VERIFICAR TICKETS CON ETIQUETAS KANBAN
    console.log(`\n🔍 [TEST] 2. Verificando tickets con etiquetas kanban...`);
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
    console.log(`   ✅ IDs de tickets con etiquetas kanban: ${idsConEtiquetas.length}`);
    console.log(`   ✅ Primeros 10 IDs:`, idsConEtiquetas.slice(0, 10));
    
    // ✅ 3. VERIFICAR QUE LOS TICKETS EXISTAN
    if (idsConEtiquetas.length > 0) {
      console.log(`\n🔍 [TEST] 3. Verificando existencia de tickets...`);
      const ticketsExistentes = await Ticket.findAll({
        where: { id: { [Op.in]: idsConEtiquetas } },
        attributes: ['id', 'status', 'companyId', 'userId'],
        raw: true
      });
      
      console.log(`   ✅ Tickets existentes en BD: ${ticketsExistentes.length}`);
      console.log(`   ✅ Primeros 5 tickets:`, ticketsExistentes.slice(0, 5));
      
      // ✅ VERIFICAR STATUS
      const statusCounts = ticketsExistentes.reduce((acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      }, {});
      console.log(`   ✅ Distribución de status:`, statusCounts);
      
      // ✅ VERIFICAR COMPANY ID
      const companyCounts = ticketsExistentes.reduce((acc, ticket) => {
        acc[ticket.companyId] = (acc[ticket.companyId] || 0) + 1;
        return acc;
      }, {});
      console.log(`   ✅ Distribución por company:`, companyCounts);
    }
    
    // ✅ 4. VERIFICAR CONSULTA SIMPLE SIN FILTROS
    if (idsConEtiquetas.length > 0) {
      console.log(`\n🔍 [TEST] 4. Probando consulta simple sin filtros...`);
      const consultaSimple = await Ticket.findAll({
        where: { id: { [Op.in]: idsConEtiquetas } },
        attributes: ['id', 'status', 'companyId'],
        raw: true
      });
      console.log(`   ✅ Consulta simple: ${consultaSimple.length} tickets`);
    }
    
    // ✅ 5. VERIFICAR CONSULTA CON FILTRO DE COMPANY
    if (idsConEtiquetas.length > 0) {
      console.log(`\n🔍 [TEST] 5. Probando consulta con filtro de company...`);
      const consultaConCompany = await Ticket.findAll({
        where: { 
          id: { [Op.in]: idsConEtiquetas },
          companyId: companyId
        },
        attributes: ['id', 'status', 'companyId'],
        raw: true
      });
      console.log(`   ✅ Consulta con company filter: ${consultaConCompany.length} tickets`);
    }
    
    // ✅ 6. VERIFICAR CONSULTA CON FILTRO DE STATUS
    if (idsConEtiquetas.length > 0) {
      console.log(`\n🔍 [TEST] 6. Probando consulta con filtro de status...`);
      const consultaConStatus = await Ticket.findAll({
        where: { 
          id: { [Op.in]: idsConEtiquetas },
          status: { [Op.in]: ["pending", "open"] }
        },
        attributes: ['id', 'status', 'companyId'],
        raw: true
      });
      console.log(`   ✅ Consulta con status filter: ${consultaConStatus.length} tickets`);
    }
    
    // ✅ 7. VERIFICAR CONSULTA CON FILTRO DE USER/QUEUE
    if (idsConEtiquetas.length > 0) {
      console.log(`\n🔍 [TEST] 7. Probando consulta con filtro de user/queue...`);
      const consultaConUserQueue = await Ticket.findAll({
        where: { 
          id: { [Op.in]: idsConEtiquetas },
          [Op.or]: [{ userId: userId }, { status: "pending" }]
        },
        attributes: ['id', 'status', 'companyId', 'userId'],
        raw: true
      });
      console.log(`   ✅ Consulta con user/queue filter: ${consultaConUserQueue.length} tickets`);
    }
    
    // ✅ 8. VERIFICAR CONSULTA CON FILTRO DE CONTACT (NO GRUPOS)
    if (idsConEtiquetas.length > 0) {
      console.log(`\n🔍 [TEST] 8. Probando consulta con filtro de contact...`);
      const consultaConContact = await Ticket.findAll({
        where: { 
          id: { [Op.in]: idsConEtiquetas },
          "$contact.isGroup$": false
        },
        include: [{
          model: Contact,
          as: "contact",
          attributes: ["id", "name", "number", "isGroup"]
        }],
        raw: true
      });
      console.log(`   ✅ Consulta con contact filter: ${consultaConContact.length} tickets`);
    }
    
    // ✅ 9. VERIFICAR CONSULTA COMPLETA (SIMULANDO EL KANBAN)
    if (idsConEtiquetas.length > 0) {
      console.log(`\n🔍 [TEST] 9. Probando consulta completa del Kanban...`);
      
      // Simular whereCondition del Kanban
      const whereCondition = {
        [Op.or]: [{ userId: userId }, { status: "pending" }],
        queueId: { [Op.or]: [[], null] }, // queueIds vacío
        companyId: companyId
      };
      
      const whereConditionSinStatus = { ...whereCondition };
      delete whereConditionSinStatus.status;
      
      console.log(`   📋 whereCondition original:`, JSON.stringify(whereCondition, null, 2));
      console.log(`   📋 whereConditionSinStatus:`, JSON.stringify(whereConditionSinStatus, null, 2));
      
      const consultaCompleta = await Ticket.findAll({
        where: {
          ...whereConditionSinStatus,
          id: { [Op.in]: idsConEtiquetas }
        },
        attributes: ['id', 'status', 'companyId', 'userId'],
        raw: true
      });
      console.log(`   ✅ Consulta completa del Kanban: ${consultaCompleta.length} tickets`);
    }
    
    // ✅ 10. VERIFICAR CONSULTA SQL GENERADA
    if (idsConEtiquetas.length > 0) {
      console.log(`\n🔍 [TEST] 10. Verificando SQL generado...`);
      
      const whereCondition = {
        [Op.or]: [{ userId: userId }, { status: "pending" }],
        queueId: { [Op.or]: [[], null] },
        companyId: companyId
      };
      
      const whereConditionSinStatus = { ...whereCondition };
      delete whereConditionSinStatus.status;
      
      const consultaSQL = await Ticket.findOne({
        where: {
          ...whereConditionSinStatus,
          id: { [Op.in]: idsConEtiquetas }
        },
        attributes: ['id'],
        logging: console.log
      });
      
      console.log(`   ✅ SQL generado mostrado arriba`);
    }
    
    console.log(`\n✅ [TEST] Diagnóstico completado`);
    
  } catch (error) {
    console.error(`❌ [TEST] Error durante el diagnóstico:`, error);
  } finally {
    if (sequelize && typeof sequelize.close === 'function') {
      await sequelize.close();
      console.log(`\n🔌 [TEST] Conexión a BD cerrada`);
    }
  }
}

// ✅ EJECUTAR DIAGNÓSTICO
testKanbanDebug();
