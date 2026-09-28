import prompts from 'prompts';
import pc from 'picocolors';
import { accountManager } from '../../core/account-manager';
import { cooldownManager } from '../../core/cooldown-manager';
import { colors } from '../../terminal/colors';
import { logSuccess, logError, logWarn } from '../../terminal/progress';
import { formatTimeAgo } from '../../terminal/tables';

export async function switchAccountCommand(targetIdentifier?: string): Promise<void> {
  const accounts = accountManager.listAccounts();

  if (accounts.length === 0) {
    logError('No accounts registered in CPM. Run "cpm add" or "cpm setup" first.');
    return;
  }

  let selectedId = targetIdentifier?.trim();

  if (!selectedId) {
    console.log('\n' + pc.bold('Switch Active Account') + '\n');
    const choices = accounts.map((acc) => {
      let extra = '';
      if (cooldownManager.isCoolingDown(acc)) {
        extra = pc.yellow(` [Cooldown: ${cooldownManager.formatCooldown(acc)}]`);
      } else if (acc.status === 'ACTIVE') {
        extra = pc.cyan(' (CURRENT ACTIVE)');
      }
      return {
        title: `#${acc.id} ${acc.githubUsername} - ${acc.status}${extra}`,
        description: `Plan: ${acc.copilotPlan} | Last used: ${formatTimeAgo(acc.lastUsedAt)}`,
        value: acc.id,
      };
    });

    const response = await prompts({
      type: 'select',
      name: 'accountId',
      message: 'Select an account to activate:',
      choices,
    });

    if (!response.accountId) {
      console.log(pc.dim('Operation cancelled.'));
      return;
    }
    selectedId = response.accountId;
  }

  const account = accountManager.getAccount(selectedId!);
  if (!account) {
    logError(`Account "${selectedId}" not found in CPM.`);
    return;
  }

  if (cooldownManager.isCoolingDown(account)) {
    logWarn(`Account #${account.id} (@${account.githubUsername}) is currently on cooldown (${cooldownManager.formatCooldown(account)} remaining).`);
    const confirm = await prompts({
      type: 'confirm',
      name: 'force',
      message: 'Do you still want to switch to this account?',
      initial: false,
    });
    if (!confirm.force) {
      console.log(pc.dim('Switch cancelled.'));
      return;
    }
  }

  const currentActive = accounts.find((a) => a.status === 'ACTIVE');
  accountManager.setActiveAccount(account.id);

  const prevText = currentActive ? ` (switched from #${currentActive.id} @${currentActive.githubUsername})` : '';
  logSuccess(`Active account is now #${account.id} @${pc.cyan(account.githubUsername)}${pc.dim(prevText)}`);
}
