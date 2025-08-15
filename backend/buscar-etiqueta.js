const sequelize = require("./dist/database").default;
const Tag = require("./dist/models/Tag").default;

async function buscarEtiqueta() {
  try {
    console.log("🔍 BUSCANDO ETIQUETA ESPECÍFICA");
    console.log("=" .repeat(40));

    // Buscar etiqueta por ID 4 (que mencionó el usuario)
    const etiqueta = await Tag.findOne({
      where: { 
        id: 4,
        companyId: 2 
      }
    });

    if (etiqueta) {
      console.log(`✅ Etiqueta ID 4 encontrada:`);
      console.log(`   - Nombre: "${etiqueta.name}"`);
      console.log(`   - Color: ${etiqueta.color}`);
      console.log(`   - Company ID: ${etiqueta.companyId}`);
    } else {
      console.log("❌ No se encontró etiqueta con ID 4");
    }

    // También buscar por nombre similar
    console.log("\n🔍 BUSCANDO ETIQUETAS SIMILARES:");
    const etiquetasSimilares = await Tag.findAll({
      where: { 
        companyId: 2,
        name: {
          [require('sequelize').Op.like]: '%compra%'
        }
      }
    });

    if (etiquetasSimilares.length > 0) {
      console.log("✅ Etiquetas con 'compra' encontradas:");
      etiquetasSimilares.forEach(t => {
        console.log(`   - ID: ${t.id}, Nombre: "${t.name}"`);
      });
    } else {
      console.log("❌ No se encontraron etiquetas con 'compra'");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    if (sequelize && typeof sequelize.close === 'function') {
      await sequelize.close();
    }
  }
}

buscarEtiqueta();
