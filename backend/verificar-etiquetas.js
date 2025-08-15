const sequelize = require("./dist/database").default;
const Tag = require("./dist/models/Tag").default;

async function verificarEtiquetas() {
  try {
    console.log("🔍 VERIFICANDO ETIQUETAS DE EMPRESA 2");
    console.log("=" .repeat(50));

    const etiquetas = await Tag.findAll({
      where: { companyId: 2 },
      attributes: ['id', 'name', 'color'],
      order: [['id', 'ASC']]
    });

    console.log(`✅ Total de etiquetas encontradas: ${etiquetas.length}\n`);
    
    etiquetas.forEach(t => {
      console.log(`   ${t.id}. ${t.name} (Color: ${t.color})`);
    });

    // Buscar etiquetas que contengan "compra" o "realizada"
    console.log("\n🔍 BUSCANDO ETIQUETAS RELACIONADAS CON 'COMPRA':");
    const etiquetasCompra = etiquetas.filter(t => 
      t.name.toLowerCase().includes('compra') || 
      t.name.toLowerCase().includes('realizada')
    );

    if (etiquetasCompra.length > 0) {
      etiquetasCompra.forEach(t => {
        console.log(`   ✅ Encontrada: ID ${t.id} - "${t.name}"`);
      });
    } else {
      console.log("   ❌ No se encontraron etiquetas con 'compra' o 'realizada'");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    if (sequelize && typeof sequelize.close === 'function') {
      await sequelize.close();
    }
  }
}

verificarEtiquetas();
