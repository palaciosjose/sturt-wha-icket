import QueueOption from "../../models/QueueOption";

interface QueueOptionData {
  queueId: string;
  title: string;
  option: string;
  message?: string;
  parentId?: string;
  transferQueueId?: number;
}

const CreateService = async (queueOptionData: QueueOptionData): Promise<QueueOption> => {
  // console.log("🔍 CreateService - Datos recibidos:", queueOptionData);
  // console.log("🔍 CreateService - queueId:", queueOptionData.queueId);
  // console.log("🔍 CreateService - Tipo de queueId:", typeof queueOptionData.queueId);
  
  const queueOption = await QueueOption.create(queueOptionData);
  // console.log("✅ CreateService - Opción creada:", queueOption.toJSON());
  
  return queueOption;
};

export default CreateService;
