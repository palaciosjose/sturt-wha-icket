import * as Yup from "yup";
import { Op } from "sequelize";

import AppError from "../../errors/AppError";
import Whatsapp from "../../models/Whatsapp";
import Ticket from "../../models/Ticket";
import ShowWhatsAppService from "./ShowWhatsAppService";
import AssociateWhatsappQueue from "./AssociateWhatsappQueue";
import { getIO } from "../../libs/socket";

interface WhatsappData {
  name?: string;
  status?: string;
  session?: string;
  isDefault?: boolean;
  greetingMessage?: string;
  complationMessage?: string;
  outOfHoursMessage?: string;
  ratingMessage?: string;
  queueIds?: number[];
  token?: string;
  //sendIdQueue?: number;
  //timeSendQueue?: number;
  transferQueueId?: number | string; 
  timeToTransfer?: number;    
  promptId?: number;
  maxUseBotQueues?: number;
  timeUseBotQueues?: number;
  expiresTicket?: number;
  expiresInactiveMessage?: string;

}

interface Request {
  whatsappData: WhatsappData;
  whatsappId: string;
  companyId: number;
}

interface Response {
  whatsapp: Whatsapp;
  oldDefaultWhatsapp: Whatsapp | null;
}

const UpdateWhatsAppService = async ({
  whatsappData,
  whatsappId,
  companyId
}: Request): Promise<Response> => {
  const schema = Yup.object().shape({
    name: Yup.string().min(2),
    status: Yup.string(),
    isDefault: Yup.boolean()
  });

  const {
    name,
    status,
    isDefault,
    session,
    greetingMessage,
    complationMessage,
    outOfHoursMessage,
    ratingMessage,
    queueIds = [],
    token,
    //timeSendQueue,
    //sendIdQueue = null,
    transferQueueId,	
	timeToTransfer,	
    promptId,
    maxUseBotQueues,
    timeUseBotQueues,
    expiresTicket,
    expiresInactiveMessage
  } = whatsappData;

  // ✅ ASEGURAR QUE queueIds SIEMPRE SEA UN ARRAY
  const safeQueueIds = Array.isArray(queueIds) ? queueIds : [];

  // ✅ LIMPIAR transferQueueId (convertir '' a null)
  const cleanTransferQueueId = transferQueueId && transferQueueId !== '' && transferQueueId !== 0 && transferQueueId !== '0' ? Number(transferQueueId) : null;

  console.log("🔄 DATOS RECIBIDOS EN UPDATE:");
  console.log("  - transferQueueId original:", transferQueueId);
  console.log("  - transferQueueId limpio:", cleanTransferQueueId);

  try {
    await schema.validate({ name, status, isDefault });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  if (queueIds.length > 1 && !greetingMessage) {
    throw new AppError("ERR_WAPP_GREETING_REQUIRED");
  }

  let oldDefaultWhatsapp: Whatsapp | null = null;

  if (isDefault) {
    oldDefaultWhatsapp = await Whatsapp.findOne({
      where: {
        isDefault: true,
        id: { [Op.not]: whatsappId },
        companyId
      }
    });
    if (oldDefaultWhatsapp) {
      await oldDefaultWhatsapp.update({ isDefault: false });
    }
  }

  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);

  // ✅ RESET AUTOMÁTICO: Resetear tickets cuando se cambia departamento
  const oldQueueIds = whatsapp.queues ? whatsapp.queues.map(q => q.id) : [];
  const newQueueIds = safeQueueIds;
  
  if (oldQueueIds.length > 0 && newQueueIds.length > 0) {
    const oldFirstQueue = oldQueueIds[0];
    const newFirstQueue = newQueueIds[0];
    
    if (oldFirstQueue !== newFirstQueue) {
      console.log("🔄 DEPARTAMENTO CAMBIADO - RESETEANDO TICKETS:");
      console.log("  - Departamento anterior:", oldFirstQueue);
      console.log("  - Departamento nuevo:", newFirstQueue);
      
      // Resetear todos los tickets pendientes de esta conexión
      const resetResult = await Ticket.update({
        queueId: null,
        queueOptionId: null,
        chatbot: false,
        useIntegration: false,
        promptId: null,
        integrationId: null,
        status: "pending"
      }, {
        where: { 
          whatsappId: parseInt(whatsappId),
          status: ["pending", "open"]
        }
      });
      
      console.log("✅ TICKETS RESETEADOS:", resetResult[0], "tickets afectados");
      
      // ✅ REASIGNAR TICKETS AL NUEVO DEPARTAMENTO
      if (resetResult[0] > 0 && newQueueIds.length > 0) {
        const newFirstQueue = newQueueIds[0];
        console.log("🔄 REASIGNANDO TICKETS AL NUEVO DEPARTAMENTO:", newFirstQueue);
        
        const reassignResult = await Ticket.update({
          queueId: newFirstQueue,
          status: "pending"
        }, {
          where: { 
            whatsappId: parseInt(whatsappId),
            status: "pending",
            queueId: null
          }
        });
        
        console.log("✅ TICKETS REASIGNADOS:", reassignResult[0], "tickets actualizados");
      }
    }
  }

  // ✅ ACTUALIZAR WHATSAPP CON TODOS LOS CAMPOS
  await whatsapp.update({
    name,
    status,
    session,
    greetingMessage,
    complationMessage,
    outOfHoursMessage,
    ratingMessage,
    isDefault,
    companyId,
    token,
    //timeSendQueue,
    //sendIdQueue,
    transferQueueId: cleanTransferQueueId, // ✅ USAR VALOR LIMPIO
    timeToTransfer,	
    promptId,
    maxUseBotQueues,
    timeUseBotQueues,
    expiresTicket,
    expiresInactiveMessage
  });

  // ✅ ASOCIAR DEPARTAMENTOS Y RECARGAR DATOS
  await AssociateWhatsappQueue(whatsapp, safeQueueIds);
  
  // ✅ RECARGAR WHATSAPP CON DATOS ACTUALIZADOS
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

  console.log("✅ WHATSAPP ACTUALIZADO EXITOSAMENTE:");
  console.log("  - ID:", whatsapp.id);
  console.log("  - Nombre:", whatsapp.name);
  console.log("  - Departamentos:", whatsapp.queues?.map(q => q.name));
  console.log("  - Prompt ID:", whatsapp.promptId);

  // ✅ EMITIR EVENTO DE SOCKET PARA ACTUALIZACIÓN DE WHATSAPP
  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
    action: "update",
    whatsapp
  });

  if (oldDefaultWhatsapp) {
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
      action: "update",
      whatsapp: oldDefaultWhatsapp
    });
  }

  return { whatsapp, oldDefaultWhatsapp };
};

export default UpdateWhatsAppService;
