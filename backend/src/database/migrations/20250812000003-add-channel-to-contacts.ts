import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Contacts", "channel", {
      type: "VARCHAR(255)",
      defaultValue: "whatsapp",
      allowNull: false
    });

    // ✅ ACTUALIZAR REGISTROS EXISTENTES
    await queryInterface.sequelize.query(`
      UPDATE Contacts
      SET channel = 'whatsapp'
      WHERE channel IS NULL
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Contacts", "channel");
  }
};
