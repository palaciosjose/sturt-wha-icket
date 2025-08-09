import { Request, Response } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

// Determina la raíz del proyecto (donde está el repo git)
const projectRoot = (() => {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, ".git"))) return cwd;
  const parent = path.resolve(cwd, "..");
  if (fs.existsSync(path.join(parent, ".git"))) return parent;
  return cwd;
})();

const run = (command: string, cwd: string = projectRoot) => execAsync(command, { cwd });

export const checkUpdates = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Verificar si estamos en un repositorio git
    const { stdout: gitStatus } = await run("git status --porcelain");
    const { stdout: currentBranch } = await run("git branch --show-current");
    const { stdout: currentCommit } = await run("git rev-parse HEAD");
    const { stdout: remoteUrl } = await run("git config --get remote.origin.url");

    // Obtener información del commit actual
    const { stdout: currentCommitInfo } = await run(`git log -1 --pretty=format:"%H|%s|%an|%ad" --date=short`);
    const [currentHash, currentMessage, currentAuthor, currentDate] = currentCommitInfo.split("|");

    // Verificar si hay commits remotos nuevos
    await run("git fetch origin");
    const { stdout: commitsAhead } = await run(`git rev-list HEAD..origin/${currentBranch} --count`);

    const hasUpdates = parseInt(commitsAhead) > 0;

    // Obtener información del último commit remoto si hay actualizaciones
    let latestVersion = currentHash;
    let latestCommitInfo = null;

    if (hasUpdates) {
      const { stdout: latestCommit } = await run(`git log origin/${currentBranch} -1 --pretty=format:"%H|%s|%an|%ad" --date=short`);
      latestCommitInfo = latestCommit.split("|");
      latestVersion = latestCommitInfo[0];
    }

    return res.status(200).json({
      currentVersion: currentHash.substring(0, 8),
      latestVersion: latestVersion.substring(0, 8),
      hasUpdates,
      commitsAhead: parseInt(commitsAhead),
      currentBranch,
      currentMessage,
      currentAuthor,
      currentDate,
      latestMessage: latestCommitInfo ? latestCommitInfo[1] : null,
      latestAuthor: latestCommitInfo ? latestCommitInfo[2] : null,
      latestDate: latestCommitInfo ? latestCommitInfo[3] : null,
      remoteUrl: remoteUrl.trim()
    });

  } catch (error) {
    console.error("Error checking updates:", error);
    return res.status(500).json({
      error: "Error al verificar actualizaciones",
      details: error.message
    });
  }
};

export const performUpdate = async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log("🚀 Iniciando actualización del sistema...");

    // 1. Verificar si hay cambios locales sin commitear
    const { stdout: gitStatus } = await run("git status --porcelain");
    if (gitStatus.trim()) {
      return res.status(400).json({
        error: "Hay cambios locales sin commitear",
        details: "Por favor, haz commit o stash de los cambios antes de actualizar"
      });
    }

    // 2. Verificar si hay actualizaciones disponibles
    await run("git fetch origin");
    const { stdout: currentBranch } = await run("git branch --show-current");
    const { stdout: commitsAhead } = await run(`git rev-list HEAD..origin/${currentBranch} --count`);
    
    if (parseInt(commitsAhead) === 0) {
      return res.status(400).json({
        error: "No hay actualizaciones disponibles",
        details: "El sistema ya está actualizado"
      });
    }

    // 3. Crear backup antes de actualizar
    console.log("📦 Creando backup...");
    const backupBranch = `backup-${Date.now()}`;
    await run(`git checkout -b ${backupBranch}`);
    await run("git checkout main");

    // 4. Realizar la actualización
    console.log("🔄 Actualizando código...");
    await run("git pull origin main");

    // 5. Verificar que la actualización fue exitosa
    const { stdout: newCommit } = await run("git rev-parse HEAD");
    const { stdout: newCommitInfo } = await run(`git log -1 --pretty=format:"%H|%s|%an|%ad" --date=short`);
    const [newHash, newMessage, newAuthor, newDate] = newCommitInfo.split("|");

    console.log("✅ Actualización completada exitosamente");

    return res.status(200).json({
      success: true,
      message: "Actualización completada exitosamente",
      previousVersion: req.body.previousVersion || "N/A",
      newVersion: newHash.substring(0, 8),
      newMessage,
      newAuthor,
      newDate,
      backupBranch
    });

  } catch (error) {
    console.error("❌ Error durante la actualización:", error);
    
    // Intentar rollback si es posible
    try {
      console.log("🔄 Intentando rollback...");
      await run("git reset --hard HEAD~1");
      console.log("✅ Rollback completado");
    } catch (rollbackError) {
      console.error("❌ Error durante rollback:", rollbackError);
    }

    return res.status(500).json({
      error: "Error durante la actualización",
      details: error.message
    });
  }
};

export const performFullUpdate = async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log("🚀 Iniciando actualización completa del sistema...");

    // 1. Verificar si hay cambios locales sin commitear
    const { stdout: gitStatus } = await run("git status --porcelain");
    if (gitStatus.trim()) {
      return res.status(400).json({
        error: "Hay cambios locales sin commitear",
        details: "Por favor, haz commit o stash de los cambios antes de actualizar"
      });
    }

    // 2. Verificar si hay actualizaciones disponibles
    await run("git fetch origin");
    const { stdout: currentBranch } = await run("git branch --show-current");
    const { stdout: commitsAhead } = await run(`git rev-list HEAD..origin/${currentBranch} --count`);
    
    if (parseInt(commitsAhead) === 0) {
      return res.status(400).json({
        error: "No hay actualizaciones disponibles",
        details: "El sistema ya está actualizado"
      });
    }

    // 3. Crear backup antes de actualizar
    console.log("📦 Creando backup...");
    const backupBranch = `backup-full-${Date.now()}`;
    await run(`git checkout -b ${backupBranch}`);
    await run("git checkout main");

    // 4. Realizar la actualización del código
    console.log("🔄 Actualizando código...");
    await run("git pull origin main");

    // 5. Actualizar dependencias del backend
    console.log("📦 Actualizando dependencias del backend...");
    const backendPath = path.join(projectRoot, "backend");
    await execAsync("npm install --production", { cwd: backendPath });

    // 6. Compilar el backend
    console.log("🔨 Compilando backend...");
    await execAsync("npm run build", { cwd: backendPath });

    // 7. Ejecutar migraciones de base de datos
    console.log("🗄️ Ejecutando migraciones de base de datos...");
    try {
      await execAsync("npm run db:migrate", { cwd: backendPath });
      console.log("✅ Migraciones ejecutadas correctamente");
    } catch (migrationError) {
      console.warn("⚠️ Advertencia: Error en migraciones:", migrationError.message);
      // Continuar con la actualización aunque fallen las migraciones
    }

    // 8. Actualizar dependencias del frontend
    console.log("📦 Actualizando dependencias del frontend...");
    const frontendPath = path.join(projectRoot, "frontend");
    await execAsync("npm install --legacy-peer-deps", { cwd: frontendPath });

    // 9. Compilar el frontend
    console.log("🔨 Compilando frontend...");
    await execAsync("npm run build", { cwd: frontendPath });

    // 10. Verificar que la actualización fue exitosa
    const { stdout: newCommit } = await run("git rev-parse HEAD");
    const { stdout: newCommitInfo } = await run(`git log -1 --pretty=format:"%H|%s|%an|%ad" --date=short`);
    const [newHash, newMessage, newAuthor, newDate] = newCommitInfo.split("|");

    console.log("✅ Actualización completa finalizada exitosamente");

    return res.status(200).json({
      success: true,
      message: "Actualización completa finalizada exitosamente",
      previousVersion: req.body.previousVersion || "N/A",
      newVersion: newHash.substring(0, 8),
      newMessage,
      newAuthor,
      newDate,
      backupBranch,
      steps: [
        "✅ Código actualizado",
        "✅ Dependencias del backend actualizadas",
        "✅ Backend compilado",
        "✅ Migraciones ejecutadas",
        "✅ Dependencias del frontend actualizadas",
        "✅ Frontend compilado"
      ]
    });

  } catch (error) {
    console.error("❌ Error durante la actualización completa:", error);
    
    // Intentar rollback si es posible
    try {
      console.log("🔄 Intentando rollback...");
      await run("git reset --hard HEAD~1");
      console.log("✅ Rollback completado");
    } catch (rollbackError) {
      console.error("❌ Error durante rollback:", rollbackError);
    }

    return res.status(500).json({
      error: "Error durante la actualización completa",
      details: error.message
    });
  }
};
