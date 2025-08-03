import { QueryInterface, DataTypes } from "sequelize";

interface AdminUser {
  id: number;
}

interface Queue {
  id: number;
}

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Obtener el ID del usuario Admin
    const [adminUser] = await queryInterface.sequelize.query(
      "SELECT id FROM Users WHERE name = 'Admin' AND profile = 'admin' LIMIT 1"
    ) as [AdminUser[], unknown];

    if (adminUser[0]) {
      const adminId = adminUser[0].id;
      
      // Obtener todas las colas
      const [queues] = await queryInterface.sequelize.query(
        "SELECT id FROM Queues"
      ) as [Queue[], unknown];
      
      // Asignar todas las colas al Admin
      for (const queue of queues) {
        await queryInterface.sequelize.query(
          `INSERT IGNORE INTO UserQueues (userId, queueId, createdAt, updatedAt) 
           VALUES (?, ?, NOW(), NOW())`,
          {
            replacements: [adminId, queue.id]
          }
        );
      }
      
      console.log(`✅ Admin asignado a ${queues.length} colas`);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    // Obtener el ID del usuario Admin
    const [adminUser] = await queryInterface.sequelize.query(
      "SELECT id FROM Users WHERE name = 'Admin' AND profile = 'admin' LIMIT 1"
    ) as [AdminUser[], unknown];

    if (adminUser[0]) {
      const adminId = adminUser[0].id;
      
      // Remover todas las asignaciones del Admin
      await queryInterface.sequelize.query(
        "DELETE FROM UserQueues WHERE userId = ?",
        {
          replacements: [adminId]
        }
      );
      
      console.log("✅ Asignaciones del Admin removidas");
    }
  }
}; 