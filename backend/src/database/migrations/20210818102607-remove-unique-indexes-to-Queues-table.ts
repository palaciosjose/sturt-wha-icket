import { QueryInterface } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      // queryInterface.removeConstraint("Queues", "Queues_color_key"), // Comentado: en MySQL la restricción no existe
      // queryInterface.removeConstraint("Queues", "Queues_name_key"), // Comentado: en MySQL la restricción no existe
      // queryInterface.removeIndex("Queues", "Queues_color_key"), // Comentado: en MySQL el índice no existe
      // queryInterface.removeIndex("Queues", "Queues_name_key"), // Comentado: en MySQL el índice no existe
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      // queryInterface.addConstraint("Queues", ["color"], {
      //   type: "unique",
      //   name: "Queues_color_key",
      // }),
      // queryInterface.addConstraint("Queues", ["name"], {
      //   type: "unique",
      //   name: "Queues_name_key",
      // })
    ]);
  }
};
