import pc from 'picocolors';
import { usageManager } from '../../core/usage-manager';
import { accountManager } from '../../core/account-manager';
import { renderTable, formatTimeAgo } from '../../terminal/tables';
import { UsageRecord } from '../../types';

export function usageCommand(accountId?: string): void {
  const accounts = accountManager.listAccounts();
  const usageRecords = accountId
    ? usageManager.getUsageForAccount(accountId)
    : usageManager.getAllUsage();

  console.log('\n' + pc.bold('COPILOT USAGE & LIMITS') + '\n');

  if (accounts.length === 0) {
    console.log(pc.dim('  No accounts registered. Run "cpm add" to add an account.\n'));
    return;
  }

  // Summary per account
  console.log(pc.bold('Account Usage Summary:'));
  const summaryData = accounts.map((acc) => {
    const accRecords = usageManager.getUsageForAccount(acc.id);
    const totalTokens = accRecords.reduce((sum, r) => sum + (r.tokens || 0), 0);
    const hasTokenData = accRecords.some((r) => r.tokens !== null);

    return {
      id: acc.id,
      account: acc.githubUsername,
      sessions: accRecords.length,
      tokens: hasTokenData ? totalTokens.toLocaleString() : 'N/A',
      credits: 'N/A',
      status: acc.status,
    };
  });

  const summaryTable = renderTable(summaryData, [
    { header: 'ID', render: (r) => r.id },
    { header: 'ACCOUNT', render: (r) => r.account },
    { header: 'SESSIONS', render: (r) => String(r.sessions) },
    { header: 'TOKENS', render: (r) => r.tokens },
    { header: 'CREDITS', render: (r) => r.credits },
  ]);

  console.log(summaryTable);
  console.log('');

  if (usageRecords.length > 0) {
    console.log(pc.bold('Recent Usage Records:'));
    const recentRecords = [...usageRecords].reverse().slice(0, 10);
    const recordsTable = renderTable<UsageRecord>(recentRecords, [
      { header: 'TIME', render: (r) => formatTimeAgo(r.timestamp) },
      { header: 'ACCOUNT', render: (r) => r.accountId },
      { header: 'PROJECT', render: (r) => r.projectId || '--' },
      { header: 'TOKENS', render: (r) => (r.tokens !== null ? r.tokens.toLocaleString() : 'N/A') },
      { header: 'CREDITS', render: (r) => (r.credits !== null ? String(r.credits) : 'N/A') },
      { header: 'SOURCE', render: (r) => r.source },
    ]);
    console.log(recordsTable);
    console.log('');
  } else {
    console.log(pc.dim('  (Note: Copilot usage metrics are recorded automatically from CLI sessions or when /usage is observed.)\n'));
  }
}
