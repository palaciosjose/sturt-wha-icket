const mysql = require('mysql2/promise');

const diagnosticoSimple = async () => {
  let connection;
  
  try {
    console.log("🔍 [DIAGNÓSTICO SIMPLE] Iniciando análisis de etiqueta '4. COMPRA REALIZADA'");
    
    // Conectar a la base de datos
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'watoolx2024',
      database: 'watoolxoficial'
    });
    
    console.log("✅ Conectado a la base de datos");
    
    // 1. Buscar la etiqueta específica
    console.log("\n🔍 [PASO 1] Buscando etiqueta '4. compra realizada'...");
    
    const [etiquetas] = await connection.execute(
      "SELECT id, name, companyId, kanban FROM Tags WHERE name = '4. compra realizada' AND companyId = 2"
    );
    
    if (etiquetas.length === 0) {
      console.log("❌ Etiqueta '4. compra realizada' no encontrada");
      return;
    }
    
    const etiqueta = etiquetas[0];
    console.log(`✅ Etiqueta encontrada:`, etiqueta);
    
    // 2. Contar tickets con esta etiqueta
    console.log("\n🔍 [PASO 2] Contando tickets con esta etiqueta...");
    
    const [ticketsConEtiqueta] = await connection.execute(
      "SELECT COUNT(*) as total FROM TicketTags WHERE tagId = ?",
      [etiqueta.id]
    );
    
    const totalTickets = ticketsConEtiqueta[0].total;
    console.log(`📊 Total de tickets con etiqueta '4. COMPRA REALIZADA': ${totalTickets}`);
    
    // 3. Obtener IDs de tickets con esta etiqueta
    console.log("\n🔍 [PASO 3] Obteniendo IDs de tickets...");
    
    const [ticketIds] = await connection.execute(
      "SELECT ticketId FROM TicketTags WHERE tagId = ? ORDER BY ticketId",
      [etiqueta.id]
    );
    
    const ids = ticketIds.map(row => row.ticketId);
    console.log(`📋 IDs de tickets:`, ids);
    
    // 4. Verificar tickets que existen en la tabla principal
    console.log("\n🔍 [PASO 4] Verificando tickets en tabla principal...");
    
    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      const [ticketsExistentes] = await connection.execute(
        `SELECT id, status, companyId, createdAt, updatedAt FROM Tickets WHERE id IN (${placeholders}) ORDER BY id`,
        ids
      );
      
      console.log(`📊 Tickets existentes en tabla principal: ${ticketsExistentes.length}`);
      
      // Mostrar detalles de cada ticket
      console.log("\n🔍 [DETALLES] Tickets existentes:");
      ticketsExistentes.forEach(ticket => {
        console.log(`   ID: ${ticket.id}, Status: ${ticket.status}, CompanyId: ${ticket.companyId}`);
      });
      
      // 5. Verificar tickets que NO existen
      const idsExistentes = ticketsExistentes.map(t => t.id);
      const idsFaltantes = ids.filter(id => !idsExistentes.includes(id));
      
      if (idsFaltantes.length > 0) {
        console.log(`\n⚠️  TICKETS FALTANTES EN TABLA PRINCIPAL: ${idsFaltantes.length}`);
        console.log(`   IDs faltantes:`, idsFaltantes);
      } else {
        console.log(`\n✅ Todos los tickets existen en la tabla principal`);
      }
      
      // 6. Verificar distribución por status
      console.log("\n🔍 [PASO 5] Análisis por status:");
      const statusCounts = ticketsExistentes.reduce((acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      }, {});
      
      console.log(`📊 Distribución por status:`, statusCounts);
      
      // 7. Verificar tickets con contactos
      console.log("\n🔍 [PASO 6] Verificando tickets con contactos...");
      
      const [ticketsConContactos] = await connection.execute(
        `SELECT t.id, t.status, c.name as contactName, c.number as contactNumber, c.isGroup 
         FROM Tickets t 
         LEFT JOIN Contacts c ON t.contactId = c.id 
         WHERE t.id IN (${placeholders}) 
         ORDER BY t.id`,
        ids
      );
      
      console.log(`📊 Tickets con información de contacto: ${ticketsConContactos.length}`);
      
      // Verificar contactos que son grupos
      const ticketsConGrupos = ticketsConContactos.filter(t => t.isGroup);
      console.log(`📊 Tickets con contactos que son grupos: ${ticketsConGrupos.length}`);
      
      if (ticketsConGrupos.length > 0) {
        console.log(`   IDs de tickets con grupos:`, ticketsConGrupos.map(t => t.id));
      }
      
      // 8. Simular consulta del Kanban
      console.log("\n🔍 [PASO 7] Simulando consulta del Kanban...");
      
      const [ticketsKanban] = await connection.execute(
        `SELECT DISTINCT t.id, t.status, t.companyId, c.name as contactName, c.isGroup
         FROM Tickets t
         LEFT JOIN Contacts c ON t.contactId = c.id
         WHERE t.id IN (${placeholders}) AND t.companyId = 2
         ORDER BY t.updatedAt DESC
         LIMIT 100`,
        ids
      );
      
      console.log(`📊 Resultado consulta Kanban: ${ticketsKanban.length} tickets`);
      
      // 9. Comparar resultados
      console.log("\n🔍 [COMPARACIÓN FINAL] Análisis de diferencias:");
      console.log(`📊 Total en TicketTag: ${totalTickets}`);
      console.log(`📊 Total válidos en BD: ${ticketsExistentes.length}`);
      console.log(`📊 Total en consulta Kanban: ${ticketsKanban.length}`);
      
      if (totalTickets !== ticketsKanban.length) {
        console.log(`⚠️  DISCREPANCIA DETECTADA: ${totalTickets - ticketsKanban.length} tickets faltantes`);
        
        // Identificar tickets faltantes
        const idsEnKanban = ticketsKanban.map(t => t.id);
        const idsFaltantesEnKanban = ids.filter(id => !idsEnKanban.includes(id));
        
        console.log(`🔍 IDs de tickets faltantes en Kanban:`, idsFaltantesEnKanban);
        
        // Verificar por qué faltan
        if (idsFaltantesEnKanban.length > 0) {
          console.log("\n🔍 [ANÁLISIS DE TICKETS FALTANTES]");
          
          for (const idFaltante of idsFaltantesEnKanban) {
            const [ticketFaltante] = await connection.execute(
              "SELECT t.*, c.isGroup FROM Tickets t LEFT JOIN Contacts c ON t.contactId = c.id WHERE t.id = ?",
              [idFaltante]
            );
            
            if (ticketFaltante.length > 0) {
              const ticket = ticketFaltante[0];
              console.log(`   Ticket ${idFaltante}: Status=${ticket.status}, CompanyId=${ticket.companyId}, isGroup=${ticket.isGroup}`);
            } else {
              console.log(`   Ticket ${idFaltante}: NO EXISTE EN TABLA PRINCIPAL`);
            }
          }
        }
      } else {
        console.log(`✅ NO HAY DISCREPANCIA - Todos los tickets aparecen correctamente`);
      }
      
    } else {
      console.log("❌ No hay tickets con esta etiqueta");
    }
    
  } catch (error) {
    console.error("❌ Error en diagnóstico:", error);
  } finally {
    if (connection) {
      await connection.end();
      console.log("\n✅ Conexión cerrada");
    }
  }
};

// Ejecutar diagnóstico
diagnosticoSimple()
  .then(() => {
    console.log("\n✅ Diagnóstico completado");
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ Error fatal:", error);
    process.exit(1);
  });
