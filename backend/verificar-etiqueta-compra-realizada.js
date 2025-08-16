const { Op } = require("sequelize");
const db = require("./dist/database");

async function verificarEtiquetaCompraRealizada() {
  try {
    console.log("🔍 VERIFICACIÓN ESPECÍFICA: Etiqueta '4. compra realizada'");
    console.log("=" .repeat(60));
    
    // 1. Verificar la etiqueta específica
    console.log("\n📋 PASO 1: Verificar etiqueta '4. compra realizada'");
    const etiquetaCompraRealizada = await db.Tag.findOne({
      where: { id: 4 },
      attributes: ['id', 'name', 'kanban', 'color']
    });
    
    if (!etiquetaCompraRealizada) {
      console.log("❌ ERROR: No se encontró la etiqueta con ID 4");
      return;
    }
    
    console.log(`✅ Etiqueta encontrada:`, {
      id: etiquetaCompraRealizada.id,
      name: etiquetaCompraRealizada.name,
      kanban: etiquetaCompraRealizada.kanban,
      color: etiquetaCompraRealizada.color
    });
    
    // 2. Verificar tickets que TIENEN esta etiqueta específica
    console.log("\n📋 PASO 2: Verificar tickets con etiqueta '4. compra realizada'");
    const ticketsConEtiqueta4 = await db.Ticket.findAll({
      include: [
        {
          model: db.Tag,
          as: 'tags',
          where: { id: 4 },
          attributes: ['id', 'name', 'kanban'],
          through: { attributes: [] }
        },
        {
          model: db.Contact,
          as: 'contact',
          attributes: ['id', 'name', 'number']
        }
      ],
      where: { companyId: 2 },
      attributes: ['id', 'uuid', 'lastMessage', 'contactId'],
      order: [['id', 'ASC']]
    });
    
    console.log(`✅ Tickets con etiqueta "4. compra realizada": ${ticketsConEtiqueta4.length}`);
    
    if (ticketsConEtiqueta4.length > 0) {
      console.log("📋 Primeros 5 tickets con esta etiqueta:");
      ticketsConEtiqueta4.slice(0, 5).forEach((ticket, index) => {
        console.log(`   ${index + 1}. ID: ${ticket.id}, Contacto: ${ticket.contact?.name}, Número: ${ticket.contact?.number}`);
      });
    }
    
    // 3. Verificar tickets que TIENEN etiquetas kanban (todos)
    console.log("\n📋 PASO 3: Verificar tickets con CUALQUIER etiqueta kanban");
    const ticketsConEtiquetasKanban = await db.Ticket.findAll({
      include: [
        {
          model: db.Tag,
          as: 'tags',
          where: { kanban: 1 },
          attributes: ['id', 'name', 'kanban'],
          through: { attributes: [] }
        },
        {
          model: db.Contact,
          as: 'contact',
          attributes: ['id', 'name', 'number']
        }
      ],
      where: { companyId: 2 },
      attributes: ['id', 'uuid', 'lastMessage', 'contactId'],
      order: [['id', 'ASC']]
    });
    
    console.log(`✅ Tickets con CUALQUIER etiqueta kanban: ${ticketsConEtiquetasKanban.length}`);
    
    // 4. Verificar tickets sin etiquetas
    console.log("\n📋 PASO 4: Verificar tickets sin etiquetas");
    const ticketsSinEtiquetas = await db.Ticket.findAll({
      include: [
        {
          model: db.Contact,
          as: 'contact',
          attributes: ['id', 'name', 'number']
        }
      ],
      where: { 
        companyId: 2,
        id: {
          [Op.notIn]: ticketsConEtiquetasKanban.map(t => t.id)
        }
      },
      attributes: ['id', 'uuid', 'lastMessage', 'contactId'],
      limit: 50,
      order: [['id', 'ASC']]
    });
    
    console.log(`✅ Tickets sin etiquetas: ${ticketsSinEtiquetas.length}`);
    
    // 5. VERIFICAR DISCREPANCIA
    console.log("\n📋 PASO 5: VERIFICAR DISCREPANCIA");
    console.log("=" .repeat(60));
    
    const totalTickets = ticketsConEtiquetasKanban.length + ticketsSinEtiquetas.length;
    console.log(`🔍 Resumen:`);
    console.log(`   - Tickets con etiquetas kanban: ${ticketsConEtiquetasKanban.length}`);
    console.log(`   - Tickets sin etiquetas: ${ticketsSinEtiquetas.length}`);
    console.log(`   - Total calculado: ${totalTickets}`);
    
    // 6. VERIFICAR ESPECÍFICAMENTE LA ETIQUETA 4
    console.log("\n📋 PASO 6: VERIFICAR ESPECÍFICAMENTE ETIQUETA 4");
    console.log("=" .repeat(60));
    
    console.log(`🔍 Etiqueta "4. compra realizada":`);
    console.log(`   - Tickets encontrados en BD: ${ticketsConEtiqueta4.length}`);
    console.log(`   - Deberían ser: 23 (según módulo Etiquetas)`);
    console.log(`   - Discrepancia: ${23 - ticketsConEtiqueta4.length} tickets`);
    
    if (ticketsConEtiqueta4.length !== 23) {
      console.log("\n❌ PROBLEMA IDENTIFICADO:");
      console.log("   El backend NO está enviando 23 tickets con la etiqueta '4. compra realizada'");
      console.log("   Solo está enviando", ticketsConEtiqueta4.length, "tickets");
      
      // Verificar si hay tickets que deberían tener esta etiqueta pero no la tienen
      console.log("\n🔍 Verificando si hay tickets que deberían tener esta etiqueta...");
      
      // Buscar tickets que podrían tener esta etiqueta pero no la tienen
      const todosLosTickets = await db.Ticket.findAll({
        where: { companyId: 2 },
        attributes: ['id'],
        order: [['id', 'ASC']]
      });
      
      console.log(`   - Total de tickets en la empresa: ${todosLosTickets.length}`);
      console.log(`   - Tickets con etiqueta 4: ${ticketsConEtiqueta4.length}`);
      console.log(`   - Tickets sin verificar: ${todosLosTickets.length - ticketsConEtiqueta4.length}`);
    }
    
    console.log("\n✅ VERIFICACIÓN COMPLETADA");
    
  } catch (error) {
    console.error("❌ Error en verificación:", error);
  } finally {
    await db.sequelize.close();
  }
}

// Ejecutar verificación
verificarEtiquetaCompraRealizada();
