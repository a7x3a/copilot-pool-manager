import pc from 'picocolors';
import { copilotRunner } from '../../core/copilot-runner';
import { projectManager } from '../../core/project-manager';
import { accountManager } from '../../core/account-manager';
import { logError } from '../../terminal/progress';

export async function runCommand(projectOrAccount?: string, cliArgs: string[] = []): Promise<void> {
  try {
    let projectName: string | undefined;
    let accountId: string | undefined;

    if (projectOrAccount) {
      if (projectOrAccount.startsWith('-')) {
        // Flag passed as first argument
        cliArgs = [projectOrAccount, ...cliArgs];
      } else {
        const proj = projectManager.getProject(projectOrAccount);
        if (proj) {
          projectName = proj.name;
        } else {
          const acc = accountManager.getAccount(projectOrAccount);
          if (acc) {
            accountId = acc.id;
          } else {
            // Not a registered project or account, pass through to Copilot CLI
            cliArgs = [projectOrAccount, ...cliArgs];
          }
        }
      }
    }

    const exitCode = await copilotRunner.run({
      projectName,
      accountId,
      cliArgs,
    });

    if (exitCode !== 0 && process.env.CPM_DASHBOARD !== 'true') {
      process.exit(exitCode);
    }
  } catch (err: any) {
    logError(err.message);
    if (process.env.CPM_DASHBOARD !== 'true') {
      process.exit(1);
    }
  }
}
