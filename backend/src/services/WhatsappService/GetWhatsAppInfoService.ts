import { getWbot } from "../../libs/wbot";
import Whatsapp from "../../models/Whatsapp";
import { logger } from "../../utils/logger";

interface WhatsAppInfo {
  id: number;
  name: string;
  number: string;
  avatar: string;
  instance: string;
  token: string;
  status: string;
}

const GetWhatsAppInfoService = async (whatsappId: number): Promise<WhatsAppInfo> => {
  try {
    // Obtener datos de la base de datos
    const whatsapp = await Whatsapp.findByPk(whatsappId);
    
    if (!whatsapp) {
      throw new Error("WhatsApp no encontrado");
    }

    let avatar = whatsapp.avatar;
    let instance = whatsapp.instance;
    let number = whatsapp.number;

    // Si no tenemos avatar o instance, intentar obtenerlos de Baileys
    if (!avatar || !instance || !number) {
      try {
        const wbot = getWbot(whatsappId);
        
        if (wbot && wbot.user) {
          // Obtener número del usuario conectado
          if (!number && wbot.user.id) {
            number = wbot.user.id.replace('@s.whatsapp.net', '');
          }

          // Obtener avatar del usuario conectado
          if (!avatar && number) {
            try {
              avatar = await wbot.profilePictureUrl(`${number}@s.whatsapp.net`);
            } catch (error) {
              logger.info(`No se pudo obtener avatar para ${number}: ${error.message}`);
              // Usar placeholder en lugar de Facebook Graph API
              avatar = `${process.env.FRONTEND_URL}/nopicture.png`;
            }
          }

          // Obtener instance de las creds
          if (!instance && wbot.user.id) {
            instance = wbot.user.id;
          }
        }
      } catch (error) {
        logger.error(`Error obteniendo datos de Baileys: ${error.message}`);
      }
    }

    // Actualizar la base de datos con los datos obtenidos
    if (avatar !== whatsapp.avatar || instance !== whatsapp.instance || number !== whatsapp.number) {
      await whatsapp.update({
        avatar: avatar || whatsapp.avatar,
        instance: instance || whatsapp.instance,
        number: number || whatsapp.number
      });
    }

    return {
      id: whatsapp.id,
      name: whatsapp.name,
      number: number || whatsapp.number || "",
      avatar: avatar || whatsapp.avatar || "",
      instance: instance || whatsapp.instance || "",
      token: whatsapp.token || "",
      status: whatsapp.status
    };

  } catch (error) {
    logger.error(`Error en GetWhatsAppInfoService: ${error.message}`);
    throw error;
  }
};

export default GetWhatsAppInfoService; 