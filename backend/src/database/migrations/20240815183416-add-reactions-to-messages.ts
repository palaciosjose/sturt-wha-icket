'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Messages', 'reactions', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: []
    });
    
    // ✅ Actualizar registros existentes que tengan reactions como null
    await queryInterface.sequelize.query(`
      UPDATE Messages 
      SET reactions = '[]' 
      WHERE reactions IS NULL
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Messages', 'reactions');
  }
};
