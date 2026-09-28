import pc from 'picocolors';
import { accountManager } from '../../core/account-manager';
import { cooldownManager } from '../../core/cooldown-manager';
import { renderTable, formatTimeAgo } from '../../terminal/tables';
import { colors } from '../../terminal/colors';
import { Account } from '../../types';
import { logSuccess, logError } from '../../terminal/progress';

export function listAccountsCommand(): void {
  const accounts = accountManager.listAccounts();

  console.log('\n' + pc.bold('ACCOUNTS') + '\n');

  if (accounts.length === 0) {
    console.log(pc.dim('  No accounts registered yet. Run "cpm add" to add an account.\n'));
    return;
  }

  const tableStr = renderTable<Account>(accounts, [
    { header: 'ID', render: (a) => a.id },
    { header: 'ACCOUNT', render: (a) => a.githubUsername },
    { header: 'DISPLAY NAME', render: (a) => a.displayName },
    { header: 'STATUS', render: (a) => colors.status(a.status) },
    { header: 'PLAN', render: (a) => a.copilotPlan },
    {
      header: 'COOLDOWN',
      render: (a) => {
        if (cooldownManager.isCoolingDown(a)) {
          return pc.yellow(cooldownManager.formatCooldown(a));
        }
        return '--';
      },
    },
    { header: 'LAST USED', render: (a) => formatTimeAgo(a.lastUsedAt) },
  ]);

  console.log(tableStr);
  console.log('');
}

export function removeAccountCommand(accountIdentifier: string): void {
  const removed = accountManager.removeAccount(accountIdentifier);
  if (removed) {
    logSuccess(`Account "${accountIdentifier}" removed successfully.`);
  } else {
    logError(`Account "${accountIdentifier}" not found.`);
    process.exit(1);
  }
}
