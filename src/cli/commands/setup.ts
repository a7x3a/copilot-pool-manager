import prompts from 'prompts';
import pc from 'picocolors';
import { accountManager } from '../../core/account-manager';
import { projectManager } from '../../core/project-manager';
import { healthChecker } from '../../core/health-checker';
import { logSuccess, logError, logInfo } from '../../terminal/progress';

export async function setupWizardCommand(): Promise<void> {
  const line = '─'.repeat(62);
  console.log('\n' + pc.cyan(`╭${line}╮`));
  console.log(pc.cyan(`│`) + pc.bold('            Welcome to Copilot Pool Manager (CPM)             ') + pc.cyan(`│`));
  console.log(pc.cyan(`╰${line}╯`) + '\n');

  console.log(
    `CPM pools multiple GitHub Copilot accounts using direct API Keys / Tokens.\nNo browser logins or complex setups required.\n`
  );

  // Step 1: Pre-flight Diagnostic
  console.log(pc.bold('Step 1: Environment Check'));
  console.log('────────────────────────────────────────');
  const doctor = await healthChecker.runDoctor();
  for (const item of doctor.system) {
    const icon = item.status === 'ok' ? pc.green('✓') : pc.yellow('!');
    console.log(` ${item.name.padEnd(22)} ${icon}  ${item.message}`);
  }
  console.log('');

  // Step 2: Account Pool Setup
  console.log(pc.bold('Step 2: Add Accounts to Pool'));
  console.log('────────────────────────────────────────');
  console.log(`  ${pc.bold('Note:')} Use ${pc.green(pc.bold('Generate new token (classic)'))} at ${pc.cyan(pc.underline('https://github.com/settings/tokens'))}`);
  console.log(`  Scopes needed: ${pc.bold('repo')} (code context) & ${pc.bold('read:user')} (profile identity).\n`);

  const countResp = await prompts({
    type: 'number',
    name: 'accountCount',
    message: 'How many GitHub Copilot accounts would you like to pool?',
    initial: 2,
    min: 1,
    max: 10,
  });

  const targetCount = countResp.accountCount || 1;

  for (let i = 1; i <= targetCount; i++) {
    console.log(`\n${pc.cyan(pc.bold(`── Account [${i} of ${targetCount}] ──`))}`);

    const tokenResp = await prompts({
      type: 'password',
      name: 'token',
      message: `Paste GitHub Copilot Token / API Key for Account #${i}:`,
      validate: (v: string) => (v && v.trim().length > 0 ? true : 'Token cannot be empty'),
    });

    if (!tokenResp.token) {
      console.log(pc.dim(`Skipping account #${i}...`));
      continue;
    }

    const token = tokenResp.token.trim();

    try {
      logInfo(`Validating API key with GitHub...`);
      const acc = await accountManager.addAccount({ token });
      logSuccess(`Account #${acc.id} (@${acc.githubUsername}) registered into the pool!`);
      if (i === 1) {
        accountManager.setActiveAccount(acc.id);
      }
    } catch (err: any) {
      logError(`Failed to add account: ${err.message}`);
    }
  }

  // Step 3: Optional Project Setup
  console.log(`\n${pc.bold('Step 3: Project Configuration (Optional)')}`);
  console.log('────────────────────────────────────────');

  const projResp = await prompts({
    type: 'confirm',
    name: 'addProject',
    message: 'Would you like to register your current directory as a project?',
    initial: true,
  });

  if (projResp.addProject) {
    const cwd = process.cwd();
    const defaultName = require('path').basename(cwd);

    const nameResp = await prompts({
      type: 'text',
      name: 'name',
      message: 'Enter project name:',
      initial: defaultName,
    });

    if (nameResp.name) {
      try {
        const proj = projectManager.addProject(nameResp.name, cwd, 'AUTO');
        logSuccess(`Project "${proj.name}" registered for directory: ${proj.path}`);
      } catch (err: any) {
        console.log(pc.dim(`Note: ${err.message}`));
      }
    }
  }

  // Final Summary & Cheatsheet
  console.log(`\n${pc.bold('Setup Complete! Quick Reference Guide')}`);
  console.log('────────────────────────────────────────');
  console.log(`  ${pc.cyan('cpm code .')}             Open VS Code with active Copilot account`);
  console.log(`  ${pc.cyan('cpm cursor .')}           Open Cursor with active Copilot account`);
  console.log(`  ${pc.cyan('cpm')}                   Launch interactive visual dashboard`);
  console.log(`  ${pc.cyan('cpm switch')}             Switch active account`);
  console.log(`  ${pc.cyan('cpm doctor')}             Check system and account health`);
  console.log(`  ${pc.cyan('cpm run')}                Start Copilot CLI (requires Copilot CLI installed)\n`);
}
