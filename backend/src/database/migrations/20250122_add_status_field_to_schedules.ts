import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("Schedules", "status", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "PENDENTE"
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("Schedules", "status");
  }
}; 