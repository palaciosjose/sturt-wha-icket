import Whatsapp from "../../models/Whatsapp";

const AssociateWhatsappQueue = async (
  whatsapp: Whatsapp,
  queueIds: number[]
): Promise<void> => {
  // ✅ ASEGURAR QUE queueIds SEA UN ARRAY VÁLIDO
  const safeQueueIds = Array.isArray(queueIds) ? queueIds : [];
  console.log("🔄 ASOCIANDO DEPARTAMENTOS:", safeQueueIds);
  
  await whatsapp.$set("queues", safeQueueIds);

  // ✅ RECARGAR DATOS COMPLETOS
  await whatsapp.reload({
    include: [
      {
        model: require("../../models/Queue").default,
        as: "queues",
        attributes: ["id", "name", "color", "greetingMessage", "integrationId", "promptId", "mediaPath", "mediaName"],
        include: [{ model: require("../../models/QueueOption").default, as: "options" }]
      },
      {
        model: require("../../models/Prompt").default,
        as: "prompt",
      }
    ],
    order: [["queues", "orderQueue", "ASC"]]
  });
  
  console.log("✅ WHATSAPP RECARGADO CON DEPARTAMENTOS:");
  console.log("  - Departamentos actuales:", whatsapp.queues?.map(q => `${q.id}:${q.name}`));
};

export default AssociateWhatsappQueue;
