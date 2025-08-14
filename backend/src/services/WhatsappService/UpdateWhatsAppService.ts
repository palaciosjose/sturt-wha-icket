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
  type?: string;
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
    type,
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
  console.log("  - queueIds:", queueIds, "safeQueueIds:", safeQueueIds);
  console.log("  - promptId:", promptId);
  console.log("  - transferQueueId original:", transferQueueId);
  console.log("  - transferQueueId limpio:", cleanTransferQueueId);

  try {
    await schema.validate({ name, status, isDefault });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  // ✅ VALIDACIÓN MEJORADA: Solo requerir greetingMessage si hay múltiples departamentos
  if (safeQueueIds.length > 1 && !greetingMessage) {
    throw new AppError("ERR_WAPP_GREETING_REQUIRED");
  }

  // ✅ VALIDACIÓN MEJORADA: Si solo hay prompt (sin departamentos), no requerir greetingMessage
  if (safeQueueIds.length === 0 && promptId) {
    console.log("✅ CONFIGURACIÓN SOLO CON PROMPT - No se requiere greetingMessage");
  }

  // ✅ ELIMINAR VALIDACIÓN OBLIGATORIA DE DEPARTAMENTOS O PROMPTS
  // Una conexión puede existir solo con nombre y estatus
  // if (safeQueueIds.length === 0 && !promptId) {
  //   throw new AppError("ERR_WAPP_QUEUE_OR_PROMPT_REQUIRED");
  // }

  // ✅ VALIDACIÓN INTELIGENTE: Evitar transferencia por tiempo al mismo departamento
  if (timeToTransfer && timeToTransfer > 0 && cleanTransferQueueId && safeQueueIds.length > 0) {
    const isTransferringToSameQueue = safeQueueIds.includes(cleanTransferQueueId);
    
    if (isTransferringToSameQueue) {
      const conflictingQueue = safeQueueIds.find(id => id === cleanTransferQueueId);
      console.log("❌ CONFIGURACIÓN INCORRECTA DETECTADA:");
      console.log("  - Departamento por defecto:", safeQueueIds);
      console.log("  - Departamento destino:", cleanTransferQueueId);
      console.log("  - Tiempo configurado:", timeToTransfer, "minutos");
      console.log("  - Error: Transferencia al mismo departamento");
      
      throw new AppError(
        `ERR_WAPP_INVALID_TRANSFER_CONFIG: No puedes configurar transferencia por tiempo al mismo departamento que ya está asignado por defecto. ` +
        `Departamento por defecto: ${safeQueueIds.join(', ')} | Departamento destino: ${cleanTransferQueueId}`
      );
    }
    
    console.log("✅ CONFIGURACIÓN DE TRANSFERENCIA VÁLIDA:");
    console.log("  - Departamento por defecto:", safeQueueIds);
    console.log("  - Departamento destino:", cleanTransferQueueId);
    console.log("  - Tiempo configurado:", timeToTransfer, "minutos");
  }

  // ✅ VALIDACIÓN: Limpiar timeToTransfer si no hay departamento destino
  let cleanTimeToTransfer = timeToTransfer;
  if (!cleanTransferQueueId || cleanTransferQueueId === null) {
    console.log("🔄 LIMPIANDO timeToTransfer - No hay departamento destino seleccionado");
    cleanTimeToTransfer = null;
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
  
  // ✅ SOLO RESETEAR SI HAY CAMBIO DE DEPARTAMENTOS Y AMBOS TIENEN DEPARTAMENTOS
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
  } else if (oldQueueIds.length > 0 && newQueueIds.length === 0 && promptId) {
    // ✅ CASO ESPECIAL: Cambio de departamentos a solo prompt
    console.log("🔄 CAMBIO DE DEPARTAMENTOS A SOLO PROMPT - RESETEANDO TICKETS:");
    
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
    
    console.log("✅ TICKETS RESETEADOS (solo prompt):", resetResult[0], "tickets afectados");
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
    type,
    //timeSendQueue,
    //sendIdQueue,
    transferQueueId: cleanTransferQueueId, // ✅ USAR VALOR LIMPIO
    timeToTransfer: cleanTimeToTransfer, // ✅ USAR VALOR LIMPIO
    promptId,
    maxUseBotQueues,
    timeUseBotQueues,
    expiresTicket,
    expiresInactiveMessage
  });

  // ✅ ASOCIAR DEPARTAMENTOS Y RECARGAR DATOS
  if (safeQueueIds.length > 0) {
    console.log("🔄 ASOCIANDO DEPARTAMENTOS:", safeQueueIds);
    await AssociateWhatsappQueue(whatsapp, safeQueueIds);
  } else {
    console.log("✅ NO HAY DEPARTAMENTOS PARA ASOCIAR - Solo prompt configurado");
    // ✅ LIMPIAR ASOCIACIONES EXISTENTES SI NO HAY DEPARTAMENTOS
    await AssociateWhatsappQueue(whatsapp, []);
  }
  
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
  console.log("  - Departamentos:", whatsapp.queues?.map(q => q.name) || "NINGUNO");
  console.log("  - Prompt ID:", whatsapp.promptId);
  console.log("  - Configuración:", safeQueueIds.length > 0 ? "CON DEPARTAMENTOS" : "SOLO CON PROMPT");

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
