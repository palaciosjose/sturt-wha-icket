const sequelize = require('./dist/database').default;

async function debugInvoices() {
  try {
    console.log('🔍 DIAGNÓSTICO ESPECÍFICO DE TABLA INVOICES');
    console.log('=============================================');
    
    // Verificar si existe la tabla Invoices
    const tableExists = await sequelize.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Invoices');",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log('\n💳 TABLA INVOICES:');
    if (tableExists[0].exists) {
      console.log('  ✅ Tabla Invoices EXISTE en la base de datos');
      
      // Verificar estructura de la tabla
      const columns = await sequelize.query(
        "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'Invoices' ORDER BY ordinal_position;",
        { type: sequelize.QueryTypes.SELECT }
      );
      
      console.log('\n  📊 ESTRUCTURA DE LA TABLA:');
      columns.forEach(col => {
        console.log(`    - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Verificar si hay datos
      const count = await sequelize.query(
        "SELECT COUNT(*) as total FROM \"Invoices\";",
        { type: sequelize.QueryTypes.SELECT }
      );
      
      console.log(`\n  📈 DATOS EN LA TABLA: ${count[0].total} registros`);
      
    } else {
      console.log('  ❌ Tabla Invoices NO EXISTE en la base de datos');
      
      // Buscar tablas similares
      const similarTables = await sequelize.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name ILIKE '%invoice%' OR table_name ILIKE '%bill%' OR table_name ILIKE '%payment%');",
        { type: sequelize.QueryTypes.SELECT }
      );
      
      if (similarTables.length > 0) {
        console.log('\n  🔍 TABLAS SIMILARES ENCONTRADAS:');
        similarTables.forEach(table => {
          console.log(`    - ${table.table_name}`);
        });
      }
      
      // Verificar migraciones pendientes
      console.log('\n  🔧 VERIFICANDO MIGRACIONES:');
      try {
        const migrations = await sequelize.query(
          "SELECT * FROM SequelizeMeta ORDER BY name DESC LIMIT 5;",
          { type: sequelize.QueryTypes.SELECT }
        );
        
        console.log('  📋 ÚLTIMAS MIGRACIONES EJECUTADAS:');
        migrations.forEach(migration => {
          console.log(`    - ${migration.name}`);
        });
      } catch (migrationError) {
        console.log('  ❌ Error verificando migraciones:', migrationError.message);
      }
    }
    
    console.log('\n✅ DIAGNÓSTICO COMPLETADO');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    await sequelize.close();
  }
}

debugInvoices();
