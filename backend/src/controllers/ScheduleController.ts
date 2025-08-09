import { Request, Response } from "express";
import multer from "multer";
import { getIO } from "../libs/socket";

import AppError from "../errors/AppError";

import CreateService from "../services/ScheduleServices/CreateService";
import { CreateReminderSystemService } from "../services/ScheduleServices/ReminderSystemService";
import { CancelReminderSystemService } from "../services/ScheduleServices/CancelReminderSystemService";
import { RescheduleReminderSystemService } from "../services/ScheduleServices/RescheduleReminderSystemService";
import { CancelScheduleService } from "../services/ScheduleServices/CancelScheduleService";
import ListService from "../services/ScheduleServices/ListService";
import UpdateService from "../services/ScheduleServices/UpdateService";
import ShowService from "../services/ScheduleServices/ShowService";
import DeleteService from "../services/ScheduleServices/DeleteService";
import Schedule from "../models/Schedule";
import Ticket from "../models/Ticket";
import path from "path";
import fs from "fs";
import { head } from "lodash";

type IndexQuery = {
  searchParam?: string;
  contactId?: number | string;
  userId?: number | string;
  pageNumber?: string | number;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { contactId, userId, pageNumber, searchParam } = req.query as IndexQuery;
  const { companyId } = req.user;

  const { schedules, count, hasMore } = await ListService({
    searchParam,
    contactId,
    userId,
    pageNumber,
    companyId
  });

  return res.json({ schedules, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    body,
    sendAt,
    contactId,
    userId,
    whatsappId, // Nuevo parámetro para especificar WhatsApp
    useReminderSystem = true, // Nuevo parámetro para activar el sistema de recordatorios
    ticketId // Nuevo parámetro para obtener WhatsApp específico del ticket
  } = req.body;
  const { companyId } = req.user;

  // Buscar el ticket para obtener su whatsappId si no se proporciona explícitamente
  let finalWhatsappId: number | undefined = whatsappId;
  if (!finalWhatsappId && ticketId) {
    const ticket = await Ticket.findByPk(ticketId);
    if (ticket && ticket.companyId === companyId) {
      finalWhatsappId = ticket.whatsappId;
      
    }
  }

  let schedule;

  if (useReminderSystem) {
    // Usar el nuevo sistema de recordatorios
    schedule = await CreateReminderSystemService({
      body,
      sendAt,
      contactId,
      companyId,
      userId,
      whatsappId: finalWhatsappId
    });
  } else {
    // Usar el sistema original
    schedule = await CreateService({
      body,
      sendAt,
      contactId,
      companyId,
      userId
    });
  }

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit("schedule", {
    action: "create",
    schedule
  });

  return res.status(200).json(schedule);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { scheduleId } = req.params;
  const { companyId } = req.user;

  const schedule = await ShowService(scheduleId, companyId);

  return res.status(200).json(schedule);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  console.log("🔍 [DEBUG] ScheduleController.update iniciado");
  console.log("🔍 [DEBUG] req.params:", req.params);
  console.log("🔍 [DEBUG] req.body:", req.body);
  console.log("🔍 [DEBUG] req.user:", req.user);
  
  if (req.user.profile !== "admin") {
    console.log("❌ [ERROR] Usuario no es admin:", req.user.profile);
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { scheduleId } = req.params;
  const scheduleData = req.body;
  const { companyId, id: userId } = req.user;
  
  console.log("🔍 [DEBUG] scheduleId:", scheduleId);
  console.log("🔍 [DEBUG] scheduleData:", scheduleData);
  console.log("🔍 [DEBUG] companyId:", companyId);
  console.log("🔍 [DEBUG] userId:", userId);

  // Verificar si es un agendamiento del sistema de recordatorios y si cambió la fecha
  const originalSchedule = await Schedule.findByPk(scheduleId);
  console.log("🔍 [DEBUG] originalSchedule:", originalSchedule);
  
  if (originalSchedule && 
      originalSchedule.isReminderSystem && 
      originalSchedule.reminderType === 'start' &&
      originalSchedule.sendAt.toISOString() !== scheduleData.sendAt) {
    
    console.log("🔍 [DEBUG] Es reprogramación del sistema de recordatorios");
    // Es una reprogramación del sistema de recordatorios
    const newSchedule = await RescheduleReminderSystemService({
      scheduleId: Number(scheduleId),
      newSendAt: scheduleData.sendAt,
      companyId,
      userId: Number(userId)
    });

    console.log("🔍 [DEBUG] RescheduleReminderSystemService completado:", newSchedule);
    return res.status(200).json(newSchedule);
  }

  console.log("🔍 [DEBUG] Actualización normal de agendamiento");
  // Actualización normal
  const schedule = await UpdateService({ scheduleData, id: scheduleId, companyId });
  console.log("🔍 [DEBUG] UpdateService completado:", schedule);

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit("schedule", {
    action: "update",
    schedule
  });
  console.log("🔍 [DEBUG] Socket emit enviado");

  console.log("🔍 [DEBUG] ScheduleController.update completado exitosamente");
  return res.status(200).json(schedule);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { scheduleId } = req.params;
  const { companyId } = req.user;

  await DeleteService(scheduleId, companyId);

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit("schedule", {
    action: "delete",
    scheduleId
  });

  return res.status(200).json({ message: "Schedule deleted" });
};

export const mediaUpload = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const files = req.files as Express.Multer.File[];
  const file = head(files);

  try {
    const schedule = await Schedule.findByPk(id);
    schedule.mediaPath = file.filename;
    schedule.mediaName = file.originalname;

    await schedule.save();
    return res.send({ mensagem: "Arquivo Anexado" });
    } catch (err: any) {
      throw new AppError(err.message);
  }
};

export const deleteMedia = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;

  try {
    const schedule = await Schedule.findByPk(id);
    const filePath = path.resolve("public", schedule.mediaPath);
    const fileExists = fs.existsSync(filePath);
    if (fileExists) {
      fs.unlinkSync(filePath);
    }
    schedule.mediaPath = null;
    schedule.mediaName = null;
    await schedule.save();
    return res.send({ mensagem: "Arquivo Excluído" });
    } catch (err: any) {
      throw new AppError(err.message);
  }
};

export const cancelReminderSystem = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { scheduleId } = req.params;
  const { companyId, id: userId } = req.user;

  await CancelReminderSystemService({
    scheduleId: Number(scheduleId),
    companyId,
    userId: Number(userId)
  });

  return res.status(200).json({ message: "Reunión cancelada exitosamente" });
};

export const cancelSchedule = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { scheduleId } = req.params;
  const { companyId, id: userId } = req.user;

  await CancelScheduleService({
    scheduleId: Number(scheduleId),
    companyId,
    userId: Number(userId)
  });

  return res.status(200).json({ message: "Agendamiento cancelado exitosamente" });
};