import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // ✅ ELIMINAR LA RESTRICCIÓN FK PROBLEMÁTICA
    // Esta FK impedía que tickets de NotificaMe (sin whatsappId) se crearan correctamente
    await queryInterface.removeConstraint(
      "TicketTraking",
      "TicketTraking_ibfk_3"
    );
  },

  down: async (queryInterface: QueryInterface) => {
    // 🔄 REVERTIR: Recrear la restricción FK (para rollback)
    await queryInterface.addConstraint("TicketTraking", "TicketTraking_ibfk_3", {
      fields: ["whatsappId"],
      type: "foreign key",
      references: {
        table: "Whatsapps",
        field: "id"
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE"
    });
  }
};
