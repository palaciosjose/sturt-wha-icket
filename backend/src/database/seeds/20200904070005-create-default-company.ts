import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // 1. Primero insertar el Plan
    await queryInterface.sequelize.query(`
      INSERT INTO Plans (name, users, connections, queues, value, createdAt, updatedAt)
      VALUES ('Plan Básico', 10, 10, 10, 30, NOW(), NOW())
    `);

    // 2. Obtener el ID del plan recién insertado
    const [plans] = await queryInterface.sequelize.query(
      "SELECT id FROM Plans WHERE name = 'Plan Básico' ORDER BY id DESC LIMIT 1"
    ) as [any[], unknown];
    
    if (!plans || plans.length === 0) {
      throw new Error("No se pudo crear el plan");
    }
    
    const planId = plans[0].id;
    console.log(`Plan creado con ID: ${planId}`);

    // 3. Insertar la Company usando el ID del plan
    await queryInterface.sequelize.query(`
      INSERT INTO Companies (name, planId, dueDate, createdAt, updatedAt)
      VALUES ('Empresa Demo', ${planId}, '2093-03-14 04:00:00', NOW(), NOW())
    `);

    // 4. Obtener el ID de la company recién insertada
    const [companies] = await queryInterface.sequelize.query(
      "SELECT id FROM Companies WHERE name = 'Empresa Demo' ORDER BY id DESC LIMIT 1"
    ) as [any[], unknown];
    
    if (!companies || companies.length === 0) {
      throw new Error("No se pudo crear la empresa");
    }
    
    const companyId = companies[0].id;
    console.log(`Empresa creada con ID: ${companyId}`);

    // 5. Insertar el usuario admin usando el ID de la company
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash("123456", 8);
    
    await queryInterface.sequelize.query(`
      INSERT INTO Users (name, email, profile, passwordHash, companyId, createdAt, updatedAt, super)
      VALUES ('Admin', 'admin@admin.com', 'admin', '${passwordHash}', ${companyId}, NOW(), NOW(), true)
    `);

    console.log("Seeder completado exitosamente");
  },

  down: async (queryInterface: QueryInterface) => {
    // Limpiar en orden inverso
    await queryInterface.sequelize.query("DELETE FROM Users WHERE email = 'admin@admin.com'");
    await queryInterface.sequelize.query("DELETE FROM Companies WHERE name = 'Empresa Demo'");
    await queryInterface.sequelize.query("DELETE FROM Plans WHERE name = 'Plan Básico'");
  }
};
