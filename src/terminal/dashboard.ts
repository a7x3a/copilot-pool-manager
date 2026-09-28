import prompts from 'prompts';
import pc from 'picocolors';
import { accountManager } from '../core/account-manager';
import { projectManager } from '../core/project-manager';
import { cooldownManager } from '../core/cooldown-manager';
import { renderTable, formatTimeAgo } from './tables';
import { showBanner } from './progress';
import { colors } from './colors';
import { Account } from '../types';

export function renderDashboardView(): string {
  const accounts = accountManager.listAccounts();
  const currentDir = process.cwd();
  const currentProject = projectManager.getProjectByPath(currentDir);
  const activeAccount = accounts.find((a) => a.status === 'ACTIVE');

  const total = accounts.length;
  const available = accountManager.getUsableAccounts().length;
  const active = accounts.filter((a) => a.status === 'ACTIVE').length;
  const limited = accounts.filter((a) => a.status === 'LIMITED' || a.status === 'COOLDOWN').length;

  const accountsTableOutput = renderTable<Account>(accounts, [
    { header: 'ID', render: (a) => a.id },
    { header: 'ACCOUNT', render: (a) => (a.status === 'ACTIVE' ? pc.bold(pc.cyan(`★ ${a.githubUsername}`)) : a.githubUsername) },
    { header: 'STATUS', render: (a) => colors.status(a.status) },
    {
      header: 'USAGE / COOLDOWN',
      render: (a) => {
        if (cooldownManager.isCoolingDown(a)) {
          return pc.yellow(cooldownManager.formatCooldown(a));
        }
        return '--';
      },
    },
    { header: 'LAST USED', render: (a) => formatTimeAgo(a.lastUsedAt) },
  ]);

  const output: string[] = [
    showBanner(),
    pc.bold('👥 ACCOUNTS POOL'),
    pc.dim('────────────────────────────────────────────────────────────'),
    accountsTableOutput,
    '',
    pc.bold('📁 CURRENT PROJECT'),
    pc.dim('────────────────────────────────────────────────────────────'),
    currentProject
      ? `  ${pc.cyan(pc.bold(currentProject.name))}  ${pc.dim('→')}  ${pc.dim(currentProject.path)}`
      : `  ${pc.dim('(No project matched current directory: ' + currentDir + ')')}`,
    '',
    pc.bold('⚡ ACTIVE SESSION'),
    pc.dim('────────────────────────────────────────────────────────────'),
    activeAccount
      ? `  #${activeAccount.id} ${pc.cyan(pc.bold(activeAccount.githubUsername))}  ${colors.status(activeAccount.status)}  ${pc.dim('| Plan: ' + activeAccount.copilotPlan)}`
      : `  ${pc.yellow('⚠ No account currently active. Press [3] to select an account.')}`,
    '',
    pc.bold('📊 POOL STATUS'),
    pc.dim('────────────────────────────────────────────────────────────'),
    `  Accounts: ${pc.bold(String(total))}  │  Available: ${pc.green(String(available))}  │  Active: ${pc.cyan(String(active))}  │  Limited: ${limited > 0 ? pc.yellow(String(limited)) : '0'}`,
    '',
    pc.bold('⚡ ACTIONS & COMMANDS'),
    pc.dim('────────────────────────────────────────────────────────────'),
    `  ${pc.cyan('[1]')} 🚀 Run Copilot CLI     ${pc.dim('(/run)')}`,
    `  ${pc.cyan('[2]')} 🔄 Switch Account      ${pc.dim('(/switch)')}`,
    `  ${pc.cyan('[3]')} 👥 Accounts Pool       ${pc.dim('(/accounts)')}`,
    `  ${pc.cyan('[4]')} 📊 Usage & Limits      ${pc.dim('(/usage)')}`,
    `  ${pc.cyan('[5]')} 📁 Projects            ${pc.dim('(/projects)')}`,
    `  ${pc.cyan('[6]')} 🩺 Health Doctor       ${pc.dim('(/doctor)')}`,
    `  ${pc.cyan('[7]')} 📜 Event Logs          ${pc.dim('(/logs)')}`,
    `  ${pc.cyan('[8]')} ⚙️  Setup Wizard        ${pc.dim('(/setup)')}`,
    `  ${pc.yellow('[Q]')} 🚪 Quit                ${pc.dim('(/quit)')}`,
    '',
  ];

  return output.join('\n');
}

export interface DashboardHandlers {
  onRunCopilot: () => Promise<void>;
  onCode?: () => Promise<void>;
  onAccounts: () => Promise<void>;
  onSwitch: () => Promise<void>;
  onUsage: () => Promise<void>;
  onProjects: () => Promise<void>;
  onHealth: () => Promise<void>;
  onLogs: () => Promise<void>;
  onSetup: () => Promise<void>;
}

export async function runInteractiveDashboard(handlers: DashboardHandlers): Promise<void> {
  const initialAccounts = accountManager.listAccounts();

  // If no accounts, offer quick setup wizard immediately
  if (initialAccounts.length === 0) {
    console.clear();
    console.log(showBanner());
    console.log('\n  ' + pc.yellow('⚠ No GitHub Copilot accounts found in your pool.\n'));
    const setupPrompt = await prompts({
      type: 'confirm',
      name: 'startSetup',
      message: 'Would you like to run the Setup Wizard now to add your API Key / Token?',
      initial: true,
    });

    if (setupPrompt.startSetup) {
      await handlers.onSetup();
    }
  }

  let running = true;

  while (running) {
    console.clear();
    console.log(renderDashboardView());

    const response = await prompts({
      type: 'text',
      name: 'action',
      message: 'Select an option or type a command (e.g. 1 or /run):',
    });

    const choice = (response.action || '').trim().toLowerCase();

    if (choice === 'q' || choice === 'quit' || choice === 'exit' || choice === '/quit' || choice === '/exit') {
      running = false;
      console.log('\n  ' + pc.cyan('👋 Thanks for using CPM! Happy coding.') + '\n');
      break;
    }

    try {
      switch (choice) {
        case '1':
        case '/run':
          await handlers.onRunCopilot();
          await pausePrompt();
          break;
        case '2':
        case '/switch':
          await handlers.onSwitch();
          await pausePrompt();
          break;
        case '3':
        case '/accounts':
          await handlers.onAccounts();
          await pausePrompt();
          break;
        case '4':
        case '/usage':
          await handlers.onUsage();
          await pausePrompt();
          break;
        case '5':
        case '/projects':
          await handlers.onProjects();
          await pausePrompt();
          break;
        case '6':
        case '/doctor':
        case '/health':
          await handlers.onHealth();
          await pausePrompt();
          break;
        case '7':
        case '/logs':
          await handlers.onLogs();
          await pausePrompt();
          break;
        case '8':
        case '/setup':
          await handlers.onSetup();
          await pausePrompt();
          break;
        case '/code':
          if (handlers.onCode) {
            await handlers.onCode();
            await pausePrompt();
          }
          break;
        case '/help':
          console.log('\nCommands: /run, /switch, /accounts, /usage, /projects, /doctor, /logs, /setup, /quit\n');
          await pausePrompt();
          break;
        default:
          console.log(pc.yellow('Invalid selection. Type 1-8, /command, or Q to quit.'));
          await pausePrompt();
          break;
      }
    } catch (err: any) {
      console.error(pc.red(`Error: ${err.message}`));
      await pausePrompt();
    }
  }
}

async function pausePrompt(): Promise<void> {
  await prompts({ type: 'text', name: 'pause', message: pc.dim('Press Enter to continue...') });
}
