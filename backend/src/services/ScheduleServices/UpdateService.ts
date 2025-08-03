import * as Yup from "yup";

import AppError from "../../errors/AppError";
import Schedule from "../../models/Schedule";
import ShowService from "./ShowService";

interface ScheduleData {
  id?: number;
  body?: string;
  sendAt?: string;
  sentAt?: string;
  contactId?: number;
  companyId?: number;
  ticketId?: number;
  userId?: number;
}

interface Request {
  scheduleData: ScheduleData;
  id: string | number;
  companyId: number;
}

const UpdateUserService = async ({
  scheduleData,
  id,
  companyId
}: Request): Promise<Schedule | undefined> => {
  console.log("🔍 [DEBUG] UpdateService iniciado");
  console.log("🔍 [DEBUG] id:", id);
  console.log("🔍 [DEBUG] companyId:", companyId);
  console.log("🔍 [DEBUG] scheduleData:", scheduleData);
  
  const schedule = await ShowService(id, companyId);
  console.log("🔍 [DEBUG] schedule encontrado:", schedule);

  if (schedule?.companyId !== companyId) {
    console.log("❌ [ERROR] No es posible alterar registros de otra empresa");
    throw new AppError("Não é possível alterar registros de outra empresa");
  }

  const schema = Yup.object().shape({
    body: Yup.string().min(5)
  });

  const {
    body,
    sendAt,
    sentAt,
    contactId,
    ticketId,
    userId,
  } = scheduleData;

  console.log("🔍 [DEBUG] Validando schema...");
  try {
    await schema.validate({ body });
    console.log("🔍 [DEBUG] Schema validado exitosamente");
  } catch (err: any) {
    console.error("❌ [ERROR] Error en validación de schema:", err.message);
    throw new AppError(err.message);
  }

  console.log("🔍 [DEBUG] Actualizando schedule...");
  await schedule.update({
    body,
    sendAt,
    sentAt,
    contactId,
    ticketId,
    userId,
  });

  console.log("🔍 [DEBUG] Recargando schedule...");
  await schedule.reload();
  console.log("🔍 [DEBUG] UpdateService completado exitosamente:", schedule);
  return schedule;
};

export default UpdateUserService;
