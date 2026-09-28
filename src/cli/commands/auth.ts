import prompts from 'prompts';
import pc from 'picocolors';
import { accountManager } from '../../core/account-manager';
import { tokenManager } from '../../auth/token-manager';
import { logSuccess, logError, logInfo } from '../../terminal/progress';

export async function addAccountCommand(): Promise<void> {
  console.log('\n  ' + pc.cyan(pc.bold('🔑 Add GitHub Copilot Account (Token / API Key)')));
  console.log('  ' + pc.dim('────────────────────────────────────────────────────────────'));
  console.log(`  ${pc.bold('Important:')} Use a ${pc.green(pc.bold('Classic Token'))}. GitHub does not support Copilot on fine-grained tokens.`);
  console.log(`\n  ${pc.bold('How to generate your token in 30 seconds:')}`);
  console.log(`  1. Open: ${pc.cyan(pc.underline('https://github.com/settings/tokens'))}`);
  console.log(`  2. Click: ${pc.bold('Generate new token')} ➔ ${pc.green(pc.bold('Generate new token (classic)'))}`);
  console.log(`  3. Name: ${pc.dim('cpm')}`);
  console.log(`  4. Check these required scopes:`);
  console.log(`     ${pc.green('✔')} ${pc.bold('repo')}       ${pc.dim('(Allows Copilot to read codebase context & files)')}`);
  console.log(`     ${pc.green('✔')} ${pc.bold('read:user')}  ${pc.dim('(Allows CPM to verify your GitHub account)')}`);
  console.log(`     ${pc.green('✔')} ${pc.bold('copilot')}    ${pc.dim('(If shown under your account or organization)')}`);
  console.log(`  5. Click ${pc.bold('Generate token')} and paste below.\n`);

  const tokenResponse = await prompts({
    type: 'password',
    name: 'token',
    message: 'Paste your GitHub Classic Token (ghp_...):',
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
