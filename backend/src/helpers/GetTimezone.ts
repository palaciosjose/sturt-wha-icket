import Setting from "../models/Setting";

const GetTimezone = async (companyId: number): Promise<string> => {
  try {
    const setting = await Setting.findOne({
      where: { 
        key: "timezone",
        companyId 
      }
    });

    if (setting) {
      return setting.value;
    }

    // Valor por defecto si no existe la configuración
    return "America/Lima";
  } catch (error) {
    console.error("Error obteniendo zona horaria:", error);
    // Valor por defecto en caso de error
    return "America/Lima";
  }
};

export default GetTimezone; 