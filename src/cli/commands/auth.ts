import prompts from 'prompts';
import pc from 'picocolors';
import { accountManager } from '../../core/account-manager';
import { tokenManager } from '../../auth/token-manager';
import { logSuccess, logError, logInfo } from '../../terminal/progress';

export async function addAccountCommand(): Promise<void> {
  console.log('\n' + pc.bold('Add GitHub Copilot Account (API Key / Token)') + '\n');
  console.log(pc.dim('Paste your GitHub Personal Access Token (PAT) or Copilot API Key.'));
  console.log(pc.dim('Need a token? Generate one at: https://github.com/settings/tokens (with "copilot" / "repo" access)\n'));

  const tokenResponse = await prompts({
    type: 'password',
    name: 'token',
    message: 'Enter GitHub Copilot Token / API Key:',
    validate: (v: string) => (v && v.trim().length > 0 ? true : 'Token cannot be empty'),
  });

  if (!tokenResponse.token) {
    console.log(pc.dim('Operation cancelled.'));
    return;
  }

  const token = tokenResponse.token.trim();

  try {
    logInfo('Validating API key with GitHub...');
    const account = await accountManager.addAccount({ token });
    logSuccess(`Account "${account.githubUsername}" (#${account.id}) successfully added and authorized!`);
    console.log(`  Plan:   ${pc.cyan(account.copilotPlan)}`);
    console.log(`  Status: ${pc.green(account.status)}\n`);
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

  console.log(`\n${pc.bold('Update Token / API Key:')} ${account.githubUsername} (#${account.id})\n`);

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
    logSuccess(`Account "${account.githubUsername}" (#${account.id}) successfully updated!`);
  } catch (err: any) {
    logError(`Failed to update account: ${err.message}`);
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
  logSuccess(`Removed local credentials for account "${account.githubUsername}" (#${account.id}).`);
}
