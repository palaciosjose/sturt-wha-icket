import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Schedules", "intervalUnit", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await queryInterface.addColumn("Schedules", "intervalValue", {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn("Schedules", "repeatCount", {
      type: DataTypes.INTEGER,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Schedules", "intervalUnit");
    await queryInterface.removeColumn("Schedules", "intervalValue");
    await queryInterface.removeColumn("Schedules", "repeatCount");
  }
};
