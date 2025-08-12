import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // ✅ PERMITIR WHATSAPPID NULL EN LA TABLA TICKETS
    // Esto es necesario para tickets de NotificaMe (Instagram, Facebook, etc.)
    await queryInterface.changeColumn("Tickets", "whatsappId", {
      type: "INTEGER",
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    // 🔄 REVERTIR: Hacer whatsappId NOT NULL nuevamente
    await queryInterface.changeColumn("Tickets", "whatsappId", {
      type: "INTEGER",
      allowNull: false
    });
  }
};
