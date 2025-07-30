import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.sequelize.query('CREATE INDEX idx_sched_company_id ON Schedules (companyId)').catch(() => {}),
      queryInterface.sequelize.query('CREATE INDEX idx_cont_company_id ON Contacts (companyId)').catch(() => {}),
      queryInterface.sequelize.query('CREATE INDEX idx_tg_company_id ON Tags (companyId)').catch(() => {}),
      queryInterface.sequelize.query('CREATE INDEX idx_ms_company_id_ticket_id ON Messages (companyId, ticketId)').catch(() => {}),
      queryInterface.sequelize.query('CREATE INDEX idx_cpsh_campaign_id ON CampaignShipping (campaignId)').catch(() => {}),
      queryInterface.sequelize.query('CREATE INDEX idx_ctli_contact_list_id ON ContactListItems (contactListId)').catch(() => {})
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeIndex("Schedules", "idx_sched_company_id"),
      queryInterface.removeIndex("Contacts", "idx_cont_company_id"),
      queryInterface.removeIndex("Tags", "idx_tg_company_id"),
      queryInterface.removeIndex("Messages", "idx_ms_company_id_ticket_id"),
      queryInterface.removeIndex("CampaignShipping", "idx_cpsh_campaign_id"),
      queryInterface.removeIndex("ContactListItems", "idx_ctli_contact_list_id")
    ]);
  }
};
