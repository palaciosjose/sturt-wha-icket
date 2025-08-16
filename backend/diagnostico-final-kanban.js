const { Op } = require("sequelize");
const sequelize = require("./dist/database").default;
const Tag = require("./dist/models/Tag").default;
const TicketTag = require("./dist/models/TicketTag").default;
const Ticket = require("./dist/models/Ticket").default;
const Contact = require("./dist/models/Contact").default;

async function diagnosticoFinalKanban() {
  try {
    console.log("🚨 DIAGNÓSTICO FINAL: Verificando tickets de '4. compra realizada' en tiempo real");
    console.log("=" .repeat(80));
    console.log("⚠️  ESTE SCRIPT SOLO LEE DATOS - NO MODIFICA NADA");
    console.log("=" .repeat(80));

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

    // 2. Obtener TODOS los tickets con esta etiqueta desde TicketTags
    const ticketTags = await TicketTag.findAll({
      where: {
        tagId: etiquetaCompra.id
      },
      attributes: ['ticketId']
    });

    const idsTickets = ticketTags.map(tt => tt.ticketId);
    console.log(`\n📊 TOTAL EN BASE DE DATOS (TicketTags): ${idsTickets.length} tickets`);

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

    // 5. SIMULAR LA CONSULTA EXACTA DEL BACKEND CORREGIDO
    console.log(`\n🔄 SIMULANDO CONSULTA DEL BACKEND CORREGIDO:`);
    
    // ✅ USAR LA LÓGICA CORREGIDA DEL BACKEND
    const whereConditionConEtiquetas = {
      companyId: 2,
      id: { [Op.in]: idsTickets }
    };

    const includeCondition = [{
      model: Contact,
      as: "contact",
      attributes: ["id", "name", "number", "email", "profilePicUrl", "isGroup"]
    }, {
      model: require("./dist/models/Queue").default,
      as: "queue",
      attributes: ["id", "name", "color"]
    }, {
      model: require("./dist/models/User").default,
      as: "user",
      attributes: ["id", "name"]
    }, {
      model: require("./dist/models/Tag").default,
      as: "tags",
      attributes: ["id", "name", "color"],
      through: {
        attributes: []
      },
      required: false,
      separate: false
    }, {
      model: require("./dist/models/Whatsapp").default,
      as: "whatsapp",
      attributes: ["name"]
    }];

    // Consulta principal del backend CORREGIDA
    const ticketsBackend = await Ticket.findAndCountAll({
      where: whereConditionConEtiquetas,
      include: includeCondition,
      distinct: true,
      limit: 51,
      order: [["updatedAt", "DESC"]],
      subQuery: false
    });

    console.log(`✅ Tickets encontrados por backend CORREGIDO: ${ticketsBackend.count}`);
    console.log(`✅ Tickets retornados por backend CORREGIDO: ${ticketsBackend.rows.length}`);

    // 6. VERIFICAR DIFERENCIAS
    console.log(`\n🔍 ANÁLISIS DE DIFERENCIAS:`);
    
    if (ticketsExistentes.length !== ticketsBackend.count) {
      console.log(`❌ PROBLEMA: Base de datos tiene ${ticketsExistentes.length} pero backend encuentra ${ticketsBackend.count}`);
    } else {
      console.log(`✅ Base de datos y backend coinciden: ${ticketsExistentes.length} tickets`);
    }

    // 7. Verificar si hay tickets duplicados o problemas de joins
    const ticketsBackendIds = ticketsBackend.rows.map(t => t.id);
    const ticketsBackendUnique = [...new Set(ticketsBackendIds)];
    
    console.log(`\n📊 VERIFICACIÓN DE DUPLICADOS:`);
    console.log(`   - IDs únicos en backend: ${ticketsBackendUnique.length}`);
    console.log(`   - Total rows del backend: ${ticketsBackend.rows.length}`);
    
    if (ticketsBackendUnique.length !== ticketsBackend.rows.length) {
      console.log(`⚠️  POSIBLE PROBLEMA: Hay ${ticketsBackend.rows.length - ticketsBackendUnique.length} tickets duplicados`);
    }

    // 8. Verificar tickets que NO están en el backend
    const ticketsFaltantes = idsTickets.filter(id => !ticketsBackendIds.includes(id));
    
    if (ticketsFaltantes.length > 0) {
      console.log(`\n🚨 TICKETS QUE NO LLEGAN AL BACKEND:`);
      console.log(`   - IDs faltantes: ${ticketsFaltantes.join(', ')}`);
      
      // Verificar por qué no llegan
      const ticketsFaltantesInfo = await Ticket.findAll({
        where: {
          id: { [Op.in]: ticketsFaltantes },
          companyId: 2
        },
        attributes: ['id', 'status', 'companyId'],
        raw: true
      });
      
      console.log(`   - Información de tickets faltantes:`);
      ticketsFaltantesInfo.forEach(t => {
        console.log(`     * ID ${t.id}: status=${t.status}, companyId=${t.companyId}`);
      });
    }

    // 9. MOSTRAR TODOS LOS TICKETS CON DETALLES
    console.log(`\n📋 LISTADO COMPLETO DE TICKETS CON ETIQUETA "4. compra realizada":`);
    console.log(`   ID | Status    | Company | Creado`);
    console.log(`   ---|-----------|---------|--------`);

    ticketsExistentes.forEach(t => {
      const fecha = new Date(t.createdAt).toLocaleDateString('es-ES');
      const status = t.status.padEnd(9);
      console.log(`   ${t.id.toString().padStart(3)} | ${status} | ${t.companyId}       | ${fecha}`);
    });

    // 10. Resumen final
    console.log("\n" + "=" .repeat(80));
    console.log("📊 RESUMEN FINAL:");
    console.log(`   - Total en TicketTags: ${idsTickets.length}`);
    console.log(`   - Tickets existentes: ${ticketsExistentes.length}`);
    console.log(`   - Tickets encontrados por backend CORREGIDO: ${ticketsBackend.count}`);
    console.log(`   - Tickets retornados por backend CORREGIDO: ${ticketsBackend.rows.length}`);
    console.log(`   - Tickets únicos en backend: ${ticketsBackendUnique.length}`);

    if (ticketsBackendUnique.length !== 23) {
      console.log(`\n🚨 PROBLEMA IDENTIFICADO:`);
      console.log(`   El backend CORREGIDO debería retornar 23 tickets únicos,`);
      console.log(`   pero está retornando ${ticketsBackendUnique.length}.`);
      console.log(`   Faltan ${23 - ticketsBackendUnique.length} tickets por alguna razón.`);
    } else {
      console.log(`\n✅ El backend CORREGIDO está funcionando correctamente.`);
      console.log(`   El problema debe estar en el frontend o en la comunicación.`);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    if (sequelize && typeof sequelize.close === 'function') {
      await sequelize.close();
    }
  }
}

diagnosticoFinalKanban();
