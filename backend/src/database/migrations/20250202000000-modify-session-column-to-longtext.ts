import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    return await queryInterface.sequelize.query(
      "ALTER TABLE Whatsapps MODIFY COLUMN session LONGTEXT"
    );
  },

  down: async (queryInterface: QueryInterface) => {
    return await queryInterface.sequelize.query(
      "ALTER TABLE Whatsapps MODIFY COLUMN session TEXT"
    );
  }
}; 