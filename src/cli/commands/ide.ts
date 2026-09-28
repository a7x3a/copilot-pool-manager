import { spawn } from 'child_process';
import pc from 'picocolors';
import { accountSelector } from '../../core/account-selector';
import { accountManager } from '../../core/account-manager';
import { tokenManager } from '../../auth/token-manager';
import { logSuccess, logError, logInfo } from '../../terminal/progress';

export async function ideCommand(ideName: string = 'code', extraArgs: string[] = []): Promise<void> {
  try {
    const account = accountSelector.selectAccount();
    const token = tokenManager.getToken(account.credentialReference);

    if (!token) {
      logError(`No token found for active account ${account.githubUsername}. Run "cpm login ${account.id}" first.`);
      return;
    }

    // Set account as active and update last used
    accountManager.setActiveAccount(account.id);
    accountManager.markUsed(account.id);

    const args = extraArgs.length > 0 ? extraArgs : ['.'];
    logInfo(`Launching ${pc.cyan(ideName)} ${args.join(' ')} with Copilot account: #${account.id} @${account.githubUsername}`);

    const env = {
      ...process.env,
      COPILOT_GITHUB_TOKEN: token,
      GH_TOKEN: token,
      GITHUB_TOKEN: token,
    };

    const isWindows = process.platform === 'win32';
    const child = spawn(ideName, args, {
      stdio: 'ignore',
      shell: isWindows,
      env,
      detached: true,
    });

    child.unref();
    logSuccess(`Spawned ${ideName} with authenticated Copilot environment.`);
  } catch (err: any) {
    logError(`Failed to launch IDE: ${err.message}`);
  }
}

export function envCommand(format: string = 'powershell'): void {
  try {
    const account = accountSelector.selectAccount();
    const token = tokenManager.getToken(account.credentialReference);

    if (!token) {
      logError(`No token found for active account ${account.githubUsername}.`);
      return;
    }

    console.log('\n' + pc.bold(`Copilot Environment Export (#${account.id} @${account.githubUsername})`) + '\n');

    if (format === 'bash' || format === 'sh') {
      console.log(`export COPILOT_GITHUB_TOKEN="${token}"`);
      console.log(`export GH_TOKEN="${token}"`);
    } else if (format === 'cmd') {
      console.log(`set COPILOT_GITHUB_TOKEN=${token}`);
      console.log(`set GH_TOKEN=${token}`);
    } else {
      // PowerShell default
      console.log(`$env:COPILOT_GITHUB_TOKEN = "${token}"`);
      console.log(`$env:GH_TOKEN = "${token}"`);
    }
    console.log(pc.dim('\nRun the above in your shell or profile to configure your global terminal session.\n'));
  } catch (err: any) {
    logError(err.message);
  }
}
