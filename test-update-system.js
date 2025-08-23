#!/usr/bin/env node

/**
 * Script de prueba para el sistema de actualización
 * Verifica que la lógica de detección de cambios críticos funcione correctamente
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);

// Simular la lógica del SystemController
const projectRoot = (() => {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, ".git"))) return cwd;
  const parent = path.resolve(cwd, "..");
  if (fs.existsSync(path.join(parent, ".git"))) return parent;
  return cwd;
})();

const run = (command, cwd = projectRoot) => execAsync(command, { cwd });

// Función para verificar si los cambios locales son críticos
const areLocalChangesCritical = (gitStatus) => {
  const lines = gitStatus.split('\n').filter(line => line.trim());
  
  // Archivos que NO son críticos (pueden ser ignorados)
  const nonCriticalPatterns = [
    /^[MAD] backend\/dist\//,           // Archivos compilados del backend
    /^[MAD] frontend\/build\//,         // Archivos compilados del frontend
    /^[MAD] backend\/logs\//,           // Archivos de logs
    /^[MAD] backend\/public\/fileList\//, // Archivos subidos por usuarios
    /^[MAD] backend\/public\/.*\.(pdf|docx|xlsx|pptx|csv|jpeg|jpg|png|webp)$/, // Archivos multimedia
    /^[MAD] \.env/,                     // Variables de entorno (pueden ser locales)
    /^[MAD] ecosystem\.config\.js/,     // Configuración PM2 (puede ser local)
    /^[MAD] package-lock\.json/,        // Lock files (pueden diferir)
    /^[MAD] yarn\.lock/,                // Lock files de Yarn
    /^[MAD] node_modules\//,            // Dependencias (no deberían estar en git)
    /^[MAD] \.gitignore/,               // Gitignore puede ser local
    /^[MAD] \.env\.local/,              // Variables de entorno locales
    /^[MAD] \.env\.production/,         // Variables de entorno de producción
    /^[MAD] \.env\.development/         // Variables de entorno de desarrollo
  ];

  // Verificar si hay cambios críticos (fuera de los patrones no críticos)
  const hasCriticalChanges = lines.some(line => {
    // Si es un archivo no rastreado (??), no es crítico
    if (line.startsWith('??')) return false;
    
    // Si coincide con algún patrón no crítico, no es crítico
    if (nonCriticalPatterns.some(pattern => pattern.test(line))) return false;
    
    // Si no coincide con ningún patrón no crítico, ES crítico
    return true;
  });

  return hasCriticalChanges;
};

// Función para obtener solo cambios críticos
const getCriticalChanges = (gitStatus) => {
  const lines = gitStatus.split('\n').filter(line => line.trim());
  
  const criticalLines = lines.filter(line => {
    // Ignorar archivos no rastreados
    if (line.startsWith('??')) return false;
    
    // Patrones de archivos no críticos
    const nonCriticalPatterns = [
      /^[MAD] backend\/dist\//,
      /^[MAD] frontend\/build\//,
      /^[MAD] backend\/logs\//,
      /^[MAD] backend\/public\/fileList\//,
      /^[MAD] backend\/public\/.*\.(pdf|docx|xlsx|pptx|csv|jpeg|jpg|png|webp)$/,
      /^[MAD] \.env/,
      /^[MAD] ecosystem\.config\.js/,
      /^[MAD] package-lock\.json/,
      /^[MAD] yarn\.lock/,
      /^[MAD] node_modules\//,
      /^[MAD] \.gitignore/,
      /^[MAD] \.env\.local/,
      /^[MAD] \.env\.production/,
      /^[MAD] \.env\.development/
    ];
    
    // Solo incluir si NO coincide con patrones no críticos
    return !nonCriticalPatterns.some(pattern => pattern.test(line));
  });
  
  return criticalLines.join('\n');
};

async function testUpdateSystem() {
  console.log('🧪 PROBANDO SISTEMA DE ACTUALIZACIÓN');
  console.log('=====================================\n');
  
  try {
    // 1. Verificar estado del repositorio
    console.log('1️⃣ Verificando estado del repositorio...');
    const { stdout: gitStatus } = await run("git status --porcelain");
    console.log('📋 Estado Git:', gitStatus || 'Sin cambios');
    
    // 2. Analizar cambios críticos
    console.log('\n2️⃣ Analizando cambios críticos...');
    const criticalChanges = getCriticalChanges(gitStatus);
    const hasCriticalChanges = areLocalChangesCritical(gitStatus);
    
    console.log('🔍 ¿Hay cambios críticos?', hasCriticalChanges ? '❌ SÍ' : '✅ NO');
    
    if (criticalChanges.trim()) {
      console.log('⚠️ Cambios críticos detectados:');
      console.log(criticalChanges);
    } else {
      console.log('✅ No hay cambios críticos');
    }
    
    // 3. Mostrar todos los cambios
    const allChanges = gitStatus.split('\n').filter(line => line.trim() && !line.startsWith('??')).join('\n');
    if (allChanges.trim()) {
      console.log('\n📝 Todos los cambios (incluyendo no críticos):');
      console.log(allChanges);
    }
    
    // 4. Recomendación
    console.log('\n💡 RECOMENDACIÓN:');
    if (hasCriticalChanges) {
      console.log('❌ NO se puede actualizar - Hay cambios críticos sin commitear');
      console.log('   Solución: Hacer commit de los cambios críticos o usar actualización forzada');
    } else if (allChanges.trim()) {
      console.log('⚠️ Se puede actualizar con advertencia - Solo cambios no críticos');
      console.log('   Solución: Continuar con la actualización normal');
    } else {
      console.log('✅ Se puede actualizar sin problemas - No hay cambios locales');
    }
    
    // 5. Simular diferentes escenarios
    console.log('\n🧪 SIMULANDO ESCENARIOS:');
    
    // Escenario 1: Solo archivos de build
    const buildOnlyStatus = 'M backend/dist/app.js\nM frontend/build/static/js/main.js';
    console.log('\n📦 Escenario 1: Solo archivos de build');
    console.log('Estado:', buildOnlyStatus);
    console.log('¿Crítico?', areLocalChangesCritical(buildOnlyStatus) ? '❌ SÍ' : '✅ NO');
    
    // Escenario 2: Archivos de código fuente
    const sourceCodeStatus = 'M src/controllers/SystemController.ts\nM src/routes/systemRoutes.ts';
    console.log('\n💻 Escenario 2: Archivos de código fuente');
    console.log('Estado:', sourceCodeStatus);
    console.log('¿Crítico?', areLocalChangesCritical(sourceCodeStatus) ? '❌ SÍ' : '✅ NO');
    
    // Escenario 3: Mezcla de archivos
    const mixedStatus = 'M backend/dist/app.js\nM src/controllers/SystemController.ts\nM .env';
    console.log('\n🔀 Escenario 3: Mezcla de archivos');
    console.log('Estado:', mixedStatus);
    console.log('¿Crítico?', areLocalChangesCritical(mixedStatus) ? '❌ SÍ' : '✅ NO');
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
  }
}

// Ejecutar la prueba
testUpdateSystem();
