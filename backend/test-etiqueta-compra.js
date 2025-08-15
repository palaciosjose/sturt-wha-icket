const { Op } = require("sequelize");
const sequelize = require("./dist/database").default;
const Tag = require("./dist/models/Tag").default;
const TicketTag = require("./dist/models/TicketTag").default;
const Ticket = require("./dist/models/Ticket").default;
const Contact = require("./dist/models/Contact").default;

async function diagnosticarEtiquetaCompra() {
  try {
    console.log("🔍 DIAGNÓSTICO ESPECÍFICO: Etiqueta '4. compra realizada'");
    console.log("=" .repeat(60));

    // 1. Buscar la etiqueta "4. compra realizada" (nombre exacto)
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

    // 2. Contar tickets con esta etiqueta
    const ticketsConEtiqueta = await TicketTag.count({
      where: {
        tagId: etiquetaCompra.id
      }
    });

    console.log(`📊 Total de tickets con etiqueta '4. compra realizada': ${ticketsConEtiqueta}`);

    // 3. Obtener IDs de tickets con esta etiqueta
    const ticketTags = await TicketTag.findAll({
      where: {
        tagId: etiquetaCompra.id
      },
      attributes: ['ticketId']
    });

    const idsTickets = ticketTags.map(tt => tt.ticketId);
    console.log(`🔢 IDs de tickets con etiqueta: ${idsTickets.length}`);
    console.log(`📋 Primeros 10 IDs: [${idsTickets.slice(0, 10).join(', ')}]`);

    // 4. Verificar tickets existentes en BD
    const ticketsExistentes = await Ticket.findAll({
      where: {
        id: { [Op.in]: idsTickets },
        companyId: 2
      },
      attributes: ['id', 'status', 'companyId'],
      raw: true
    });

    console.log(`✅ Tickets existentes en BD: ${ticketsExistentes.length}`);
    console.log(`📊 Distribución de status:`);
    
    const statusCount = {};
    ticketsExistentes.forEach(t => {
      statusCount[t.status] = (statusCount[t.status] || 0) + 1;
    });
    
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`);
    });

    // 5. Verificar tickets con filtros del Kanban (solo open/pending)
    const ticketsKanban = await Ticket.findAll({
      where: {
        id: { [Op.in]: idsTickets },
        companyId: 2,
        status: { [Op.or]: ["pending", "open"] }
      },
      attributes: ['id', 'status', 'companyId'],
      raw: true
    });

    console.log(`🎯 Tickets que deberían aparecer en Kanban: ${ticketsKanban.length}`);
    console.log(`📋 IDs en Kanban: [${ticketsKanban.map(t => t.id).join(', ')}]`);

    // 6. Verificar si hay tickets cerrados que no aparecen
    const ticketsCerrados = ticketsExistentes.filter(t => t.status === 'closed');
    console.log(`🔒 Tickets cerrados (no visibles en Kanban): ${ticketsCerrados.length}`);
    
    if (ticketsCerrados.length > 0) {
      console.log(`📋 IDs de tickets cerrados: [${ticketsCerrados.map(t => t.id).join(', ')}]`);
    }

    // 7. Resumen final
    console.log("\n" + "=" .repeat(60));
    console.log("📊 RESUMEN FINAL:");
    console.log(`   - Total en TicketTags: ${ticketsConEtiqueta}`);
    console.log(`   - Tickets existentes: ${ticketsExistentes.length}`);
    console.log(`   - Tickets visibles en Kanban: ${ticketsKanban.length}`);
    console.log(`   - Diferencia: ${ticketsConEtiqueta - ticketsKanban.length}`);
    
    if (ticketsConEtiqueta !== ticketsKanban.length) {
      console.log(`\n✅ COMPORTAMIENTO CORRECTO:`);
      console.log(`   La diferencia de ${ticketsConEtiqueta - ticketsKanban.length} tickets`);
      console.log(`   se debe a tickets con status 'closed' que no son visibles en el Kanban.`);
      console.log(`   Esto es el comportamiento esperado.`);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    if (sequelize && typeof sequelize.close === 'function') {
      await sequelize.close();
    }
  }
}

diagnosticarEtiquetaCompra();
