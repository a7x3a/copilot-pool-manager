import { Command } from 'commander';
import { listAccountsCommand, removeAccountCommand } from './commands/accounts';
import { addAccountCommand, loginAccountCommand, logoutAccountCommand } from './commands/auth';
import { runCommand } from './commands/run';
import { statusCommand } from './commands/status';
import { usageCommand } from './commands/usage';
import { listProjectsCommand, addProjectCommand, removeProjectCommand } from './commands/projects';
import { logsCommand } from './commands/logs';
import { doctorCommand } from './commands/doctor';
import { settingsCommand } from './commands/settings';
import { setupWizardCommand } from './commands/setup';
import { switchAccountCommand } from './commands/switch';
import { ideCommand, envCommand } from './commands/ide';
import { runInteractiveDashboard } from '../terminal/dashboard';

const program = new Command();

program
  .name('cpm')
  .description('Copilot Pool Manager (CPM) - Multi-account manager for GitHub Copilot')
  .version('1.0.0');

// Dashboard (default command when no args given)
program
  .action(async () => {
    process.env.CPM_DASHBOARD = 'true';
    await runInteractiveDashboard({
      onRunCopilot: async () => {
        await runCommand();
      },
      onCode: async () => {
        await ideCommand('code', ['.']);
      },
      onAccounts: async () => {
        listAccountsCommand();
      },
      onSwitch: async () => {
        await switchAccountCommand();
      },
      onUsage: async () => {
        usageCommand();
      },
      onProjects: async () => {
        listProjectsCommand();
      },
      onHealth: async () => {
        await doctorCommand();
      },
      onLogs: async () => {
        logsCommand(15);
      },
      onSetup: async () => {
        await setupWizardCommand();
      },
    });
  });

// Setup Wizard
program
  .command('setup')
  .description('Run interactive onboarding wizard to configure accounts and projects')
  .action(async () => {
    await setupWizardCommand();
  });

// Accounts commands
program
  .command('accounts')
  .description('List all registered GitHub Copilot accounts in the pool')
  .action(() => {
    listAccountsCommand();
  });

program
  .command('add')
  .description('Add and authenticate a GitHub Copilot account')
  .action(async () => {
    await addAccountCommand();
  });

program
  .command('switch [account]')
  .description('Manually switch the active GitHub Copilot account')
  .action(async (account?: string) => {
    await switchAccountCommand(account);
  });

program
  .command('login [account]')
  .description('Authenticate or re-authenticate an account')
  .action(async (account?: string) => {
    await loginAccountCommand(account);
  });

program
  .command('logout <account>')
  .description('Remove authentication token for an account')
  .action((account: string) => {
    logoutAccountCommand(account);
  });

program
  .command('remove <account>')
  .description('Remove an account from CPM')
  .action((account: string) => {
    removeAccountCommand(account);
  });

// Status command
program
  .command('status')
  .description('Show overall system status and active accounts')
  .action(() => {
    statusCommand();
  });

// Usage command
program
  .command('usage [account]')
  .description('Show recorded Copilot usage metrics')
  .action((account?: string) => {
    usageCommand(account);
  });

// Projects command
const projectCmd = program
  .command('projects')
  .description('Manage projects')
  .action(() => {
    listProjectsCommand();
  });

const projectSub = program.command('project').description('Project operations');

projectSub
  .command('add [name] [path]')
  .description('Register a new project')
  .action(async (name?: string, path?: string) => {
    await addProjectCommand(name, path);
  });

projectSub
  .command('remove <name>')
  .description('Remove a registered project')
  .action((name: string) => {
    removeProjectCommand(name);
  });

// Run command
program
  .command('run [project]')
  .description('Launch GitHub Copilot CLI using an authenticated account')
  .allowUnknownOption()
  .action(async (project: string | undefined, cmd: Command) => {
    const rawArgs = process.argv.slice(3);
    const cliArgs = project ? rawArgs.slice(1) : rawArgs;
    await runCommand(project, cliArgs);
  });

// IDE launcher command
program
  .command('ide [editor] [args...]')
  .description('Launch an IDE (code, cursor, nvim, etc.) with active Copilot account credentials')
  .allowUnknownOption()
  .action(async (editor: string = 'code', args: string[] = []) => {
    await ideCommand(editor, args.length > 0 ? args : ['.']);
  });

program
  .command('code [args...]')
  .description('Launch VS Code directly with active Copilot account credentials')
  .allowUnknownOption()
  .action(async (args: string[] = []) => {
    await ideCommand('code', args.length > 0 ? args : ['.']);
  });

program
  .command('cursor [args...]')
  .description('Launch Cursor directly with active Copilot account credentials')
  .allowUnknownOption()
  .action(async (args: string[] = []) => {
    await ideCommand('cursor', args.length > 0 ? args : ['.']);
  });

// Environment variable output command
program
  .command('env [format]')
  .description('Export active account token for your shell (powershell, bash, cmd)')
  .action((format: string = 'powershell') => {
    envCommand(format);
  });

// Doctor command
program
  .command('doctor')
  .description('Run health and configuration diagnostic checks')
  .action(async () => {
    await doctorCommand();
  });

// Logs command
program
  .command('logs')
  .description('Show account events and switching history')
  .option('-n, --lines <number>', 'Number of recent log entries to show', '25')
  .action((options: { lines: string }) => {
    logsCommand(parseInt(options.lines, 10) || 25);
  });

// Settings command
program
  .command('settings [key] [value]')
  .description('View or edit CPM configuration')
  .action((key?: string, value?: string) => {
    settingsCommand(key, value);
  });

program.parse(process.argv);
