import ShowQueueService from "./ShowQueueService";
import { getIO } from "../../libs/socket";

const DeleteQueueService = async (
  queueId: number | string,
  companyId: number
): Promise<void> => {
  const queue = await ShowQueueService(queueId, companyId);

  // ✅ EMITIR EVENTO DE SOCKET PARA ELIMINACIÓN DE DEPARTAMENTO
  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-queue`, {
    action: "delete",
    queueId: queue.id
  });

  await queue.destroy();
};

export default DeleteQueueService;
