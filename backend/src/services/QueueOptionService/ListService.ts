import { WhereOptions } from "sequelize/types";
import QueueOption from "../../models/QueueOption";
import Queue from "../../models/Queue";

type QueueOptionFilter = {
  queueId: string | number;
  queueOptionId: string | number;
  parentId: string | number | boolean;
};

const ListService = async ({ queueId, queueOptionId, parentId }: QueueOptionFilter): Promise<QueueOption[]> => {
  console.log("🔍 ListService - Parámetros recibidos:", { queueId, queueOptionId, parentId });

  const whereOptions: WhereOptions = {};

  if (queueId) {
    whereOptions.queueId = queueId;
    console.log("🔍 ListService - Agregando queueId al where:", queueId);
  }

  if (queueOptionId) {
    whereOptions.id = queueOptionId;
  }

  if (parentId == -1) {
    whereOptions.parentId = null;
    console.log("🔍 ListService - Agregando parentId null al where");
  }

  if (typeof parentId === 'number' && parentId > 0) {
    whereOptions.parentId = parentId;
  }

  console.log("🔍 ListService - whereOptions final:", whereOptions);

  const queueOptions = await QueueOption.findAll({
    where: whereOptions,
    include: [
      { model: Queue, as: 'queue' },
      { model: Queue, as: 'transferQueue', foreignKey: 'transferQueueId' }
    ],
    order: [["id", "ASC"]]
  });

  console.log("🔍 ListService - Opciones encontradas:", queueOptions.length);
  console.log("🔍 ListService - Opciones:", queueOptions.map(opt => ({ id: opt.id, title: opt.title, queueId: opt.queueId })));

  return queueOptions;
};

export default ListService;
