const { Op } = require("sequelize");
const sequelize = require("./dist/database").default;
const Tag = require("./dist/models/Tag").default;
const TicketTag = require("./dist/models/TicketTag").default;
const Ticket = require("./dist/models/Ticket").default;

async function diagnosticoKanbanSeguro() {
  try {
    console.log("🔍 DIAGNÓSTICO SEGURO: Comparando Kanban vs Base de Datos");
    console.log("=" .repeat(70));
    console.log("⚠️  ESTE SCRIPT SOLO LEE DATOS - NO MODIFICA NADA");
    console.log("=" .repeat(70));

    // 1. Buscar la etiqueta "4. compra realizada"
    const etiquetaCompra = await Tag.findOne({
      where: {
        name: "4. compra realizada",
        companyId: 2
      }
    });

    if (!etiquetaCompra) {
      console.log("❌ No se encontró la etiqueta '4. compra realizada'");
      return;
    }

    console.log(`✅ Etiqueta encontrada: ID ${etiquetaCompra.id} - "${etiquetaCompra.name}"`);

    // 2. Obtener TODOS los tickets con esta etiqueta
    const ticketTags = await TicketTag.findAll({
      where: {
        tagId: etiquetaCompra.id
      },
      attributes: ['ticketId']
    });

    const idsTickets = ticketTags.map(tt => tt.ticketId);
    console.log(`\n📊 TOTAL EN BASE DE DATOS: ${idsTickets.length} tickets`);

    // 3. Verificar tickets existentes y su status
    const ticketsExistentes = await Ticket.findAll({
      where: {
        id: { [Op.in]: idsTickets },
        companyId: 2
      },
      attributes: ['id', 'status', 'companyId', 'createdAt', 'updatedAt'],
      order: [['id', 'ASC']],
      raw: true
    });

    console.log(`✅ Tickets existentes en BD: ${ticketsExistentes.length}`);
    
    // 4. Distribución por status
    const statusCount = {};
    ticketsExistentes.forEach(t => {
      statusCount[t.status] = (statusCount[t.status] || 0) + 1;
    });
    
    console.log(`\n📊 DISTRIBUCIÓN POR STATUS:`);
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count} tickets`);
    });

    // 5. Tickets que DEBERÍAN aparecer en Kanban (todos los que no estén closed)
    const ticketsKanbanEsperados = ticketsExistentes.filter(t => t.status !== 'closed');
    console.log(`\n🎯 TICKETS QUE DEBERÍAN APARECER EN KANBAN: ${ticketsKanbanEsperados.length}`);
    
    if (ticketsKanbanEsperados.length !== 20) {
      console.log(`❌ PROBLEMA: Deberían ser 20, pero son ${ticketsKanbanEsperados.length}`);
    }

    // 6. Mostrar todos los tickets con detalles
    console.log(`\n📋 LISTADO COMPLETO DE TICKETS:`);
    console.log(`   ID | Status    | Company | Creado`);
    console.log(`   ---|-----------|---------|--------`);
    
    ticketsExistentes.forEach(t => {
      const fecha = new Date(t.createdAt).toLocaleDateString('es-ES');
      const status = t.status.padEnd(9);
      console.log(`   ${t.id.toString().padStart(3)} | ${status} | ${t.companyId}       | ${fecha}`);
    });

    // 7. Resumen final
    console.log("\n" + "=" .repeat(70));
    console.log("📊 RESUMEN FINAL:");
    console.log(`   - Total en TicketTags: ${idsTickets.length}`);
    console.log(`   - Tickets existentes: ${ticketsExistentes.length}`);
    console.log(`   - Tickets visibles en Kanban (esperados): ${ticketsKanbanEsperados.length}`);
    console.log(`   - Tickets cerrados: ${statusCount['closed'] || 0}`);
    
    if (ticketsKanbanEsperados.length !== 20) {
      console.log(`\n🚨 PROBLEMA IDENTIFICADO:`);
      console.log(`   El Kanban debería mostrar ${ticketsKanbanEsperados.length} tickets,`);
      console.log(`   pero según tu observación muestra 17.`);
      console.log(`   Faltan ${20 - ticketsKanbanEsperados.length} tickets por alguna razón.`);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    if (sequelize && typeof sequelize.close === 'function') {
      await sequelize.close();
    }
  }
}

diagnosticoKanbanSeguro();
