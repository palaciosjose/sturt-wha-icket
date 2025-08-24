import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Schedules", "contactListId", {
      type: DataTypes.INTEGER,
      references: { model: "ContactLists", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      allowNull: true
    });
    await queryInterface.addColumn("Schedules", "nestedListId", {
      type: DataTypes.INTEGER,
      references: { model: "ContactLists", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Schedules", "nestedListId");
    await queryInterface.removeColumn("Schedules", "contactListId");
  }
};
