// ✅ SCRIPT DE PRUEBA: Simular mensaje para ver indicadores IA
require('dotenv').config();

// ✅ INICIALIZAR BASE DE DATOS
const { sequelize } = require('./dist/database');

// ✅ FUNCIÓN DE PRUEBA
async function testMensajeIA() {
  try {
    console.log('🧪 INICIANDO PRUEBA DE MENSAJE IA...');
    
    // ✅ CONECTAR A LA BASE DE DATOS
    await sequelize.authenticate();
    console.log('✅ Base de datos conectada');
    
    // ✅ IMPORTAR MODELOS
    const Ticket = require('./dist/models/Ticket').default;
    const Contact = require('./dist/models/Contact').default;
    const Whatsapp = require('./dist/models/Whatsapp').default;
    const Queue = require('./dist/models/Queue').default;
    const Prompt = require('./dist/models/Prompt').default;
    
    // ✅ BUSCAR CONEXIÓN WHATSAPP
    const whatsapp = await Whatsapp.findOne({
      include: [
        {
          model: Queue,
          as: "queues"
        }
      ]
    });
    
    if (!whatsapp) {
      console.log('❌ No hay conexión WhatsApp configurada');
      return;
    }
    
    console.log(`📱 WhatsApp encontrado: ${whatsapp.name}`);
    console.log(`📋 Departamentos: ${whatsapp.queues?.length || 0}`);
    
    // ✅ BUSCAR CONTACTO DE PRUEBA
    let contact = await Contact.findOne({
      where: { number: '5511999999999' }
    });
    
    if (!contact) {
      console.log('📞 Creando contacto de prueba...');
      contact = await Contact.create({
        name: 'Usuario Prueba IA',
        number: '5511999999999',
        companyId: 1
      });
    }
    
    // ✅ CREAR TICKET DE PRUEBA
    console.log('🎫 Creando ticket de prueba...');
    const ticket = await Ticket.create({
      contactId: contact.id,
      whatsappId: whatsapp.id,
      status: 'pending',
      companyId: 1,
      unreadMessages: 1,
      lastMessage: 'Hola, necesito ayuda con un problema técnico'
    });
    
    console.log(`✅ Ticket creado: ID ${ticket.id}`);
    console.log(`📝 Mensaje: "${ticket.lastMessage}"`);
    
    // ✅ SIMULAR ASIGNACIÓN AUTOMÁTICA
    if (whatsapp.queues && whatsapp.queues.length > 0) {
      const queue = whatsapp.queues[0];
      console.log(`🏢 Asignando a departamento: ${queue.name}`);
      
      // ✅ VERIFICAR SI TIENE PROMPT IA
      const queueWithPrompt = await Queue.findByPk(queue.id, {
        include: [{ model: Prompt, as: 'prompt' }]
      });
      
      let chatbot = false;
      let promptId = null;
      
      if (queueWithPrompt?.promptId) {
        console.log('🧠 Departamento tiene IA configurada');
        promptId = queueWithPrompt.promptId;
        chatbot = true;
      } else {
        console.log('🤖 Departamento sin IA - Activando chatbot simple');
        chatbot = true;
      }
      
      // ✅ ACTUALIZAR TICKET
      await ticket.update({
        queueId: queue.id,
        chatbot: chatbot,
        promptId: promptId,
        status: 'pending'
      });
      
      console.log('✅ Ticket actualizado con indicadores IA');
      console.log(`🤖 Chatbot: ${chatbot}`);
      console.log(`🧠 Prompt ID: ${promptId}`);
      
      // ✅ MOSTRAR TICKET FINAL
      const ticketFinal = await Ticket.findByPk(ticket.id, {
        include: [
          { model: Contact, as: 'contact' },
          { model: Queue, as: 'queue' },
          { model: Prompt, as: 'prompt' }
        ]
      });
      
      console.log('\n📊 TICKET FINAL:');
      console.log(`  - ID: ${ticketFinal.id}`);
      console.log(`  - Contacto: ${ticketFinal.contact.name}`);
      console.log(`  - Departamento: ${ticketFinal.queue?.name || 'Sin asignar'}`);
      console.log(`  - Chatbot: ${ticketFinal.chatbot}`);
      console.log(`  - Prompt ID: ${ticketFinal.promptId}`);
      console.log(`  - Status: ${ticketFinal.status}`);
      
      console.log('\n🎯 INDICADORES QUE DEBERÍAN APARECER EN LA INTERFAZ:');
      if (ticketFinal.chatbot) {
        console.log('  🤖 Icono Android (azul) - Chatbot activo');
      }
      if (ticketFinal.promptId) {
        console.log('  😊 Icono Emoji (verde) - IA inteligente');
      }
      
    } else {
      console.log('❌ No hay departamentos configurados');
    }
    
    console.log('\n✅ PRUEBA COMPLETADA - Revisa la interfaz web para ver los indicadores');
    
  } catch (error) {
    console.error('❌ ERROR EN PRUEBA:', error);
  } finally {
    await sequelize.close();
  }
}

// ✅ EJECUTAR PRUEBA
testMensajeIA(); 