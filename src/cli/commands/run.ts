import pc from 'picocolors';
import { copilotRunner } from '../../core/copilot-runner';
import { projectManager } from '../../core/project-manager';
import { logError } from '../../terminal/progress';

export async function runCommand(projectOrAccount?: string, cliArgs: string[] = []): Promise<void> {
  try {
    let projectName: string | undefined;
    let accountId: string | undefined;

    if (projectOrAccount) {
      // Check if it's a project name
      const proj = projectManager.getProject(projectOrAccount);
      if (proj) {
        projectName = proj.name;
      } else {
        // Maybe it's an explicit account ID or username?
        // If not a project, treat it as project name attempt
        projectName = projectOrAccount;
      }
    }

    const exitCode = await copilotRunner.run({
      projectName,
      accountId,
      cliArgs,
    });

    if (exitCode !== 0) {
      process.exit(exitCode);
    }
  } catch (err: any) {
    logError(err.message);
    process.exit(1);
  }
}
