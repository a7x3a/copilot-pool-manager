import { spawn, execSync } from 'child_process';
import path from 'path';
import pc from 'picocolors';
import { Account } from '../types';
import { AccountManager, accountManager } from './account-manager';
import { AccountSelector, accountSelector } from './account-selector';
import { ProjectManager, projectManager } from './project-manager';
import { TokenManager, tokenManager } from '../auth/token-manager';
import { CooldownManager, cooldownManager } from './cooldown-manager';
import { getConfig } from '../config/config';
import { logger } from '../logging/logger';
import { getDb } from '../db/client';
import { eventsTable } from '../db/schema';
import { classifyError } from './health-checker';

export interface RunOptions {
  projectName?: string;
  accountId?: string;
  cliArgs?: string[];
  cwd?: string;
}

export class CopilotRunner {
  private accMgr: AccountManager;
  private accSelector: AccountSelector;
  private projMgr: ProjectManager;
  private tokenMgr: TokenManager;
  private cdMgr: CooldownManager;

  constructor(
    accMgr: AccountManager = accountManager,
    accSelector: AccountSelector = accountSelector,
    projMgr: ProjectManager = projectManager,
    tokenMgr: TokenManager = tokenManager,
    cdMgr: CooldownManager = cooldownManager
  ) {
    this.accMgr = accMgr;
    this.accSelector = accSelector;
    this.projMgr = projMgr;
    this.tokenMgr = tokenMgr;
    this.cdMgr = cdMgr;
  }

  public async run(options: RunOptions = {}): Promise<number> {
    const config = getConfig();
    const copilotCmd = config.copilotCommand || 'copilot';

    // 0. Pre-flight check: Verify if Copilot CLI binary exists in PATH
    const isWindows = process.platform === 'win32';
    const binaryName = copilotCmd.trim().split(/\s+/)[0];
    let commandFound = false;
    try {
      const checkBinary = isWindows ? `where ${binaryName}` : `which ${binaryName}`;
      execSync(checkBinary, { stdio: 'ignore', windowsHide: true });
      commandFound = true;
    } catch {
      // If standalone 'copilot' not found, check if 'gh copilot' is available
      if (binaryName === 'copilot') {
        try {
          execSync('gh copilot --version', { stdio: 'ignore', windowsHide: true });
          commandFound = true;
        } catch {
          commandFound = false;
        }
      }
    }

    if (!commandFound) {
      throw new Error(
        `GitHub Copilot CLI ("${copilotCmd}") is not installed or not in your PATH.\n\n` +
        `To install the official Copilot CLI:\n` +
        `  1. Install GitHub CLI: winget install --id GitHub.cli\n` +
        `  2. Install Copilot extension: gh extension install github/gh-copilot\n\n` +
        `Or to code directly in VS Code with your active account, simply run:\n` +
        `  cpm code .\n`
      );
    }

    // 1. Determine working directory and project
    let targetCwd = options.cwd || process.cwd();
    let projectId: string | undefined;
    let preferredAccount: string | undefined;

    if (options.projectName) {
      const proj = this.projMgr.getProject(options.projectName);
      if (!proj) {
        throw new Error(`Project "${options.projectName}" not found. Run "cpm projects" to view registered projects.`);
      }
      targetCwd = proj.path;
      projectId = proj.id;
      preferredAccount = proj.preferredAccountId;
    } else {
      const proj = this.projMgr.getProjectByPath(targetCwd);
      if (proj) {
        projectId = proj.id;
        preferredAccount = proj.preferredAccountId;
      }
    }

    // 2. Select account
    const account: Account = this.accSelector.selectAccount({
      projectId,
      preferredAccountId: preferredAccount,
      explicitAccountId: options.accountId,
    });

    // 3. Retrieve credential securely
    const token = this.tokenMgr.getToken(account.credentialReference);
    if (!token) {
      this.accMgr.updateStatus(account.id, 'AUTH_ERROR', 'Credential not found in secure store');
      throw new Error(`Credential for account ${account.githubUsername} (#${account.id}) not found. Run "cpm login ${account.id}" to authenticate.`);
    }

    // Mark account active and record selection
    this.accMgr.setActiveAccount(account.id);
    this.accSelector.recordSelection(account, projectId);

    // 4. Prepare environment with official Copilot CLI authentication variables
    const cleanEnv: NodeJS.ProcessEnv = {
      ...process.env,
      COPILOT_GITHUB_TOKEN: token,
      GH_TOKEN: token,
      GITHUB_TOKEN: token,
    };

    const cliArgs = options.cliArgs || [];
    const now = Date.now();

    const db = getDb();
    db.insert(eventsTable).values({
      accountId: account.id,
      timestamp: now,
      eventType: 'CLI_STARTED',
      message: `Launched ${copilotCmd} with account ${account.githubUsername} (#${account.id})`,
      projectId: projectId || null,
      metadata: JSON.stringify({ args: cliArgs, cwd: targetCwd }),
    }).run();

    logger.logStructuredEvent({
      accountId: account.id,
      timestamp: now,
      eventType: 'CLI_STARTED',
      message: `Launched ${copilotCmd} with account ${account.githubUsername} (#${account.id})`,
      projectId: projectId || null,
      metadata: null,
    });

    // 5. Launch Copilot CLI transparently
    return new Promise<number>((resolve, reject) => {
      const child = spawn(copilotCmd, cliArgs, {
        cwd: targetCwd,
        env: cleanEnv,
        stdio: 'inherit',
        shell: true,
      });

      child.on('error', (err: any) => {
        const errorType = classifyError(err.message);
        logger.error(`Failed to launch ${copilotCmd} (${errorType}): ${err.message}`);

        db.insert(eventsTable).values({
          accountId: account.id,
          timestamp: Date.now(),
          eventType: 'CLI_EXITED',
          message: `Process error (${errorType}): ${err.message}`,
          projectId: projectId || null,
          metadata: null,
        }).run();

        if (errorType === 'CLI_ERROR') {
          reject(new Error(`Failed to start "${copilotCmd}". Ensure GitHub Copilot CLI is installed and in your PATH.`));
        } else {
          reject(err);
        }
      });

      child.on('close', (code: number | null) => {
        const exitCode = code ?? 0;
        const exitTime = Date.now();

        this.accMgr.markUsed(account.id);

        db.insert(eventsTable).values({
          accountId: account.id,
          timestamp: exitTime,
          eventType: 'CLI_EXITED',
          message: `Copilot CLI exited with code ${exitCode}`,
          projectId: projectId || null,
          metadata: JSON.stringify({ exitCode }),
        }).run();

        logger.logStructuredEvent({
          accountId: account.id,
          timestamp: exitTime,
          eventType: 'CLI_EXITED',
          message: `Copilot CLI exited with code ${exitCode}`,
          projectId: projectId || null,
          metadata: null,
        });

        resolve(exitCode);
      });
    });
  }
}

export const copilotRunner = new CopilotRunner();
