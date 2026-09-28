import prompts from 'prompts';
import pc from 'picocolors';
import { accountManager } from '../../core/account-manager';
import { tokenManager } from '../../auth/token-manager';
import { requestDeviceCode, pollDeviceToken, validateGitHubToken } from '../../auth/github-auth';
import { logSuccess, logError, logInfo } from '../../terminal/progress';

export async function addAccountCommand(): Promise<void> {
  console.log('\n' + pc.bold('Add GitHub Copilot Account') + '\n');

  const methodResponse = await prompts({
    type: 'select',
    name: 'method',
    message: 'Choose authentication method:',
    choices: [
      { title: 'GitHub Personal Access Token (PAT)', value: 'token' },
      { title: 'GitHub OAuth Device Flow (Browser)', value: 'device' },
    ],
  });

  if (!methodResponse.method) {
    console.log(pc.dim('Operation cancelled.'));
    return;
  }

  let token = '';

  if (methodResponse.method === 'token') {
    const tokenResponse = await prompts({
      type: 'password',
      name: 'token',
      message: 'Enter your GitHub Personal Access Token (or Copilot token):',
      validate: (v: string) => (v && v.trim().length > 0 ? true : 'Token cannot be empty'),
    });

    if (!tokenResponse.token) {
      console.log(pc.dim('Operation cancelled.'));
      return;
    }
    token = tokenResponse.token.trim();
  } else {
    try {
      logInfo('Requesting device authorization code from GitHub...');
      const devCode = await requestDeviceCode();

      console.log('\n' + pc.bold('GitHub Device Authorization:'));
      console.log(`  1. Open: ${pc.cyan(pc.underline(devCode.verification_uri))}`);
      console.log(`  2. Enter code: ${pc.green(pc.bold(devCode.user_code))}\n`);

      logInfo('Waiting for browser authentication...');
      token = await pollDeviceToken(devCode.device_code, devCode.interval, devCode.expires_in);
    } catch (err: any) {
      logError(`Device authentication failed: ${err.message}`);
      return;
    }
  }

  try {
    logInfo('Validating credentials with GitHub API...');
    const account = await accountManager.addAccount({ token });
    logSuccess(`Account "${account.githubUsername}" (#${account.id}) successfully added and authorized!`);
    console.log(`  Plan: ${account.copilotPlan}`);
    console.log(`  Status: ${account.status}\n`);
  } catch (err: any) {
    logError(`Failed to authenticate: ${err.message}`);
  }
}

export async function loginAccountCommand(accountIdentifier?: string): Promise<void> {
  if (!accountIdentifier) {
    await addAccountCommand();
    return;
  }

  const account = accountManager.getAccount(accountIdentifier);
  if (!account) {
    logError(`Account "${accountIdentifier}" not found.`);
    return;
  }

  console.log(`\n${pc.bold('Re-authenticating Account:')} ${account.githubUsername} (#${account.id})\n`);

  const tokenResponse = await prompts({
    type: 'password',
    name: 'token',
    message: `Enter new token for ${account.githubUsername}:`,
    validate: (v: string) => (v && v.trim().length > 0 ? true : 'Token cannot be empty'),
  });

  if (!tokenResponse.token) {
    console.log(pc.dim('Operation cancelled.'));
    return;
  }

  try {
    logInfo('Validating and storing credentials...');
    await accountManager.addAccount({
      githubUsername: account.githubUsername,
      displayName: account.displayName,
      token: tokenResponse.token.trim(),
    });
    logSuccess(`Account "${account.githubUsername}" (#${account.id}) successfully re-authenticated!`);
  } catch (err: any) {
    logError(`Failed to re-authenticate: ${err.message}`);
  }
}

export function logoutAccountCommand(accountIdentifier: string): void {
  const account = accountManager.getAccount(accountIdentifier);
  if (!account) {
    logError(`Account "${accountIdentifier}" not found.`);
    return;
  }

  tokenManager.deleteToken(account.credentialReference);
  accountManager.updateStatus(account.id, 'AUTH_ERROR', 'Logged out manually');
  logSuccess(`Removed local authentication for account "${account.githubUsername}" (#${account.id}).`);
}
