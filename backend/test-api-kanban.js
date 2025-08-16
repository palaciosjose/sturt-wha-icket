const axios = require("axios");

async function testApiKanban() {
  console.log("🚨 TEST: Verificando API /ticket/kanban");
  console.log("================================================================================\n");

  try {
    // Simular exactamente la llamada del frontend
    const response = await axios.get("http://localhost:8080/ticket/kanban", {
      params: {
        teste: true
      }
    });

    console.log("✅ RESPUESTA DEL BACKEND:");
    console.log(`   - Status: ${response.status}`);
    console.log(`   - Total tickets: ${response.data.tickets?.length || 0}`);
    console.log(`   - Total tags: ${response.data.tags?.length || 0}\n`);

    // Verificar tickets con etiqueta "4. compra realizada"
    if (response.data.tickets) {
      const ticketsConEtiqueta4 = response.data.tickets.filter(ticket => {
        if (!ticket.tags || !Array.isArray(ticket.tags)) {
          return false;
        }
        return ticket.tags.some(tag => tag.id === 4);
      });

      console.log("🎯 TICKETS CON ETIQUETA '4. compra realizada':");
      console.log(`   - Total encontrados: ${ticketsConEtiqueta4.length}`);
      console.log(`   - IDs: ${ticketsConEtiqueta4.map(t => t.id).join(", ")}\n`);

      // Verificar estructura de los tickets
      if (ticketsConEtiqueta4.length > 0) {
        console.log("🔍 ESTRUCTURA DEL PRIMER TICKET:");
        const primerTicket = ticketsConEtiqueta4[0];
        console.log(`   - ID: ${primerTicket.id}`);
        console.log(`   - Status: ${primerTicket.status}`);
        console.log(`   - Tags: ${JSON.stringify(primerTicket.tags)}`);
        console.log(`   - Contact: ${JSON.stringify(primerTicket.Contact)}`);
      }
    }

    // Verificar etiquetas
    if (response.data.tags) {
      const etiqueta4 = response.data.tags.find(tag => tag.id === 4);
      if (etiqueta4) {
        console.log("\n🏷️  ETIQUETA '4. compra realizada':");
        console.log(`   - ID: ${etiqueta4.id}`);
        console.log(`   - Nombre: "${etiqueta4.name}"`);
        console.log(`   - Kanban: ${etiqueta4.kanban}`);
        console.log(`   - Color: ${etiqueta4.color}`);
      }
    }

  } catch (error) {
    console.error("❌ ERROR:", error.message);
    if (error.response) {
      console.error(`   - Status: ${error.response.status}`);
      console.error(`   - Data: ${JSON.stringify(error.response.data)}`);
    }
  }
}

testApiKanban();
