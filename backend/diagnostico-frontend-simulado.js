const { Op } = require("sequelize");
const database = require("./dist/database").default;
const Tag = require("./dist/models/Tag").default;
const Ticket = require("./dist/models/Ticket").default;
const Contact = require("./dist/models/Contact").default;
const TicketTag = require("./dist/models/TicketTag").default;

async function diagnosticarFrontendSimulado() {
  console.log("🚨 DIAGNÓSTICO: Simulando lógica del frontend");
  console.log("================================================================================\n");

  try {
    // 1. Obtener etiquetas con kanban = 1 (como hace el frontend)
    const etiquetasKanban = await Tag.findAll({
      where: { kanban: 1 },
      order: [["id", "ASC"]]
    });

    console.log("📋 ETIQUETAS KANBAN ENCONTRADAS:");
    etiquetasKanban.forEach(tag => {
      console.log(`   - ID: ${tag.id} | Nombre: "${tag.name}" | Kanban: ${tag.kanban}`);
    });
    console.log(`   Total: ${etiquetasKanban.length} etiquetas\n`);

    // 2. Obtener todos los tickets (como hace el backend)
    const companyId = 2; // Tiendas HK
    const allTickets = await Ticket.findAll({
      where: { companyId },
      include: [
        {
          model: Contact,
          as: "contact",
          attributes: ["id", "name", "number", "isGroup"]
        },
        {
          model: Tag,
          as: "tags",
          through: { attributes: [] }
        }
      ]
    });

    console.log(`📊 TOTAL DE TICKETS ENCONTRADOS: ${allTickets.length}\n`);

    // 3. Simular la lógica del frontend: filtrar tickets por etiqueta
    etiquetasKanban.forEach(tag => {
      const ticketsFiltrados = allTickets.filter(ticket => {
        // Verificar que el ticket tenga tags y sea un array
        if (!ticket.tags || !Array.isArray(ticket.tags)) {
          return false;
        }
        // Buscar si alguna de las etiquetas del ticket coincide con la etiqueta actual
        return ticket.tags.some(ticketTag =>
          ticketTag && ticketTag.id === tag.id
        );
      });

      console.log(`🔍 ETIQUETA "${tag.name}" (ID: ${tag.id}):`);
      console.log(`   - Tickets encontrados: ${ticketsFiltrados.length}`);
      
      if (ticketsFiltrados.length > 0) {
        console.log(`   - IDs de tickets: ${ticketsFiltrados.map(t => t.id).join(", ")}`);
      }
      console.log("");
    });

    // 4. Verificar específicamente "4. compra realizada"
    const etiquetaCompra = etiquetasKanban.find(tag => tag.id === 4);
    if (etiquetaCompra) {
      console.log("🎯 ANÁLISIS ESPECÍFICO: Etiqueta '4. compra realizada'");
      console.log("================================================================================\n");
      
      const ticketsCompra = allTickets.filter(ticket => {
        if (!ticket.tags || !Array.isArray(ticket.tags)) {
          return false;
        }
        return ticket.tags.some(ticketTag =>
          ticketTag && ticketTag.id === 4
        );
      });

      console.log(`📊 RESULTADO FRONTEND SIMULADO:`);
      console.log(`   - Total tickets encontrados: ${ticketsCompra.length}`);
      console.log(`   - IDs: ${ticketsCompra.map(t => t.id).join(", ")}\n`);

      // 5. Verificar si hay algún filtro adicional que esté causando la pérdida
      console.log("🔍 VERIFICANDO POSIBLES FILTROS ADICIONALES:");
      
      // Verificar si hay tickets con status específico
      const ticketsOpen = ticketsCompra.filter(t => t.status === "open");
      const ticketsClosed = ticketsCompra.filter(t => t.status === "closed");
      const ticketsPending = ticketsCompra.filter(t => t.status === "pending");
      
      console.log(`   - Status 'open': ${ticketsOpen.length} tickets`);
      console.log(`   - Status 'closed': ${ticketsClosed.length} tickets`);
      console.log(`   - Status 'pending': ${ticketsPending.length} tickets`);
      
      // Verificar si hay tickets con userId específico
      const ticketsConUserId = ticketsCompra.filter(t => t.userId);
      const ticketsSinUserId = ticketsCompra.filter(t => !t.userId);
      console.log(`   - Con userId: ${ticketsConUserId.length} tickets`);
      console.log(`   - Sin userId: ${ticketsSinUserId.length} tickets`);
      
      // Verificar si hay tickets con queueId específico
      const ticketsConQueueId = ticketsCompra.filter(t => t.queueId);
      const ticketsSinQueueId = ticketsCompra.filter(t => !t.queueId);
      console.log(`   - Con queueId: ${ticketsConQueueId.length} tickets`);
      console.log(`   - Sin queueId: ${ticketsSinQueueId.length} tickets`);
    }

  } catch (error) {
    console.error("❌ ERROR:", error);
  } finally {
    if (database && typeof database.close === 'function') {
      await database.close();
    }
  }
}

diagnosticarFrontendSimulado();
