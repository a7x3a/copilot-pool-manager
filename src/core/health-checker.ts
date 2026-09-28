import { execSync } from 'child_process';
import fs from 'fs';
import { Account, AccountStatus, DoctorCheckItem, DoctorResult, ErrorClassification } from '../types';
import { AccountManager, accountManager } from './account-manager';
import { ProjectManager, projectManager } from './project-manager';
import { tokenManager, TokenManager } from '../auth/token-manager';
import { validateGitHubToken } from '../auth/github-auth';
import { getConfig, getDbPath, getConfigPath } from '../config/config';
import { getRawDb } from '../db/client';
import { logger } from '../logging/logger';
import { cooldownManager } from './cooldown-manager';

export function classifyError(errorOutput: string, exitCode?: number): ErrorClassification {
  const lower = (errorOutput || '').toLowerCase();

  // Rate limit patterns
  if (
    lower.includes('rate limit') ||
    lower.includes('quota exceeded') ||
    lower.includes('too many requests') ||
    lower.includes('status 429') ||
    lower.includes('429 too many') ||
    lower.includes('secondary rate limit')
  ) {
    return 'RATE_LIMIT';
  }

  // Auth error patterns
  if (
    lower.includes('bad credentials') ||
    lower.includes('authentication failed') ||
    lower.includes('status 401') ||
    lower.includes('unauthorized') ||
    lower.includes('token expired') ||
    lower.includes('copilot subscription') ||
    lower.includes('requires copilot') ||
    lower.includes('not authorized')
  ) {
    return 'AUTH_ERROR';
  }

  // Network error patterns
  if (
    lower.includes('enotfound') ||
    lower.includes('econnrefused') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout') ||
    lower.includes('network error') ||
    lower.includes('fetch failed') ||
    lower.includes('dns lookup failed')
  ) {
    return 'NETWORK_ERROR';
  }

  // Service / 5xx error patterns
  if (
    lower.includes('500 internal') ||
    lower.includes('502 bad gateway') ||
    lower.includes('503 service unavailable') ||
    lower.includes('service error') ||
    lower.includes('server error')
  ) {
    return 'SERVICE_ERROR';
  }

  // Model error patterns
  if (
    lower.includes('model unavailable') ||
    lower.includes('context length exceeded') ||
    lower.includes('maximum context length') ||
    lower.includes('unsupported model')
  ) {
    return 'MODEL_ERROR';
  }

  // CLI error patterns
  if (
    lower.includes('command not found') ||
    lower.includes('is not recognized as an internal or external command') ||
    (exitCode !== undefined && exitCode !== 0)
  ) {
    return 'CLI_ERROR';
  }

  return 'UNKNOWN';
}

export class HealthChecker {
  private accMgr: AccountManager;
  private projMgr: ProjectManager;
  private tokenMgr: TokenManager;

  constructor(
    accMgr: AccountManager = accountManager,
    projMgr: ProjectManager = projectManager,
    tokenMgr: TokenManager = tokenManager
  ) {
    this.accMgr = accMgr;
    this.projMgr = projMgr;
    this.tokenMgr = tokenMgr;
  }

  public async checkAccountHealth(account: Account): Promise<{
    status: AccountStatus;
    valid: boolean;
    message: string;
  }> {
    const token = this.tokenMgr.getToken(account.credentialReference);
    const now = Date.now();

    if (!token) {
      this.accMgr.updateStatus(account.id, 'AUTH_ERROR', 'No token found in credential store');
      return { status: 'AUTH_ERROR', valid: false, message: 'Missing token in secure credential store' };
    }

    try {
      const result = await validateGitHubToken(token);
      if (result.valid) {
        // If account was in AUTH_ERROR, restore to READY
        const newStatus: AccountStatus = account.status === 'AUTH_ERROR' ? 'READY' : account.status;
        this.accMgr.updateStatus(account.id, newStatus, null);
        return { status: newStatus, valid: true, message: 'Authenticated and healthy' };
      } else {
        if (result.statusCode === 429) {
          cooldownManager.setCooldown(account.id, 15, 'Rate limited during health check');
          return { status: 'COOLDOWN', valid: false, message: 'Rate limit detected (HTTP 429)' };
        } else {
          this.accMgr.updateStatus(account.id, 'AUTH_ERROR', result.error || 'Authentication check failed');
          return { status: 'AUTH_ERROR', valid: false, message: result.error || 'Authentication check failed' };
        }
      }
    } catch (err: any) {
      return { status: account.status, valid: false, message: `Check failed: ${err.message}` };
    }
  }

  public async runDoctor(): Promise<DoctorResult> {
    const config = getConfig();
    const system: DoctorCheckItem[] = [];
    const accounts: DoctorCheckItem[] = [];
    const projects: DoctorCheckItem[] = [];

    // 1. Check Node.js
    try {
      const nodeVersion = process.version;
      const major = parseInt(nodeVersion.replace('v', '').split('.')[0], 10);
      if (major >= 18) {
        system.push({ name: 'Node.js', status: 'ok', message: nodeVersion });
      } else {
        system.push({ name: 'Node.js', status: 'warn', message: `${nodeVersion} (LTS >= 18 recommended)` });
      }
    } catch {
      system.push({ name: 'Node.js', status: 'fail', message: 'Unknown' });
    }

    // 2. Check Copilot CLI
    try {
      const cmd = config.copilotCommand || 'copilot';
      const versionOut = execSync(`${cmd} --version`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      }).trim();
      system.push({ name: 'Copilot CLI', status: 'ok', message: versionOut });
    } catch {
      system.push({
        name: 'Copilot CLI',
        status: 'warn',
        message: `Command "${config.copilotCommand}" not found in PATH. Install via "gh extension install github/gh-copilot" or official installer.`,
      });
    }

    // 3. Check SQLite & Database
    try {
      const db = getRawDb();
      const test = db.prepare('SELECT 1 as val').get() as { val: number };
      if (test.val === 1) {
        system.push({ name: 'SQLite & Database', status: 'ok', message: getDbPath() });
      } else {
        system.push({ name: 'SQLite & Database', status: 'fail', message: 'Query failed' });
      }
    } catch (err: any) {
      system.push({ name: 'SQLite & Database', status: 'fail', message: err.message });
    }

    // 4. Check Credential Store
    try {
      const hasKeyring = typeof require('@napi-rs/keyring').Entry === 'function';
      if (hasKeyring) {
        system.push({ name: 'Credential Store', status: 'ok', message: 'Windows Credential Manager' });
      } else {
        system.push({ name: 'Credential Store', status: 'warn', message: 'Encrypted fallback storage' });
      }
    } catch {
      system.push({ name: 'Credential Store', status: 'ok', message: 'Encrypted secure storage' });
    }

    // 5. Check Configuration
    try {
      const configPath = getConfigPath();
      if (fs.existsSync(configPath)) {
        system.push({ name: 'Configuration', status: 'ok', message: configPath });
      } else {
        system.push({ name: 'Configuration', status: 'warn', message: 'Using default configuration' });
      }
    } catch {
      system.push({ name: 'Configuration', status: 'fail', message: 'Error reading config' });
    }

    // 6. Check Accounts
    const allAccounts = this.accMgr.listAccounts();
    if (allAccounts.length === 0) {
      accounts.push({
        name: 'Accounts',
        status: 'warn',
        message: 'No accounts registered. Run "cpm add" to add an account.',
      });
    } else {
      for (const acc of allAccounts) {
        const health = await this.checkAccountHealth(acc);
        const name = `${acc.id} ${acc.githubUsername}`;
        if (health.valid) {
          accounts.push({ name, status: 'ok', message: 'authenticated' });
        } else if (health.status === 'COOLDOWN' || health.status === 'LIMITED') {
          const wait = cooldownManager.formatCooldown(acc);
          accounts.push({ name, status: 'warn', message: `limited (cooldown ${wait})` });
        } else {
          accounts.push({ name, status: 'fail', message: health.message });
        }
      }
    }

    // 7. Check Projects
    const allProjects = this.projMgr.listProjects();
    if (allProjects.length === 0) {
      projects.push({
        name: 'Projects',
        status: 'ok',
        message: 'No projects registered (cpm run works in current directory)',
      });
    } else {
      for (const proj of allProjects) {
        if (fs.existsSync(proj.path)) {
          projects.push({ name: proj.name, status: 'ok', message: proj.path });
        } else {
          projects.push({ name: proj.name, status: 'fail', message: `Path not found: ${proj.path}` });
        }
      }
    }

    return { system, accounts, projects };
  }
}

export const healthChecker = new HealthChecker();
