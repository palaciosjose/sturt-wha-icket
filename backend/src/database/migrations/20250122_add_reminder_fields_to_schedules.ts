import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("Schedules", "reminderType", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    })
    .then(() => {
      return queryInterface.addColumn("Schedules", "parentScheduleId", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
      });
    })
    .then(() => {
      return queryInterface.addColumn("Schedules", "isReminderSystem", {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
      });
    })
    .then(() => {
      return queryInterface.addColumn("Schedules", "reminderStatus", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "pending"
      });
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("Schedules", "reminderType")
    .then(() => {
      return queryInterface.removeColumn("Schedules", "parentScheduleId");
    })
    .then(() => {
      return queryInterface.removeColumn("Schedules", "isReminderSystem");
    })
    .then(() => {
      return queryInterface.removeColumn("Schedules", "reminderStatus");
    });
  }
}; 