import pc from 'picocolors';
import { accountManager } from '../../core/account-manager';
import { projectManager } from '../../core/project-manager';
import { cooldownManager } from '../../core/cooldown-manager';
import { renderTable, formatTimeAgo } from '../../terminal/tables';
import { colors } from '../../terminal/colors';
import { Account } from '../../types';

export function statusCommand(): void {
  const accounts = accountManager.listAccounts();
  const currentDir = process.cwd();
  const currentProject = projectManager.getProjectByPath(currentDir);
  const activeAccount = accounts.find((a) => a.status === 'ACTIVE');

  const total = accounts.length;
  const available = accountManager.getUsableAccounts().length;
  const limited = accounts.filter((a) => a.status === 'LIMITED' || a.status === 'COOLDOWN').length;
  const errored = accounts.filter((a) => a.status === 'AUTH_ERROR').length;

  console.log('\n' + pc.bold('CPM SYSTEM STATUS') + '\n');

  console.log(`  Accounts:     ${pc.bold(String(total))}`);
  console.log(`  Available:    ${pc.green(String(available))}`);
  console.log(`  Active:       ${activeAccount ? pc.cyan(activeAccount.githubUsername + ` (#${activeAccount.id})`) : pc.dim('none')}`);
  console.log(`  Limited:      ${limited > 0 ? pc.yellow(String(limited)) : '0'}`);
  console.log(`  Auth Error:   ${errored > 0 ? pc.red(String(errored)) : '0'}`);
  console.log(`  Current Dir:  ${pc.dim(currentDir)}`);
  console.log(`  Project:      ${currentProject ? pc.cyan(currentProject.name) : pc.dim('(no project binding)')}\n`);

  if (accounts.length > 0) {
    const tableStr = renderTable<Account>(accounts, [
      { header: 'ID', render: (a) => a.id },
      { header: 'ACCOUNT', render: (a) => a.githubUsername },
      { header: 'STATUS', render: (a) => colors.status(a.status) },
      {
        header: 'COOLDOWN',
        render: (a) => (cooldownManager.isCoolingDown(a) ? pc.yellow(cooldownManager.formatCooldown(a)) : '--'),
      },
      { header: 'LAST USED', render: (a) => formatTimeAgo(a.lastUsedAt) },
    ]);
    console.log(tableStr);
    console.log('');
  }
}
