import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("Whatsapps", "avatar", {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null
    }).then(() => {
      return queryInterface.addColumn("Whatsapps", "instance", {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
      });
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("Whatsapps", "avatar").then(() => {
      return queryInterface.removeColumn("Whatsapps", "instance");
    });
  }
}; 