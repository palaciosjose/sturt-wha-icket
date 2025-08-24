import * as Yup from "yup";
import moment from "moment";

import AppError from "../../errors/AppError";
import Schedule from "../../models/Schedule";

interface Request {
  body: string;
  sendAt: string;
  contactId: number | string;
  companyId: number | string;
  userId?: number | string;
  whatsappId?: number | string;
  intervalUnit?: string;
  intervalValue?: number;
  repeatCount?: number;
  useReminderSystem?: boolean;
}

// ✅ FUNCIONES DE VALIDACIÓN PARA EL BACKEND
const validateScheduleDateTime = (sendAt: string) => {
  if (!sendAt) {
    throw new AppError("Fecha/hora es obligatoria");
  }

  const now = moment();
  const selectedTime = moment(sendAt);

  // ✅ VALIDACIÓN 1: FECHA/HORA VÁLIDA
  if (!selectedTime.isValid()) {
    throw new AppError("Fecha/hora inválida");
  }

  // ✅ VALIDACIÓN 2: FECHA/HORA PASADA (solo para fechas pasadas, no futuras)
  if (selectedTime.isBefore(now, 'minute')) {
    throw new AppError(`No se puede agendar para una fecha/hora pasada. Hora actual: ${now.format('DD/MM/YYYY HH:mm')}`);
  }

  // ✅ VALIDACIÓN 3: TIEMPO MÍNIMO (5 minutos en lugar de 15)
  const timeDiff = selectedTime.diff(now, 'minutes');
  if (timeDiff < 5) {
    throw new AppError(`El tiempo mínimo para agendar es 5 minutos. Hora más temprana permitida: ${now.add(5, 'minutes').format('DD/MM/YYYY HH:mm')}`);
  }

  // ✅ VALIDACIÓN 4: TIEMPO MÁXIMO (1 año)
  if (timeDiff > 525600) { // 365 días * 24 horas * 60 minutos
    throw new AppError("No se puede agendar para más de 1 año en el futuro");
  }

  // ✅ VALIDACIÓN 5: FECHA INVÁLIDA (30 de febrero, 31 de abril, etc.)
  const day = selectedTime.date();
  const month = selectedTime.month() + 1;
  const year = selectedTime.year();
  
  // Verificar fechas inválidas específicas
  if (month === 2 && day > 29) {
    throw new AppError("Febrero no puede tener más de 29 días");
  }
  if (month === 2 && day === 29 && !moment([year]).isLeapYear()) {
    throw new AppError("29 de febrero solo existe en años bisiestos");
  }
  if ([4, 6, 9, 11].includes(month) && day > 30) {
    throw new AppError(`El mes ${month} no puede tener más de 30 días`);
  }
};

const validateMessage = (body: string) => {
  if (!body || body.trim().length === 0) {
    throw new AppError("El mensaje es obligatorio");
  }
  
  if (body.trim().length < 3) {
    throw new AppError("El mensaje debe tener al menos 3 caracteres");
  }
  
  // Verificar si solo tiene espacios o caracteres especiales
  const cleanMessage = body.trim().replace(/[^\w\s]/g, '').replace(/\s+/g, '');
  if (cleanMessage.length < 2) {
    throw new AppError("El mensaje debe contener al menos 2 caracteres válidos");
  }
};

const CreateService = async ({
  body,
  sendAt,
  contactId,
  companyId,
  userId,
  whatsappId,
  intervalUnit,
  intervalValue,
  repeatCount,
  useReminderSystem
}: Request): Promise<Schedule> => {
  const schema = Yup.object().shape({
    body: Yup.string().required().min(5),
    sendAt: Yup.string().required()
  });

  try {
    await schema.validate({ body, sendAt });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  // ✅ VALIDACIONES ADICIONALES
  validateScheduleDateTime(sendAt);
  validateMessage(body);

  const schedule = await Schedule.create(
    {
      body,
      sendAt,
      contactId,
      companyId,
      userId,
      whatsappId,
      status: 'PENDENTE',
      intervalUnit,
      intervalValue,
      repeatCount,
      isReminderSystem: false
    }
  );

  await schedule.reload();

  return schedule;
};

export default CreateService;
