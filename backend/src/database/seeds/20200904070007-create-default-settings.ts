import { QueryInterface } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        // Obtener el ID de la empresa consultando la base de datos
        const [companies] = await queryInterface.sequelize.query(
            "SELECT id FROM Companies WHERE name = 'Empresa Demo' ORDER BY id DESC LIMIT 1"
        ) as [any[], unknown];
        
        if (!companies || companies.length === 0) {
            throw new Error("No se encontró la empresa para crear las configuraciones");
        }
        
        const companyId = companies[0].id;
        console.log(`Creando configuraciones para empresa con ID: ${companyId}`);

        return queryInterface.bulkInsert(
            "Settings",
            [
                {
                    key: "chatBotType",
                    value: "text",
                    companyId: companyId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    key: "sendGreetingAccepted",
                    value: "disabled",
                    companyId: companyId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    key: "sendMsgTransfTicket",
                    value: "disabled",
                    companyId: companyId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },	
                {
                    key: "sendGreetingMessageOneQueues",
                    value: "disabled",
                    companyId: companyId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },						
                {
                    key: "userRating",
                    value: "disabled",
                    companyId: companyId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    key: "scheduleType",
                    value: "queue",
                    companyId: companyId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    key: "CheckMsgIsGroup",
                    value: "enabled",
                    companyId: companyId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    key:"call",
                    value: "disabled",
                    companyId: companyId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    key: "ipixc",
                    value: "",
                    companyId: companyId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    key: "tokenixc",
                    value: "",
                    companyId: companyId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    key: "ipmkauth",
                    value: "",
                    companyId: companyId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    key: "clientidmkauth",
                    value: "",
                    companyId: companyId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    key: "clientsecretmkauth",
                    value: "",
                    companyId: companyId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    key: "asaas",
                    value: "",
                    companyId: companyId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
            ]
        );
    },

    down: async (queryInterface: QueryInterface) => {
        return queryInterface.bulkDelete("Settings", {});
    }
};
