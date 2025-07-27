import * as Yup from "yup";
import AppError from "../../errors/AppError";
import HubNotificaMe from "../../models/HubNotificaMe";
import { ValidationError } from "yup";

interface Data {
  nome: string;
  token: string;
  tipo: string;
  id: string;
}

const UpdateService = async (data: Data): Promise<HubNotificaMe> => {
  const { nome, token, tipo, id } = data;

  const schema = Yup.object().shape({
    nome: Yup.string().required("ERR_HUBNOTIFICAME_REQUIRED_NOME"),
    token: Yup.string()
      .min(6, "ERR_HUBNOTIFICAME_INVALID_TOKEN")
      .required("ERR_HUBNOTIFICAME_REQUIRED"),
    tipo: Yup.string().required("ERR_HUBNOTIFICAME_REQUIRED_TIPO")
  });

  try {
    await schema.validate(data);
  } catch (err) {
    if (err instanceof ValidationError) {
      throw new AppError(err.message);
    }
    throw err;
  }

  const record = await HubNotificaMe.findByPk(id);

  if (!record) {
    throw new AppError("ERR_NO_HUBNOTIFICAME_FOUND", 404);
  }

  await record.update({
    nome,
    token,
    tipo
  });

  return record;
};

export default UpdateService; 