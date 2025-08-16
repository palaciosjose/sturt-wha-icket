const sequelize = require("./dist/database").default;
const Tag = require("./dist/models/Tag").default;

async function verificarKanbanTags() {
  try {
    console.log("🔍 VERIFICANDO ESTADO DE KANBAN EN ETIQUETAS");
    console.log("=" .repeat(60));

    // Obtener todas las etiquetas de la empresa 2
    const etiquetas = await Tag.findAll({
      where: { companyId: 2 },
      attributes: ['id', 'name', 'color', 'kanban'],
      order: [['id', 'ASC']]
    });

    console.log(`✅ Total de etiquetas encontradas: ${etiquetas.length}\n`);
    
    // Mostrar todas las etiquetas con su estado kanban
    console.log("📋 ESTADO DE KANBAN EN TODAS LAS ETIQUETAS:");
    console.log("   ID | Nombre                    | Color     | Kanban");
    console.log("   ---|---------------------------|-----------|--------");
    
    etiquetas.forEach(tag => {
      const id = tag.id.toString().padStart(3);
      const nombre = tag.name.padEnd(25);
      const color = tag.color.padEnd(10);
      const kanban = tag.kanban === 1 ? "✅ 1" : "❌ 0";
      console.log(`   ${id} | ${nombre} | ${color} | ${kanban}`);
    });

    // Filtrar etiquetas con kanban = 1
    const etiquetasKanban = etiquetas.filter(tag => tag.kanban === 1);
    const etiquetasSinKanban = etiquetas.filter(tag => tag.kanban !== 1);

    console.log(`\n📊 RESUMEN:`);
    console.log(`   - Etiquetas con kanban = 1: ${etiquetasKanban.length}`);
    console.log(`   - Etiquetas con kanban = 0/null: ${etiquetasSinKanban.length}`);

    // Verificar específicamente "4. compra realizada"
    const etiquetaCompra = etiquetas.find(tag => tag.name === "4. compra realizada");
    if (etiquetaCompra) {
      console.log(`\n🎯 ETIQUETA "4. compra realizada":`);
      console.log(`   - ID: ${etiquetaCompra.id}`);
      console.log(`   - Nombre: "${etiquetaCompra.name}"`);
      console.log(`   - Color: ${etiquetaCompra.color}`);
      console.log(`   - Kanban: ${etiquetaCompra.kanban === 1 ? "✅ ACTIVADO" : "❌ DESACTIVADO"}`);
      
      if (etiquetaCompra.kanban !== 1) {
        console.log(`\n🚨 PROBLEMA IDENTIFICADO:`);
        console.log(`   La etiqueta "4. compra realizada" tiene kanban = ${etiquetaCompra.kanban}`);
        console.log(`   Para que aparezca en el Kanban, debe tener kanban = 1`);
        console.log(`\n💡 SOLUCIÓN:`);
        console.log(`   Ejecutar en MySQL: UPDATE Tags SET kanban = 1 WHERE name = '4. compra realizada' AND companyId = 2;`);
      }
    } else {
      console.log(`\n❌ NO SE ENCONTRÓ la etiqueta "4. compra realizada"`);
    }

    // Mostrar etiquetas que SÍ aparecen en Kanban
    if (etiquetasKanban.length > 0) {
      console.log(`\n✅ ETIQUETAS QUE APARECEN EN KANBAN:`);
      etiquetasKanban.forEach(tag => {
        console.log(`   - ${tag.name} (ID: ${tag.id})`);
      });
    }

    // Mostrar etiquetas que NO aparecen en Kanban
    if (etiquetasSinKanban.length > 0) {
      console.log(`\n❌ ETIQUETAS QUE NO APARECEN EN KANBAN:`);
      etiquetasSinKanban.forEach(tag => {
        console.log(`   - ${tag.name} (ID: ${tag.id}) - kanban = ${tag.kanban}`);
      });
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    if (sequelize && typeof sequelize.close === 'function') {
      await sequelize.close();
    }
  }
}

verificarKanbanTags();
