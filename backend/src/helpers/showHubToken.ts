import Setting from "../models/Setting";

export const showHubToken = async (companyId: number): Promise<string | any> => {
  const notificameHubToken = await Setting.findOne({
    where: {
      key: "hubToken",
      companyId: companyId
    }
  });

  if (!notificameHubToken) {
    console.error('showHubToken: No se encontró el token en la base de datos para companyId:', companyId);
    throw new Error("Error: Token del Notificame Hub no encontrado.");
  }

  if(notificameHubToken) {
    console.log('showHubToken: Valor obtenido de hubToken para companyId', companyId, ':', notificameHubToken.value);
    return notificameHubToken.value;
  }
};
