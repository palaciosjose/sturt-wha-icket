const { Op } = require("sequelize");
const db = require("./src/database");

async function diagnosticoFrontendKanbanDetallado() {
  try {
    console.log("🔍 DIAGNÓSTICO DETALLADO DEL FRONTEND KANBAN");
    console.log("=" .repeat(60));
    
    // 1. Obtener etiquetas con kanban = 1
    console.log("\n📋 PASO 1: Obtener etiquetas con kanban = 1");
    const etiquetasKanban = await db.Tag.findAll({
      where: { kanban: 1 },
      attributes: ['id', 'name', 'kanban', 'color'],
      order: [['id', 'ASC']]
    });
    
    console.log(`✅ Etiquetas kanban encontradas: ${etiquetasKanban.length}`);
    etiquetasKanban.forEach(tag => {
      console.log(`   - ID: ${tag.id}, Nombre: "${tag.name}", Kanban: ${tag.kanban}`);
    });
    
    // 2. Obtener tickets con etiquetas kanban (simulando backend)
    console.log("\n📋 PASO 2: Obtener tickets con etiquetas kanban (Backend)");
    
    // Obtener IDs de tickets con etiquetas kanban
    const ticketsConEtiquetas = await db.Ticket.findAll({
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
          attributes: ['id', 'name', 'number', 'profilePicUrl']
        }
      ],
      where: { companyId: 2 },
      attributes: ['id', 'uuid', 'lastMessage', 'contactId'],
      order: [['id', 'ASC']]
    });
    
    console.log(`✅ Tickets con etiquetas kanban encontrados: ${ticketsConEtiquetas.length}`);
    
    // 3. Obtener tickets sin etiquetas (ABIERTOS)
    console.log("\n📋 PASO 3: Obtener tickets sin etiquetas (ABIERTOS)");
    
    const ticketsSinEtiquetas = await db.Ticket.findAll({
      include: [
        {
          model: db.Contact,
          as: 'contact',
          attributes: ['id', 'name', 'number', 'profilePicUrl']
        }
      ],
      where: { 
        companyId: 2,
        id: {
          [Op.notIn]: ticketsConEtiquetas.map(t => t.id)
        }
      },
      attributes: ['id', 'uuid', 'lastMessage', 'contactId'],
      limit: 50,
      order: [['id', 'ASC']]
    });
    
    console.log(`✅ Tickets sin etiquetas (ABIERTOS): ${ticketsSinEtiquetas.length}`);
    
    // 4. Simular datos que envía el backend al frontend
    console.log("\n📋 PASO 4: Simular datos enviados del backend al frontend");
    
    const datosBackend = {
      tickets: [...ticketsConEtiquetas, ...ticketsSinEtiquetas],
      count: ticketsConEtiquetas.length + ticketsSinEtiquetas.length,
      hasMore: false
    };
    
    console.log(`✅ Total de tickets enviados por backend: ${datosBackend.tickets.length}`);
    console.log(`   - Con etiquetas: ${ticketsConEtiquetas.length}`);
    console.log(`   - Sin etiquetas: ${ticketsSinEtiquetas.length}`);
    
    // 5. SIMULAR LÓGICA EXACTA DEL FRONTEND
    console.log("\n📋 PASO 5: SIMULAR LÓGICA EXACTA DEL FRONTEND");
    console.log("=" .repeat(60));
    
    // Simular el estado local del frontend
    const localTickets = datosBackend.tickets;
    
    // Simular la lógica de ticketsSinEtiquetas del frontend
    const ticketsSinEtiquetasFrontend = localTickets.filter(ticket => 
      !ticket.tags || ticket.tags.length === 0
    );
    
    console.log(`🔍 Frontend - Tickets sin etiquetas filtrados: ${ticketsSinEtiquetasFrontend.length}`);
    
    // Simular la lógica de ticketsPorEtiqueta del frontend
    const ticketsPorEtiqueta = {};
    etiquetasKanban.forEach(tag => {
      const ticketsFiltrados = localTickets.filter(ticket => {
        if (!ticket.tags || !Array.isArray(ticket.tags)) {
          return false;
        }
        return ticket.tags.some(ticketTag => 
          ticketTag && ticketTag.id === tag.id
        );
      });
      
      ticketsPorEtiqueta[tag.id] = ticketsFiltrados;
      
      console.log(`🔍 Frontend - Etiqueta "${tag.name}" (ID: ${tag.id}): ${ticketsFiltrados.length} tickets`);
      
      // Mostrar IDs de tickets para la etiqueta "4. COMPRA REALIZADA"
      if (tag.id === 4) {
        console.log(`   📋 IDs de tickets para "${tag.name}":`, ticketsFiltrados.map(t => t.id));
      }
    });
    
    // 6. VERIFICAR DISCREPANCIA
    console.log("\n📋 PASO 6: VERIFICAR DISCREPANCIA");
    console.log("=" .repeat(60));
    
    const etiquetaCompraRealizada = etiquetasKanban.find(tag => tag.id === 4);
    if (etiquetaCompraRealizada) {
      const ticketsEnColumna = ticketsPorEtiqueta[4] || [];
      const ticketsBackend = ticketsConEtiquetas.filter(t => 
        t.tags.some(tag => tag.id === 4)
      );
      
      console.log(`🔍 Etiqueta: "${etiquetaCompraRealizada.name}"`);
      console.log(`   - Backend encuentra: ${ticketsBackend.length} tickets`);
      console.log(`   - Frontend distribuye: ${ticketsEnColumna.length} tickets`);
      console.log(`   - Discrepancia: ${ticketsBackend.length - ticketsEnColumna.length} tickets`);
      
      if (ticketsBackend.length !== ticketsEnColumna.length) {
        console.log("\n❌ PROBLEMA IDENTIFICADO:");
        console.log("   Los tickets se pierden en la lógica de filtrado del frontend");
        
        // Mostrar tickets que el backend encuentra pero el frontend no distribuye
        const ticketsPerdidos = ticketsBackend.filter(tBackend => 
          !ticketsEnColumna.some(tFrontend => tFrontend.id === tBackend.id)
        );
        
        if (ticketsPerdidos.length > 0) {
          console.log("\n📋 Tickets perdidos en el frontend:");
          ticketsPerdidos.forEach(ticket => {
            console.log(`   - ID: ${ticket.id}, Contacto: ${ticket.contact?.name}`);
            console.log(`     Tags: ${ticket.tags.map(t => `${t.id}:${t.name}`).join(', ')}`);
          });
        }
      }
    }
    
    // 7. VERIFICAR ESTRUCTURA DE DATOS
    console.log("\n📋 PASO 7: VERIFICAR ESTRUCTURA DE DATOS");
    console.log("=" .repeat(60));
    
    if (localTickets.length > 0) {
      console.log("🔍 Estructura del primer ticket:");
      const primerTicket = localTickets[0];
      console.log(`   - ID: ${primerTicket.id}`);
      console.log(`   - hasTags: ${!!primerTicket.tags}`);
      console.log(`   - tagsType: ${typeof primerTicket.tags}`);
      console.log(`   - tagsIsArray: ${Array.isArray(primerTicket.tags)}`);
      console.log(`   - tagsLength: ${primerTicket.tags?.length || 0}`);
      console.log(`   - rawTags:`, primerTicket.tags);
      
      if (primerTicket.tags && primerTicket.tags.length > 0) {
        console.log("   - Primer tag:");
        console.log(`     ID: ${primerTicket.tags[0].id}`);
        console.log(`     Name: ${primerTicket.tags[0].name}`);
        console.log(`     Kanban: ${primerTicket.tags[0].kanban}`);
      }
    }
    
    console.log("\n✅ DIAGNÓSTICO COMPLETADO");
    
  } catch (error) {
    console.error("❌ Error en diagnóstico:", error);
  } finally {
    await db.sequelize.close();
  }
}

// Ejecutar diagnóstico
diagnosticoFrontendKanbanDetallado();
