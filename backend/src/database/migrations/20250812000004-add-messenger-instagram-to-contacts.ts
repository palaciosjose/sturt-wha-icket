import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // ✅ AGREGAR CAMPO messengerId
    await queryInterface.addColumn("Contacts", "messengerId", {
      type: "VARCHAR(255)",
      allowNull: true,
      defaultValue: null
    });

    // ✅ AGREGAR CAMPO instagramId
    await queryInterface.addColumn("Contacts", "instagramId", {
      type: "VARCHAR(255)",
      allowNull: true,
      defaultValue: null
    });
  },

  down: async (queryInterface: QueryInterface) => {
    // ✅ REVERTIR CAMBIOS
    await queryInterface.removeColumn("Contacts", "messengerId");
    await queryInterface.removeColumn("Contacts", "instagramId");
  }
};
