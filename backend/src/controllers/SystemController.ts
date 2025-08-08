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
