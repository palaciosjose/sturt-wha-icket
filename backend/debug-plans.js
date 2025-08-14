const Company = require('./dist/models/Company').default;
const Plan = require('./dist/models/Plan').default;
const { sequelize } = require('./dist/database');

async function debugPlans() {
  try {
    console.log('🔍 DIAGNÓSTICO DE PLANES Y EMPRESAS');
    console.log('=====================================');
    
    // Verificar todos los planes
    const plans = await Plan.findAll();
    console.log('\n📋 PLANES DISPONIBLES:');
    plans.forEach(plan => {
      console.log(`  - ID: ${plan.id}, Nombre: "${plan.name}", Valor: $${plan.value}`);
    });
    
    // Verificar todas las empresas
    const companies = await Company.findAll();
    console.log('\n🏢 EMPRESAS REGISTRADAS:');
    companies.forEach(company => {
      console.log(`  - ID: ${company.id}, Nombre: "${company.name}", PlanID: ${company.planId}`);
    });
    
    // Verificar empresas con planId inválido
    console.log('\n❌ EMPRESAS CON PLANID INVÁLIDO:');
    for (const company of companies) {
      try {
        const plan = await Plan.findByPk(company.planId);
        if (!plan) {
          console.log(`  - Empresa ${company.id} (${company.name}): PlanID ${company.planId} NO EXISTE`);
        }
      } catch (error) {
        console.log(`  - Empresa ${company.id} (${company.name}): Error verificando plan ${company.planId}:`, error.message);
      }
    }
    
    console.log('\n✅ DIAGNÓSTICO COMPLETADO');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    await sequelize.close();
  }
}

debugPlans();
