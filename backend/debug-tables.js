const { sequelize } = require('./dist/database');

async function debugTables() {
  try {
    console.log('🔍 DIAGNÓSTICO DE TABLAS EN BASE DE DATOS');
    console.log('==========================================');
    
    // Verificar todas las tablas
    const tables = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log('\n📋 TABLAS DISPONIBLES:');
    tables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
    // Verificar si existe la tabla Invoices
    const invoicesExists = tables.some(table => 
      table.table_name.toLowerCase() === 'invoices' || 
      table.table_name.toLowerCase() === 'invoice'
    );
    
    console.log('\n💳 TABLA INVOICES:');
    if (invoicesExists) {
      console.log('  ✅ Tabla Invoices encontrada');
      
      // Verificar estructura de la tabla
      const columns = await sequelize.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Invoices' ORDER BY ordinal_position;",
        { type: sequelize.QueryTypes.SELECT }
      );
      
      console.log('\n  📊 ESTRUCTURA DE LA TABLA:');
      columns.forEach(col => {
        console.log(`    - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('  ❌ Tabla Invoices NO encontrada');
      console.log('  💡 Buscando tablas similares...');
      
      const similarTables = tables.filter(table => 
        table.table_name.toLowerCase().includes('invoice') ||
        table.table_name.toLowerCase().includes('bill') ||
        table.table_name.toLowerCase().includes('payment')
      );
      
      if (similarTables.length > 0) {
        console.log('  🔍 TABLAS SIMILARES ENCONTRADAS:');
        similarTables.forEach(table => {
          console.log(`    - ${table.table_name}`);
        });
      }
    }
    
    console.log('\n✅ DIAGNÓSTICO COMPLETADO');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    await sequelize.close();
  }
}

debugTables();
