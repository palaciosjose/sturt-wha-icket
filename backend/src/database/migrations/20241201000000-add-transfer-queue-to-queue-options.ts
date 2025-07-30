import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("QueueOptions", "transferQueueId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Queues", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("QueueOptions", "transferQueueId");
  }
}; 