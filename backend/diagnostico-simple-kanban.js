const { Op } = require("sequelize");
const database = require("./dist/database").default;
const Tag = require("./dist/models/Tag").default;
const Ticket = require("./dist/models/Ticket").default;
const Contact = require("./dist/models/Contact").default;
const TicketTag = require("./dist/models/TicketTag").default;

async function diagnosticarSimple() {
  console.log("🚨 DIAGNÓSTICO SIMPLE: Identificando dónde se pierde la información");
  console.log("================================================================================\n");

  try {
    const companyId = 2;

    // 1. Obtener IDs de tickets con etiquetas kanban (EXACTO como el servicio)
    console.log("1️⃣ Obtener ticketIdsConEtiquetas...");
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

    console.log(`   - ticketIdsConEtiquetas encontrados: ${ticketIdsConEtiquetas.length}`);
    console.log(`   - Primeros 5:`, ticketIdsConEtiquetas.slice(0, 5));

    // 2. Mapear a idsConEtiquetas (EXACTO como el servicio)
    console.log("\n2️⃣ Mapear a idsConEtiquetas...");
    const idsConEtiquetas = ticketIdsConEtiquetas.map(t => t.ticketId);
    
    console.log(`   - idsConEtiquetas mapeados: ${idsConEtiquetas.length}`);
    console.log(`   - Primeros 5:`, idsConEtiquetas.slice(0, 5));
    console.log(`   - Tipo de variable:`, typeof idsConEtiquetas);
    console.log(`   - Es array:`, Array.isArray(idsConEtiquetas));

    // 3. Crear whereConditionConEtiquetas (EXACTO como el servicio)
    console.log("\n3️⃣ Crear whereConditionConEtiquetas...");
    const whereConditionConEtiquetas = {
      companyId: companyId,
      id: { [Op.in]: idsConEtiquetas }
    };

    console.log(`   - whereConditionConEtiquetas creado:`);
    console.log(`   - JSON.stringify:`, JSON.stringify(whereConditionConEtiquetas, null, 2));
    console.log(`   - Tipo de variable:`, typeof whereConditionConEtiquetas);
    console.log(`   - Tipo de id:`, typeof whereConditionConEtiquetas.id);
    console.log(`   - Op.in disponible:`, typeof Op.in);

    // 4. Verificar que idsConEtiquetas no se haya modificado
    console.log("\n4️⃣ Verificar idsConEtiquetas después de crear whereCondition...");
    console.log(`   - idsConEtiquetas después: ${idsConEtiquetas.length}`);
    console.log(`   - Primeros 5 después:`, idsConEtiquetas.slice(0, 5));

    // 5. Probar consulta simple
    console.log("\n5️⃣ Probar consulta simple...");
    if (idsConEtiquetas.length > 0) {
      const consultaSimple = await Ticket.findAll({
        where: {
          id: { [Op.in]: idsConEtiquetas }
        },
        attributes: ['id', 'status', 'companyId'],
        raw: true
      });
      console.log(`   - Consulta simple: ${consultaSimple.length} tickets`);
    }

    // 6. Probar consulta con whereConditionConEtiquetas
    console.log("\n6️⃣ Probar consulta con whereConditionConEtiquetas...");
    const consultaConWhere = await Ticket.findAll({
      where: whereConditionConEtiquetas,
      attributes: ['id', 'status', 'companyId'],
      raw: true
    });
    console.log(`   - Consulta con whereCondition: ${consultaConWhere.length} tickets`);

    console.log("\n✅ DIAGNÓSTICO COMPLETADO");

  } catch (error) {
    console.error("❌ ERROR:", error);
  } finally {
    if (database && typeof database.close === 'function') {
      await database.close();
    }
  }
}

diagnosticarSimple();
