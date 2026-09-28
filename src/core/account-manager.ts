import { eq, or } from 'drizzle-orm';
import { getDb } from '../db/client';
import { accountsTable, eventsTable } from '../db/schema';
import { Account, AccountStatus, NewAccount } from '../types';
import { tokenManager, TokenManager } from '../auth/token-manager';
import { validateGitHubToken } from '../auth/github-auth';
import { cooldownManager } from './cooldown-manager';
import { logger } from '../logging/logger';

export class AccountManager {
  private tokenMgr: TokenManager;

  constructor(tokenMgr: TokenManager = tokenManager) {
    this.tokenMgr = tokenMgr;
  }

  public getNextAccountId(): string {
    const db = getDb();
    const accounts = db.select({ id: accountsTable.id }).from(accountsTable).all();
    const existingNums = accounts
      .map((a) => parseInt(a.id, 10))
      .filter((n) => !isNaN(n));

    const max = existingNums.length > 0 ? Math.max(...existingNums) : 0;
    const next = max + 1;
    return next.toString().padStart(2, '0');
  }

  public listAccounts(): Account[] {
    cooldownManager.checkAndExpireCooldowns();
    const db = getDb();
    return db.select().from(accountsTable).all() as Account[];
  }

  public getAccount(idOrUsername: string): Account | null {
    cooldownManager.checkAndExpireCooldowns();
    const db = getDb();
    const search = idOrUsername.trim().toLowerCase();

    const results = db
      .select()
      .from(accountsTable)
      .where(
        or(
          eq(accountsTable.id, idOrUsername.trim()),
          eq(accountsTable.githubUsername, search)
        )
      )
      .all() as Account[];

    return results.length > 0 ? results[0] : null;
  }

  public async addAccount(params: {
    githubUsername?: string;
    displayName?: string;
    token: string;
    copilotPlan?: string;
    skipValidation?: boolean;
  }): Promise<Account> {
    const { token, skipValidation } = params;
    let username = params.githubUsername?.trim() || '';
    let displayName = params.displayName?.trim() || '';
    let plan = params.copilotPlan || 'individual';

    if (!skipValidation) {
      const validation = await validateGitHubToken(token);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid GitHub token');
      }
      if (validation.user) {
        username = validation.user.username;
        displayName = displayName || validation.user.name || username;
        plan = validation.user.copilotPlan || plan;
      }
    }

    if (!username) {
      throw new Error('GitHub username is required');
    }

    // Check if account already exists
    const existing = this.getAccount(username);
    if (existing) {
      // Re-authenticate existing account
      this.tokenMgr.saveToken(username, token);
      const now = Date.now();
      const db = getDb();
      db.update(accountsTable)
        .set({
          status: 'READY',
          lastAuthenticatedAt: now,
          lastError: null,
          copilotPlan: plan,
          displayName: displayName || existing.displayName,
          updatedAt: now,
        })
        .where(eq(accountsTable.id, existing.id))
        .run();

      db.insert(eventsTable).values({
        accountId: existing.id,
        timestamp: now,
        eventType: 'LOGIN',
        message: `Account re-authenticated: ${username}`,
        projectId: null,
        metadata: null,
      }).run();

      logger.logStructuredEvent({
        accountId: existing.id,
        timestamp: now,
        eventType: 'LOGIN',
        message: `Account re-authenticated: ${username}`,
        projectId: null,
        metadata: null,
      });

      return this.getAccount(existing.id)!;
    }

    const id = this.getNextAccountId();
    const credentialReference = this.tokenMgr.saveToken(username, token);
    const now = Date.now();

    const newAccount: NewAccount = {
      id,
      githubUsername: username.toLowerCase(),
      displayName: displayName || username,
      credentialReference,
      copilotPlan: plan,
      status: 'READY',
      lastAuthenticatedAt: now,
      lastUsedAt: null,
      lastHealthCheckAt: now,
      lastError: null,
      cooldownUntil: null,
      createdAt: now,
      updatedAt: now,
    };

    const db = getDb();
    db.insert(accountsTable).values(newAccount as any).run();

    db.insert(eventsTable).values({
      accountId: id,
      timestamp: now,
      eventType: 'LOGIN',
      message: `Account registered: ${username}`,
      projectId: null,
      metadata: null,
    }).run();

    logger.logStructuredEvent({
      accountId: id,
      timestamp: now,
      eventType: 'LOGIN',
      message: `Account registered: ${username}`,
      projectId: null,
      metadata: null,
    });

    return this.getAccount(id)!;
  }

  public updateStatus(id: string, status: AccountStatus, error?: string | null): void {
    const now = Date.now();
    const db = getDb();
    db.update(accountsTable)
      .set({
        status,
        lastError: error ?? null,
        updatedAt: now,
      })
      .where(eq(accountsTable.id, id))
      .run();
  }

  public markUsed(id: string): void {
    const now = Date.now();
    const db = getDb();
    db.update(accountsTable)
      .set({
        lastUsedAt: now,
        updatedAt: now,
      })
      .where(eq(accountsTable.id, id))
      .run();
  }

  public setActiveAccount(id: string): void {
    const now = Date.now();
    const db = getDb();

    // Reset currently ACTIVE accounts to READY
    const currentActive = db
      .select()
      .from(accountsTable)
      .where(eq(accountsTable.status, 'ACTIVE'))
      .all() as Account[];

    for (const acc of currentActive) {
      if (acc.id !== id) {
        db.update(accountsTable)
          .set({ status: 'READY', updatedAt: now })
          .where(eq(accountsTable.id, acc.id))
          .run();
      }
    }

    db.update(accountsTable)
      .set({ status: 'ACTIVE', updatedAt: now })
      .where(eq(accountsTable.id, id))
      .run();
  }

  public removeAccount(idOrUsername: string): boolean {
    const account = this.getAccount(idOrUsername);
    if (!account) {
      return false;
    }

    // Delete token from credential store
    this.tokenMgr.deleteToken(account.credentialReference);

    const now = Date.now();
    const db = getDb();

    db.insert(eventsTable).values({
      accountId: account.id,
      timestamp: now,
      eventType: 'LOGOUT',
      message: `Account removed: ${account.githubUsername}`,
      projectId: null,
      metadata: null,
    }).run();

    logger.logStructuredEvent({
      accountId: account.id,
      timestamp: now,
      eventType: 'LOGOUT',
      message: `Account removed: ${account.githubUsername}`,
      projectId: null,
      metadata: null,
    });

    db.delete(accountsTable).where(eq(accountsTable.id, account.id)).run();
    return true;
  }

  public getUsableAccounts(): Account[] {
    cooldownManager.checkAndExpireCooldowns();
    const accounts = this.listAccounts();
    return accounts.filter((acc) => {
      if (acc.status === 'AUTH_ERROR' || acc.status === 'DISABLED' || acc.status === 'OFFLINE') {
        return false;
      }
      if (acc.status === 'COOLDOWN' || acc.status === 'LIMITED') {
        return !cooldownManager.isCoolingDown(acc);
      }
      return true;
    });
  }
}

export const accountManager = new AccountManager();
