import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // ✅ AGREGAR CAMPO CHANNEL A LA TABLA TICKETS
    // Este campo permite distinguir entre diferentes canales (WhatsApp, Instagram, Facebook)
    await queryInterface.addColumn("Tickets", "channel", {
      type: "VARCHAR(255)",
      defaultValue: "whatsapp",
      allowNull: true // ✅ Permitir null inicialmente para registros existentes
    });

    // ✅ ACTUALIZAR REGISTROS EXISTENTES
    await queryInterface.sequelize.query(`
      UPDATE Tickets 
      SET channel = CASE 
        WHEN whatsappId IS NOT NULL THEN 'whatsapp'
        ELSE 'notificame'
      END
      WHERE channel IS NULL
    `);

    // ✅ HACER EL CAMPO NOT NULL DESPUÉS DE ACTUALIZAR
    await queryInterface.changeColumn("Tickets", "channel", {
      type: "VARCHAR(255)",
      defaultValue: "whatsapp",
      allowNull: false
    });
  },

  down: async (queryInterface: QueryInterface) => {
    // 🔄 REVERTIR: Eliminar el campo channel
    await queryInterface.removeColumn("Tickets", "channel");
  }
};
