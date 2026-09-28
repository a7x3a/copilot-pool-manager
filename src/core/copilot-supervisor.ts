import { spawn, ChildProcess } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import pc from 'picocolors';
import { Account } from '../types';
import { accountManager } from './account-manager';
import { accountSelector } from './account-selector';
import { tokenManager } from '../auth/token-manager';
import { cooldownManager } from './cooldown-manager';
import { usageManager } from './usage-manager';
import { logger } from '../logging/logger';
import { getDb } from '../db/client';
import { eventsTable } from '../db/schema';
import { classifyError } from './health-checker';

export interface SupervisorOptions {
  command: string;
  argsPrefix?: string[];
  cliArgs: string[];
  cwd: string;
  initialAccount: Account;
  projectId?: string;
  maxRotations?: number;
}

const RATE_LIMIT_REGEX = /(?:status\s*429|429\s*too\s*many|rate\s*limit|secondary\s*rate\s*limit|quota\s*exceeded|exceeded\s*(?:your\s*)?(?:monthly\s*)?quota|usage\s*limit\s*reached|you\s*have\s*exceeded\s*your(?:\s*\w+)*\s*(?:rate\s*limit|quota)|insufficient\s*quota)/i;

export class CopilotSupervisor {
  private command: string;
  private argsPrefix: string[];
  private cliArgs: string[];
  private cwd: string;
  private currentAccount: Account;
  private projectId?: string;
  private maxRotations: number;
  private currentChild: ChildProcess | null = null;
  private sessionId: string;
  private rotationCount = 0;

  constructor(options: SupervisorOptions) {
    this.command = options.command;
    this.argsPrefix = options.argsPrefix || [];
    this.cliArgs = options.cliArgs;
    this.cwd = options.cwd;
    this.currentAccount = options.initialAccount;
    this.projectId = options.projectId;
    this.maxRotations = options.maxRotations ?? 5;
    this.sessionId = crypto.randomUUID();
  }

  public async run(): Promise<number> {
    const isWindows = process.platform === 'win32';

    while (this.rotationCount <= this.maxRotations) {
      const account = this.currentAccount;
      const token = tokenManager.getToken(account.credentialReference);

      if (!token) {
        accountManager.updateStatus(account.id, 'AUTH_ERROR', 'Credential not found in secure store');
        throw new Error(`Credential for account @${account.githubUsername} (#${account.id}) not found.`);
      }

      accountManager.setActiveAccount(account.id);

      const env: NodeJS.ProcessEnv = {
        ...process.env,
        COPILOT_GITHUB_TOKEN: token,
        GH_TOKEN: token,
        GITHUB_TOKEN: token,
      };

      // Determine CLI arguments
      let runArgs = [...this.argsPrefix, ...this.cliArgs];

      // If rotating after a rate limit, attempt to resume the session if not already specified
      if (this.rotationCount > 0) {
        const hasResume = runArgs.some((a) => a.includes('--resume') || a.includes('-r'));
        if (!hasResume) {
          runArgs.push(`--resume=${this.sessionId}`);
        }
      }

      const formattedArgs = isWindows
        ? runArgs.map((arg) => (arg.includes(' ') && !arg.startsWith('"') ? `"${arg}"` : arg))
        : runArgs;

      const now = Date.now();
      const db = getDb();

      db.insert(eventsTable).values({
        accountId: account.id,
        timestamp: now,
        eventType: 'CLI_STARTED',
        message: `Supervisor launched ${this.command} with account @${account.githubUsername} (#${account.id})`,
        projectId: this.projectId || null,
        metadata: JSON.stringify({ args: formattedArgs, rotation: this.rotationCount }),
      }).run();

      logger.logStructuredEvent({
        accountId: account.id,
        timestamp: now,
        eventType: 'CLI_STARTED',
        message: `Supervisor launched ${this.command} with account @${account.githubUsername} (#${account.id})`,
        projectId: this.projectId || null,
        metadata: null,
      });

      // Interactive sessions (no -p flag) require stdio: 'inherit' for Windows Console TUI
      const isInteractive = Boolean(process.stdin.isTTY) && !this.cliArgs.some((a) => a === '-p' || a.startsWith('-p='));

      const exitResult = await this.spawnAndMonitor(this.command, formattedArgs, env, isInteractive);

      if (exitResult.shouldRotate) {
        this.rotationCount++;
        cooldownManager.setCooldown(account.id, undefined, exitResult.reason || 'Real-time rate limit detected by CPM supervisor');

        try {
          cooldownManager.checkAndExpireCooldowns();
          const nextAccount = accountSelector.selectAccount({ projectId: this.projectId });

          console.log('\n' + pc.bold(pc.yellow('  ⚡ [CPM SUPERVISOR] ')) +
            pc.yellow(`Rate limit observed on account #${account.id} (@${account.githubUsername}).`) +
            pc.cyan(` Auto-switching to #${nextAccount.id} (@${nextAccount.githubUsername})...\n`)
          );

          accountSelector.recordSelection(nextAccount, this.projectId, account.id);
          this.currentAccount = nextAccount;
          continue; // Re-run with the next account
        } catch (err: any) {
          console.log('\n' + pc.bold(pc.red('  ✖ [CPM SUPERVISOR] ')) + pc.red(`Cannot auto-rotate: ${err.message}\n`));
          return 1;
        }
      }

      // Completed normally or non-rate-limit exit
      accountManager.markUsed(account.id);
      return exitResult.exitCode;
    }

    console.log('\n' + pc.bold(pc.yellow('  ⚠ [CPM SUPERVISOR] ')) + pc.yellow('Reached maximum account rotation attempts.') + '\n');
    return 1;
  }

  private spawnAndMonitor(
    command: string,
    args: string[],
    env: NodeJS.ProcessEnv,
    isInteractive: boolean
  ): Promise<{ exitCode: number; shouldRotate: boolean; reason?: string }> {
    return new Promise((resolve) => {
      let shouldRotate = false;
      let rotationReason = '';
      let streamBuffer = '';
      let stopLogWatcher: (() => void) | null = null;

      const stdioConfig = isInteractive ? 'inherit' : ['inherit', 'pipe', 'pipe'];

      const child = spawn(command, args, {
        cwd: this.cwd,
        env,
        stdio: stdioConfig as any,
        shell: true,
      });

      this.currentChild = child;

      const triggerRotation = (reason: string) => {
        if (shouldRotate) return;
        shouldRotate = true;
        rotationReason = reason;

        try {
          if (process.platform === 'win32' && child.pid) {
            spawn('taskkill', ['/pid', child.pid.toString(), '/f', '/t'], { stdio: 'ignore' });
          } else {
            child.kill('SIGTERM');
          }
        } catch {
          child.kill();
        }
      };

      if (isInteractive && child.pid) {
        // When running interactive TTY, monitor Copilot's process log in background
        stopLogWatcher = this.startCopilotLogWatcher(child.pid, (reason) => {
          triggerRotation(reason);
        });
      } else {
        // Stream inspection for non-interactive / piped execution
        const handleChunk = (chunk: Buffer) => {
          const text = chunk.toString();
          streamBuffer += text;
          if (streamBuffer.length > 8192) {
            streamBuffer = streamBuffer.slice(-4096);
          }

          if (RATE_LIMIT_REGEX.test(streamBuffer)) {
            triggerRotation('Rate limit or quota exceeded detected in stream');
          }

          const usageData = usageManager.parseCopilotOutput(text);
          if (usageData) {
            usageManager.recordUsage({
              accountId: this.currentAccount.id,
              projectId: this.projectId,
              credits: usageData.credits,
              tokens: usageData.tokens,
              source: 'SUPERVISOR_STREAM',
              rawSummary: text.trim().slice(0, 200),
            });
          }
        };

        child.stdout?.on('data', (data: Buffer) => {
          handleChunk(data);
          process.stdout.write(data);
        });

        child.stderr?.on('data', (data: Buffer) => {
          handleChunk(data);
          process.stderr.write(data);
        });
      }

      child.on('error', (err: any) => {
        const errorType = classifyError(err.message);
        if (errorType === 'RATE_LIMIT') {
          triggerRotation(err.message);
        }
      });

      child.on('close', (code: number | null) => {
        if (stopLogWatcher) {
          stopLogWatcher();
        }
        this.currentChild = null;
        resolve({
          exitCode: code ?? 0,
          shouldRotate,
          reason: rotationReason,
        });
      });
    });
  }

  private startCopilotLogWatcher(pid: number, onRateLimit: (reason: string) => void): () => void {
    const home = process.env.USERPROFILE || process.env.HOME || '.';
    const logsDir = path.join(home, '.copilot', 'logs');
    let stopped = false;
    let lastSize = 0;
    let logFile: string | null = null;

    const interval = setInterval(() => {
      if (stopped) return;
      try {
        if (!logFile && fs.existsSync(logsDir)) {
          const files = fs.readdirSync(logsDir);
          const match = files.find((f) => f.includes(`-${pid}.log`));
          if (match) {
            logFile = path.join(logsDir, match);
          }
        }

        if (logFile && fs.existsSync(logFile)) {
          const stats = fs.statSync(logFile);
          if (stats.size > lastSize) {
            const fd = fs.openSync(logFile, 'r');
            const buffer = Buffer.alloc(stats.size - lastSize);
            fs.readSync(fd, buffer, 0, buffer.length, lastSize);
            fs.closeSync(fd);
            lastSize = stats.size;

            const content = buffer.toString('utf8');
            if (RATE_LIMIT_REGEX.test(content)) {
              stopped = true;
              clearInterval(interval);
              onRateLimit('Rate limit detected in Copilot log');
            }
          }
        }
      } catch {
        // Silently continue polling
      }
    }, 500);

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }
}
