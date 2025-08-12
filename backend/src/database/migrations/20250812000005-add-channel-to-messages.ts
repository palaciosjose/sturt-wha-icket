import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Messages", "channel", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "whatsapp"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Messages", "channel");
  }
};
