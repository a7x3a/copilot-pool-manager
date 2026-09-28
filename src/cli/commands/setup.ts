import prompts from 'prompts';
import pc from 'picocolors';
import { accountManager } from '../../core/account-manager';
import { projectManager } from '../../core/project-manager';
import { healthChecker } from '../../core/health-checker';
import { requestDeviceCode, pollDeviceToken, validateGitHubToken } from '../../auth/github-auth';
import { logSuccess, logError, logInfo } from '../../terminal/progress';

export async function setupWizardCommand(): Promise<void> {
  const line = '─'.repeat(62);
  console.log('\n' + pc.cyan(`╭${line}╮`));
  console.log(pc.cyan(`│`) + pc.bold('            Welcome to Copilot Pool Manager (CPM)             ') + pc.cyan(`│`));
  console.log(pc.cyan(`╰${line}╯`) + '\n');

  console.log(
    `CPM pools multiple GitHub Copilot accounts, keeping you coding continuously\nby automatically tracking rate limits, cooldowns, and seamless switching.\n`
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

  const countResp = await prompts({
    type: 'number',
    name: 'accountCount',
    message: 'How many GitHub Copilot accounts would you like to set up now?',
    initial: 2,
    min: 1,
    max: 10,
  });

  const targetCount = countResp.accountCount || 1;

  for (let i = 1; i <= targetCount; i++) {
    console.log(`\n${pc.cyan(pc.bold(`── Config Account [${i} of ${targetCount}] ──`))}\n`);

    const methodResp = await prompts({
      type: 'select',
      name: 'method',
      message: `How would you like to authenticate Account #${i}?`,
      choices: [
        { title: 'Personal Access Token (PAT) - Quick & direct', value: 'token' },
        { title: 'GitHub OAuth Device Flow - Browser login', value: 'device' },
      ],
    });

    if (!methodResp.method) {
      console.log(pc.dim(`Skipping account #${i}...`));
      continue;
    }

    let token = '';

    if (methodResp.method === 'token') {
      const tokenResp = await prompts({
        type: 'password',
        name: 'token',
        message: 'Paste your GitHub Personal Access Token (or Copilot token):',
        validate: (v: string) => (v && v.trim().length > 0 ? true : 'Token cannot be empty'),
      });

      if (!tokenResp.token) {
        console.log(pc.dim(`Skipping account #${i}...`));
        continue;
      }
      token = tokenResp.token.trim();
    } else {
      try {
        logInfo('Requesting device authorization code from GitHub...');
        const devCode = await requestDeviceCode();

        console.log('\n' + pc.bold('GitHub Device Authorization:'));
        console.log(`  1. Open: ${pc.cyan(pc.underline(devCode.verification_uri))}`);
        console.log(`  2. Enter code: ${pc.green(pc.bold(devCode.user_code))}\n`);

        logInfo('Waiting for browser authentication...');
        token = await pollDeviceToken(devCode.device_code, devCode.interval, devCode.expires_in);
      } catch (err: any) {
        logError(`Device authentication failed: ${err.message}`);
        continue;
      }
    }

    try {
      logInfo(`Validating credentials with GitHub...`);
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
  console.log(`  ${pc.cyan('cpm')}                   Launch interactive dashboard`);
  console.log(`  ${pc.cyan('cpm run')}               Start Copilot CLI in current project`);
  console.log(`  ${pc.cyan('cpm switch [account]')}   Manually switch active account`);
  console.log(`  ${pc.cyan('cpm ide <code|cursor>')}  Launch IDE with active Copilot account`);
  console.log(`  ${pc.cyan('cpm doctor')}            Check system and account health`);
  console.log(`  ${pc.cyan('cpm usage')}             View observable usage & limits\n`);
}
