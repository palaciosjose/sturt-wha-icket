const { Op } = require("sequelize");
const sequelize = require("./dist/database").default;
const Ticket = require("./dist/models/Ticket").default;
const Tag = require("./dist/models/Tag").default;
const TicketTag = require("./dist/models/TicketTag").default;
const Contact = require("./dist/models/Contact").default;
const Queue = require("./dist/models/Queue").default;
const User = require("./dist/models/User").default;
const Whatsapp = require("./dist/models/Whatsapp").default;

async function testKanbanProduccion() {
  try {
    console.log("🚀 [PRODUCCIÓN] Iniciando diagnóstico del Kanban en PRODUCCIÓN...");
    
    // ✅ VERIFICAR CONEXIÓN A LA BASE DE DATOS
    console.log(`\n🔍 [PRODUCCIÓN] 0. Verificando conexión a la base de datos...`);
    try {
      await sequelize.authenticate();
      console.log(`   ✅ Conexión a BD exitosa`);
    } catch (error) {
      console.error(`   ❌ Error de conexión a BD:`, error);
      return;
    }
    
    // ✅ VERIFICAR DATOS EN LAS TABLAS
    console.log(`\n🔍 [PRODUCCIÓN] 0.1. Verificando datos en las tablas...`);
    
    const totalTags = await Tag.count();
    console.log(`   ✅ Total de etiquetas en BD: ${totalTags}`);
    
    const totalTickets = await Ticket.count();
    console.log(`   ✅ Total de tickets en BD: ${totalTickets}`);
    
    const totalTicketTags = await TicketTag.count();
    console.log(`   ✅ Total de relaciones TicketTag en BD: ${totalTicketTags}`);
    
    // ✅ VERIFICAR EMPRESAS DISPONIBLES
    console.log(`\n🔍 [PRODUCCIÓN] 0.2. Verificando empresas disponibles...`);
    const Company = require("./dist/models/Company").default;
    const todasLasEmpresas = await Company.findAll({
      attributes: ['id', 'name'],
      raw: true
    });
    
    console.log(`   ✅ Total de empresas en BD: ${todasLasEmpresas.length}`);
    todasLasEmpresas.forEach(empresa => {
      console.log(`      - ID: ${empresa.id}, Nombre: ${empresa.name}`);
    });
    
    // ✅ CONFIGURACIÓN PARA EMPRESA 2 (Tiendas HK)
    const companyId = 2; // Empresa "Tiendas HK" (PRODUCCIÓN)
    const userId = 1; // Usuario de prueba
    
    console.log(`\n📋 [PRODUCCIÓN] Configuración para empresa de producción:`);
    console.log(`   - Company ID: ${companyId} (Tiendas HK)`);
    console.log(`   - User ID: ${userId}`);
    
    // ✅ 1. VERIFICAR ETIQUETAS KANBAN DE LA EMPRESA 2
    console.log(`\n🔍 [PRODUCCIÓN] 1. Verificando etiquetas kanban de empresa ${companyId}...`);
    const etiquetasKanban = await Tag.findAll({
      where: { kanban: 1, companyId: companyId },
      attributes: ['id', 'name', 'color', 'kanban'],
      raw: true
    });
    
    console.log(`   ✅ Etiquetas kanban encontradas: ${etiquetasKanban.length}`);
    etiquetasKanban.forEach(tag => {
      console.log(`      - ID: ${tag.id}, Nombre: ${tag.name}, Color: ${tag.color}`);
    });
    
    // ✅ 2. VERIFICAR TICKETS CON ETIQUETAS KANBAN
    console.log(`\n🔍 [PRODUCCIÓN] 2. Verificando tickets con etiquetas kanban...`);
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
    
    if (idsConEtiquetas.length === 0) {
      console.log(`   ❌ NO HAY TICKETS CON ETIQUETAS KANBAN - PROBLEMA IDENTIFICADO`);
      return;
    }
    
    // ✅ 3. VERIFICAR QUE LOS TICKETS EXISTAN
    console.log(`\n🔍 [PRODUCCIÓN] 3. Verificando existencia de tickets...`);
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
    
    // ✅ 4. SIMULAR WHERE CONDITION DEL KANBAN
    console.log(`\n🔍 [PRODUCCIÓN] 4. Simulando whereCondition del Kanban...`);
    
    // Simular el whereCondition exacto del ListTicketsServiceKanban
    const whereCondition = {
      [Op.or]: [{ userId: userId }, { status: "pending" }],
      queueId: { [Op.or]: [[], null] }, // queueIds vacío
      status: { [Op.or]: ["pending", "open"] },
      companyId: companyId
      // ✅ CORREGIDO: Remover filtro problemático de Contact.isGroup
      // "$Contact.isGroup$": false
    };
    
    const whereConditionSinStatus = { ...whereCondition };
    delete whereConditionSinStatus.status; // Remover filtro de status
    
    console.log(`   📋 whereCondition original:`, JSON.stringify(whereCondition, null, 2));
    console.log(`   📋 whereConditionSinStatus:`, JSON.stringify(whereConditionSinStatus, null, 2));
    
    // ✅ 5. PROBAR CONSULTA SIMPLE SIN FILTROS
    console.log(`\n🔍 [PRODUCCIÓN] 5. Probando consulta simple sin filtros...`);
    const consultaSimple = await Ticket.findAll({
      where: { id: { [Op.in]: idsConEtiquetas } },
      attributes: ['id', 'status', 'companyId'],
      raw: true
    });
    console.log(`   ✅ Consulta simple: ${consultaSimple.length} tickets`);
    
    // ✅ 6. PROBAR CONSULTA CON FILTRO DE COMPANY
    console.log(`\n🔍 [PRODUCCIÓN] 6. Probando consulta con filtro de company...`);
    const consultaConCompany = await Ticket.findAll({
      where: { 
        id: { [Op.in]: idsConEtiquetas },
        companyId: companyId
      },
      attributes: ['id', 'status', 'companyId'],
      raw: true
    });
    console.log(`   ✅ Consulta con company filter: ${consultaConCompany.length} tickets`);
    
    // ✅ 7. PROBAR CONSULTA CON FILTRO DE STATUS
    console.log(`\n🔍 [PRODUCCIÓN] 7. Probando consulta con filtro de status...`);
    const consultaConStatus = await Ticket.findAll({
      where: { 
        id: { [Op.in]: idsConEtiquetas },
        status: { [Op.in]: ["pending", "open"] }
      },
      attributes: ['id', 'status', 'companyId'],
      raw: true
    });
    console.log(`   ✅ Consulta con status filter: ${consultaConStatus.length} tickets`);
    
    // ✅ 8. PROBAR CONSULTA CON FILTRO DE USER/QUEUE
    console.log(`\n🔍 [PRODUCCIÓN] 8. Probando consulta con filtro de user/queue...`);
    const consultaConUserQueue = await Ticket.findAll({
      where: { 
        id: { [Op.in]: idsConEtiquetas },
        [Op.or]: [{ userId: userId }, { status: "pending" }]
      },
      attributes: ['id', 'status', 'companyId', 'userId'],
      raw: true
    });
    console.log(`   ✅ Consulta con user/queue filter: ${consultaConUserQueue.length} tickets`);
    
    // ✅ 9. PROBAR CONSULTA COMPLETA DEL KANBAN
    console.log(`\n🔍 [PRODUCCIÓN] 9. Probando consulta completa del Kanban...`);
    const consultaCompleta = await Ticket.findAll({
      where: {
        ...whereConditionSinStatus,
        id: { [Op.in]: idsConEtiquetas }
      },
      attributes: ['id', 'status', 'companyId', 'userId'],
      raw: true
    });
    console.log(`   ✅ Consulta completa del Kanban: ${consultaCompleta.length} tickets`);
    
    // ✅ 10. VERIFICAR CONSULTA SQL GENERADA
    console.log(`\n🔍 [PRODUCCIÓN] 10. Verificando SQL generado...`);
    const consultaSQL = await Ticket.findOne({
      where: {
        ...whereConditionSinStatus,
        id: { [Op.in]: idsConEtiquetas }
      },
      attributes: ['id'],
      logging: console.log
    });
    
    console.log(`   ✅ SQL generado mostrado arriba`);
    
    // ✅ 11. DIAGNÓSTICO FINAL
    console.log(`\n🔍 [PRODUCCIÓN] 11. DIAGNÓSTICO FINAL...`);
    
    if (consultaCompleta.length === 0) {
      console.log(`   ❌ PROBLEMA IDENTIFICADO: La consulta completa devuelve 0 tickets`);
      console.log(`   🔍 Posibles causas:`);
      console.log(`      - whereConditionSinStatus está filtrando incorrectamente`);
      console.log(`      - Conflicto en los filtros de user/queue`);
      console.log(`      - Problema con el filtro de contact.isGroup`);
    } else {
      console.log(`   ✅ La consulta funciona correctamente: ${consultaCompleta.length} tickets`);
    }
    
    console.log(`\n✅ [PRODUCCIÓN] Diagnóstico completado`);
    
  } catch (error) {
    console.error(`❌ [PRODUCCIÓN] Error durante el diagnóstico:`, error);
  } finally {
    if (sequelize && typeof sequelize.close === 'function') {
      await sequelize.close();
      console.log(`\n🔌 [PRODUCCIÓN] Conexión a BD cerrada`);
    }
  }
}

// ✅ EJECUTAR DIAGNÓSTICO
testKanbanProduccion();
