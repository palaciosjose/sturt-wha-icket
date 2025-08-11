import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { removeWbot, restartWbot } from "../libs/wbot";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";

import CreateWhatsAppService from "../services/WhatsappService/CreateWhatsAppService";
import DeleteWhatsAppService from "../services/WhatsappService/DeleteWhatsAppService";
import ListWhatsAppsService from "../services/WhatsappService/ListWhatsAppsService";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";
import GetWhatsAppInfoService from "../services/WhatsappService/GetWhatsAppInfoService";
import AppError from "../errors/AppError";
import ReassignTicketsService from "../services/WhatsappService/ReassignTicketsService";
import Ticket from "../models/Ticket";

interface WhatsappData {
  name: string;
  queueIds: number[];
  companyId: number;
  greetingMessage?: string;
  complationMessage?: string;
  outOfHoursMessage?: string;
  ratingMessage?: string;
  status?: string;
  isDefault?: boolean;
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

interface QueryParams {
  session?: number | string;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { session } = req.query as QueryParams;
  const whatsapps = await ListWhatsAppsService({ companyId, session });

  return res.status(200).json(whatsapps);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    name,
    status,
    isDefault,
    greetingMessage,
    complationMessage,
    outOfHoursMessage,
    queueIds,
    token,
    type,
    //timeSendQueue,
    //sendIdQueue,
	transferQueueId,
	timeToTransfer,
    promptId,
    maxUseBotQueues,
    timeUseBotQueues,
    expiresTicket,
    expiresInactiveMessage
  }: WhatsappData = req.body;
  const { companyId } = req.user;

  // ✅ LIMPIAR Y VALIDAR queueIds
  const cleanQueueIds = Array.isArray(queueIds) 
    ? queueIds
        .flat() // ✅ APLANAR ARRAYS ANIDADOS
        .filter(id => id && id !== null && id !== undefined && !isNaN(Number(id)))
    : [];

  // ✅ LIMPIAR transferQueueId (convertir '' a null)
  const cleanTransferQueueId = transferQueueId && transferQueueId !== '' && transferQueueId !== 0 ? Number(transferQueueId) : null;

  console.log("🔄 DATOS RECIBIDOS:");
  console.log("  - queueIds original:", queueIds);
  console.log("  - queueIds limpio:", cleanQueueIds);
  console.log("  - transferQueueId original:", transferQueueId);
  console.log("  - transferQueueId limpio:", cleanTransferQueueId);
  console.log("  - token:", token);
  console.log("  - name:", name);
  console.log("  - status:", status);

  const { whatsapp, oldDefaultWhatsapp } = await CreateWhatsAppService({
    name,
    status,
    isDefault,
    greetingMessage,
    complationMessage,
    outOfHoursMessage,
    queueIds: cleanQueueIds, // ✅ USAR ARRAY LIMPIO
    companyId,
    token,
    type,
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

  StartWhatsAppSession(whatsapp, companyId);

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

  return res.status(200).json(whatsapp);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  const { session } = req.query as QueryParams;

  const whatsapp = await ShowWhatsAppService(whatsappId, companyId, session);

  return res.status(200).json(whatsapp);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsappData = req.body;
  const { companyId } = req.user;

  console.log("🔄 ACTUALIZANDO WHATSAPP:", whatsappId);
  console.log("📋 DATOS RECIBIDOS:", whatsappData);

  const { whatsapp, oldDefaultWhatsapp } = await UpdateWhatsAppService({
    whatsappData,
    whatsappId,
    companyId
  });

  console.log("✅ WHATSAPP ACTUALIZADO:", whatsapp.id);
  console.log("📋 DEPARTAMENTOS ACTUALES:", whatsapp.queues?.map(q => q.name));

  const io = getIO();
  
  // ✅ EMITIR EVENTO DE ACTUALIZACIÓN CON DATOS COMPLETOS
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

  // ✅ EMITIR EVENTO DE REFRESCO GENERAL
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
    action: "refresh",
    whatsappId: whatsapp.id
  });

  return res.status(200).json(whatsapp);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;

  await ShowWhatsAppService(whatsappId, companyId);

  await DeleteWhatsAppService(whatsappId);
  removeWbot(+whatsappId);

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
    action: "delete",
    whatsappId: +whatsappId
  });

  return res.status(200).json({ message: "Whatsapp deleted." });
};


export const restart = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, profile } = req.user;

  if (profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await restartWbot(companyId);

  return res.status(200).json({ message: "Whatsapp restart." });
};

export const getInfo = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;

  try {
    const whatsappInfo = await GetWhatsAppInfoService(parseInt(whatsappId));
    
    // Verificar que pertenece a la empresa
    const whatsapp = await ShowWhatsAppService(whatsappId, companyId);
    if (whatsapp.companyId !== companyId) {
      throw new AppError("No tienes permisos para acceder a esta conexión", 403);
    }

    return res.status(200).json(whatsappInfo);
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};

export const reassignTickets = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { oldWhatsappId, newWhatsappId } = req.body;
  const { companyId } = req.user;

  try {
    const result = await ReassignTicketsService({
      oldWhatsappId,
      newWhatsappId,
      companyId
    });

    return res.status(200).json({
      message: "Tickets reasignados exitosamente",
      reassignedCount: result.reassignedCount,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error reasignando tickets" });
  }
};

export const deleteOrphanTickets = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;

  try {
    // Eliminar tickets huérfanos (sin conexión válida)
    const deletedCount = await Ticket.destroy({
      where: { 
        whatsappId: parseInt(whatsappId), 
        companyId 
      }
    });

    return res.status(200).json({
      message: "Tickets huérfanos eliminados",
      deletedCount
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error eliminando tickets" });
  }
};