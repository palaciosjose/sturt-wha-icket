import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.sequelize.query('DELETE FROM Settings'),
      // queryInterface.removeConstraint("Settings", "Settings_pkey"), // Comentado: en MySQL la restricción no existe
      queryInterface.sequelize.query('ALTER TABLE Settings DROP PRIMARY KEY'), // Eliminar clave primaria de 'key'
      queryInterface.addColumn("Settings", "id", {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      })
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.sequelize.query('DELETE FROM Settings'),
      queryInterface.removeColumn("Settings", "id"),
      queryInterface.addConstraint("Settings", ["key"], {
        type: "primary key",
        name: "Settings_pkey"
      })
    ]);
  }
};
