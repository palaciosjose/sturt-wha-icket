import Whatsapp from "../../models/Whatsapp";
import { getWbot } from "../../libs/wbot";

interface Request {
  whatsappId: number;
  sessionData?: any;
}

interface ContactData {
  id?: string;
  pushName?: string;
  name?: string;
  notify?: string;
}

// ✅ FUNCIÓN PARA GENERAR TOKEN REAL (formato correcto)
const generateToken = (): string => {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < 22; i++) { // 22 caracteres como "7u6kf1nx8sfeisz1w5k7jg"
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

// ✅ FUNCIÓN PARA ESPERAR Y REINTENTAR
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const ExtractWhatsAppNameService = async ({
  whatsappId,
  sessionData
}: Request): Promise<void> => {
  try {
    console.log(`🔍 ANALIZANDO SESIÓN PARA WHATSAPP ID: ${whatsappId}`);

    // ✅ OBTENER DATOS DESDE LA BASE DE DATOS
    const whatsapp = await Whatsapp.findByPk(whatsappId);
    if (!whatsapp) {
      console.log(`❌ WhatsApp no encontrado en BD`);
      return;
    }

    console.log(`📋 session disponible en BD:`, !!whatsapp.session);

    let waName = null;
    let avatar = null;
    let token = null;
    let instance = null;

    // ✅ PRIORIDAD 1: OBTENER DESDE WEBSOCKET EN TIEMPO REAL (Técnica de Waziper)
    try {
      const wbot = getWbot(whatsappId);
      if (wbot && wbot.user) {
        console.log(`🔌 Websocket disponible:`, !!wbot);
        console.log(`👤 wbot.user.name:`, wbot.user.name);
        console.log(`👤 wbot.user.pushName:`, (wbot.user as any).pushName);
        console.log(`👤 wbot.user.id:`, wbot.user.id);
        
        // ✅ TÉCNICA WAZIPER: Obtener nombre del usuario conectado
        waName = wbot.user.name || (wbot.user as any).pushName || null;
        
        // ✅ TÉCNICA WAZIPER: Obtener avatar
        if (wbot.user.id) {
          try {
            avatar = await wbot.profilePictureUrl(wbot.user.id);
            console.log(`🖼️ Avatar obtenido:`, avatar);
          } catch (avatarError) {
            console.log(`❌ Error obteniendo avatar:`, avatarError.message);
            // Usar placeholder si no hay avatar
            const frontendUrl = process.env.FRONTEND_URL;
            if (!frontendUrl) {
              throw new Error('FRONTEND_URL no está configurado');
            }
            avatar = `${frontendUrl}/nopicture.png`;
            console.log(`🖼️ Usando placeholder:`, avatar);
          }
        }
        
        // ✅ CORRECCIÓN: Generar token real en formato correcto
        if (!whatsapp.token || whatsapp.token === "") {
          token = generateToken();
          console.log(`🔑 Token generado:`, token);
        } else {
          token = whatsapp.token; // Mantener token existente
          console.log(`🔑 Token existente:`, token);
        }
        
        // ✅ TÉCNICA WAZIPER: Obtener instance (ID del usuario sin sufijo)
        if (wbot.user.id) {
          instance = wbot.user.id.replace('@s.whatsapp.net', '');
          console.log(`📱 Instance obtenida:`, instance);
        }
        
        // ✅ MEJORA: Si no hay nombre, esperar y reintentar
        if (!waName && wbot.user.id) {
          console.log(`⏳ Esperando 3 segundos para que los datos se sincronicen...`);
          await sleep(3000);
          
          // Reintentar obtener nombre
          waName = wbot.user.name || (wbot.user as any).pushName || null;
          console.log(`🔄 Reintento - wbot.user.name:`, wbot.user.name);
          console.log(`🔄 Reintento - wbot.user.pushName:`, (wbot.user as any).pushName);
          
          // ✅ TÉCNICA WAZIPER: Intentar obtener de los contactos
          if (!waName) {
            try {
              console.log(`🔍 Intentando obtener contactos...`);
              const contacts = await (wbot as any).getContacts();
              console.log(`📞 Contactos obtenidos:`, contacts.length);
              
              const ownContact = contacts.find((contact: ContactData) => 
                contact.id === wbot.user.id
              );
              if (ownContact) {
                console.log(`👤 ownContact.pushName:`, (ownContact as any).pushName);
                console.log(`👤 ownContact.name:`, (ownContact as any).name);
                console.log(`👤 ownContact.notify:`, (ownContact as any).notify);
                waName = (ownContact as any).pushName || (ownContact as any).name || (ownContact as any).notify || null;
              }
            } catch (contactError) {
              console.log(`⚠️ Error obteniendo contactos:`, contactError.message);
            }
          }
          
          // ✅ ÚLTIMO INTENTO: Usar el ID como nombre si no hay nada
          if (!waName && wbot.user.id) {
            waName = wbot.user.id.replace('@s.whatsapp.net', '');
            console.log(`🆔 Usando ID como nombre:`, waName);
          }
        }
      }
    } catch (error) {
      console.log(`⚠️ No se pudo obtener websocket:`, error.message);
    }

    // ✅ PRIORIDAD 2: INTENTAR DESDE EL CAMPO SESSION DE LA BD (fallback)
    if (!waName && whatsapp.session) {
      try {
        const parsedSessionData = JSON.parse(whatsapp.session);
        console.log(`📋 sessionData parseado:`, !!parsedSessionData);

        if (parsedSessionData && parsedSessionData.user) {
          console.log(`👤 sessionData.user.name:`, parsedSessionData.user.name);
          console.log(`👤 sessionData.user.pushName:`, parsedSessionData.user.pushName);
          waName = parsedSessionData.user.name || parsedSessionData.user.pushName || null;
        }

        if (!waName && parsedSessionData && parsedSessionData.info) {
          console.log(`ℹ️ sessionData.info.pushName:`, parsedSessionData.info.pushName);
          console.log(`ℹ️ sessionData.info.name:`, parsedSessionData.info.name);
          waName = parsedSessionData.info.pushName || parsedSessionData.info.name || null;
        }

        if (!waName && parsedSessionData && parsedSessionData.store) {
          console.log(`🏪 sessionData.store disponible:`, !!parsedSessionData.store);
          const storeData = parsedSessionData.store;
          if (storeData && storeData.contacts) {
            console.log(`📞 contacts disponible:`, !!storeData.contacts);
            console.log(`📞 número de contactos:`, Object.keys(storeData.contacts).length);
            const ownContact = Object.values(storeData.contacts).find((contact: ContactData) =>
              contact.id && contact.id.endsWith('@s.whatsapp.net')
            ) as ContactData | undefined;
            if (ownContact) {
              console.log(`👤 ownContact.pushName:`, ownContact.pushName);
              console.log(`👤 ownContact.name:`, ownContact.name);
              waName = ownContact.pushName || ownContact.name || null;
            } else {
              console.log(`❌ No se encontró contacto propio`);
            }
          } else {
            console.log(`❌ No hay contacts en store`);
          }
        }
      } catch (error) {
        console.log(`❌ Error parseando session:`, error.message);
      }
    }

    console.log(`🎯 waName final:`, waName);
    console.log(`🎯 avatar final:`, avatar);
    console.log(`🎯 token final:`, token);
    console.log(`🎯 instance final:`, instance);

    // ✅ ACTUALIZAR TODOS LOS CAMPOS EN LA BASE DE DATOS
    const updateData: any = {};
    
    if (waName) {
      updateData.waName = waName;
      console.log(`💾 Actualizando waName en BD:`, waName);
    }
    
    if (avatar) {
      updateData.avatar = avatar;
      console.log(`💾 Actualizando avatar en BD:`, avatar);
    }
    
    if (token) {
      updateData.token = token;
      console.log(`💾 Actualizando token en BD:`, token);
    }
    
    if (instance) {
      updateData.instance = instance;
      console.log(`💾 Actualizando instance en BD:`, instance);
    }

    if (Object.keys(updateData).length > 0) {
      await Whatsapp.update(
        updateData,
        { where: { id: whatsappId } }
      );
      console.log(`✅ Datos actualizados exitosamente`);
    } else {
      console.log(`⚠️ No se pudo extraer ningún dato después de todos los intentos`);
    }

  } catch (error) {
    console.error("❌ Error extracting WhatsApp data:", error);
    // No lanzar error para no interrumpir el proceso de conexión
  }
};

export default ExtractWhatsAppNameService;