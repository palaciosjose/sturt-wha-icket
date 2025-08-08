import { Request, Response } from "express";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const checkUpdates = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Verificar si estamos en un repositorio git
    const { stdout: gitStatus } = await execAsync("git status --porcelain");
    const { stdout: currentBranch } = await execAsync("git branch --show-current");
    const { stdout: currentCommit } = await execAsync("git rev-parse HEAD");
    const { stdout: remoteUrl } = await execAsync("git config --get remote.origin.url");

    // Obtener información del commit actual
    const { stdout: currentCommitInfo } = await execAsync(`git log -1 --pretty=format:"%H|%s|%an|%ad" --date=short`);
    const [currentHash, currentMessage, currentAuthor, currentDate] = currentCommitInfo.split("|");

    // Verificar si hay commits remotos nuevos
    await execAsync("git fetch origin");
    const { stdout: commitsAhead } = await execAsync(`git rev-list HEAD..origin/${currentBranch} --count`);

    const hasUpdates = parseInt(commitsAhead) > 0;

    // Obtener información del último commit remoto si hay actualizaciones
    let latestVersion = currentHash;
    let latestCommitInfo = null;

    if (hasUpdates) {
      const { stdout: latestCommit } = await execAsync(`git log origin/${currentBranch} -1 --pretty=format:"%H|%s|%an|%ad" --date=short`);
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
    const { stdout: gitStatus } = await execAsync("git status --porcelain");
    if (gitStatus.trim()) {
      return res.status(400).json({
        error: "Hay cambios locales sin commitear",
        details: "Por favor, haz commit o stash de los cambios antes de actualizar"
      });
    }

    // 2. Verificar si hay actualizaciones disponibles
    await execAsync("git fetch origin");
    const { stdout: currentBranch } = await execAsync("git branch --show-current");
    const { stdout: commitsAhead } = await execAsync(`git rev-list HEAD..origin/${currentBranch} --count`);
    
    if (parseInt(commitsAhead) === 0) {
      return res.status(400).json({
        error: "No hay actualizaciones disponibles",
        details: "El sistema ya está actualizado"
      });
    }

    // 3. Crear backup antes de actualizar
    console.log("📦 Creando backup...");
    const backupBranch = `backup-${Date.now()}`;
    await execAsync(`git checkout -b ${backupBranch}`);
    await execAsync("git checkout main");

    // 4. Realizar la actualización
    console.log("🔄 Actualizando código...");
    await execAsync("git pull origin main");

    // 5. Verificar que la actualización fue exitosa
    const { stdout: newCommit } = await execAsync("git rev-parse HEAD");
    const { stdout: newCommitInfo } = await execAsync(`git log -1 --pretty=format:"%H|%s|%an|%ad" --date=short`);
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
      await execAsync("git reset --hard HEAD~1");
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
