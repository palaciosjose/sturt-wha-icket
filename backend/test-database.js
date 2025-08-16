console.log("🔍 Probando conexión a base de datos...");

try {
  const db = require("./dist/database");
  console.log("✅ Base de datos importada correctamente");
  console.log("Estructura:", Object.keys(db));
  
  if (db.Tag) {
    console.log("✅ Modelo Tag encontrado");
  } else {
    console.log("❌ Modelo Tag NO encontrado");
  }
  
  if (db.Ticket) {
    console.log("✅ Modelo Ticket encontrado");
  } else {
    console.log("❌ Modelo Ticket NO encontrado");
  }
  
  if (db.sequelize) {
    console.log("✅ Sequelize encontrado");
  } else {
    console.log("❌ Sequelize NO encontrado");
  }
  
} catch (error) {
  console.error("❌ Error importando base de datos:", error.message);
}
