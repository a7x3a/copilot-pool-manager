import prompts from 'prompts';
import pc from 'picocolors';
import { accountManager } from '../../core/account-manager';
import { tokenManager } from '../../auth/token-manager';
import { logSuccess, logError, logInfo } from '../../terminal/progress';

export async function addAccountCommand(): Promise<void> {
  console.log('\n  ' + pc.cyan(pc.bold('🔑 Add GitHub Copilot Account (Fine-grained PAT / Token)')));
  console.log('  ' + pc.dim('────────────────────────────────────────────────────────────'));
  console.log(`  ${pc.bold('Important:')} GitHub Copilot CLI ${pc.red(pc.bold('REJECTS classic tokens (ghp_)'))}.`);
  console.log(`  You MUST use a ${pc.green(pc.bold('Fine-grained Personal Access Token (github_pat_)'))} or an OAuth token.\n`);
  console.log(`  ${pc.bold('How to create your Fine-Grained Token in 60 seconds:')}`);
  console.log(`  1. Open: ${pc.cyan(pc.underline('https://github.com/settings/personal-access-tokens/new'))}`);
  console.log(`  2. Token name: ${pc.dim('cpm')}`);
  console.log(`  3. Resource owner: Select your ${pc.bold('personal account')} (not an org)`);
  console.log(`  4. Repository access: Select ${pc.bold('All repositories')} (or Public repositories)`);
  console.log(`  5. Permissions:`);
  console.log(`     👉 Click ${pc.bold('Account permissions')}:`);
  console.log(`        [✔] ${pc.green(pc.bold('Copilot Requests'))}  ➔ Set to ${pc.green(pc.bold('Read and Write'))} ${pc.yellow('(REQUIRED for Copilot)')}`);
  console.log(`     👉 Click ${pc.bold('Repository permissions')}:`);
  console.log(`        [✔] ${pc.green(pc.bold('Contents'))}          ➔ Set to ${pc.green(pc.bold('Read'))} ${pc.dim('(allows reading code context)')}`);
  console.log(`  6. Click ${pc.bold('Generate token')} and copy the ${pc.green('github_pat_...')} key.\n`);

  const tokenResponse = await prompts({
    type: 'password',
    name: 'token',
    message: 'Paste your Fine-Grained Token (github_pat_...) or OAuth Token (gho_...):',
    validate: (v: string) => {
      if (!v || v.trim().length === 0) return 'Token cannot be empty';
      if (v.trim().startsWith('ghp_')) {
        return 'Classic tokens (ghp_) are rejected by Copilot CLI. Please create a Fine-grained PAT (github_pat_)';
      }
      return true;
    },
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
