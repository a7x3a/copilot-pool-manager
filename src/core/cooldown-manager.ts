import { eq, lte, and } from 'drizzle-orm';
import { getDb } from '../db/client';
import { accountsTable, eventsTable } from '../db/schema';
import { Account } from '../types';
import { getConfig } from '../config/config';
import { logger } from '../logging/logger';

export class CooldownManager {
  public isCoolingDown(account: Account): boolean {
    if (!account.cooldownUntil) return false;
    return account.cooldownUntil > Date.now();
  }

  public getRemainingCooldownMs(account: Account): number {
    if (!account.cooldownUntil) return 0;
    const remaining = account.cooldownUntil - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  public formatCooldown(account: Account): string {
    const ms = this.getRemainingCooldownMs(account);
    if (ms <= 0) return '--';
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  public setCooldown(accountId: string, durationMinutes?: number, reason: string = 'Rate limit triggered'): void {
    const config = getConfig();
    const mins = durationMinutes || config.defaultCooldownMinutes || 15;
    const cooldownUntil = Date.now() + mins * 60 * 1000;
    const now = Date.now();

    const db = getDb();
    db.update(accountsTable)
      .set({
        status: 'COOLDOWN',
        cooldownUntil,
        lastError: reason,
        updatedAt: now,
      })
      .where(eq(accountsTable.id, accountId))
      .run();

    db.insert(eventsTable).values({
      accountId,
      timestamp: now,
      eventType: 'COOLDOWN_STARTED',
      message: `Account placed on cooldown for ${mins} minutes: ${reason}`,
      projectId: null,
      metadata: JSON.stringify({ durationMinutes: mins, cooldownUntil }),
    }).run();

    logger.logStructuredEvent({
      accountId,
      timestamp: now,
      eventType: 'COOLDOWN_STARTED',
      message: `Account placed on cooldown for ${mins}m: ${reason}`,
      projectId: null,
      metadata: null,
    });
  }

  public clearCooldown(accountId: string): void {
    const now = Date.now();
    const db = getDb();
    db.update(accountsTable)
      .set({
        status: 'READY',
        cooldownUntil: null,
        lastError: null,
        updatedAt: now,
      })
      .where(eq(accountsTable.id, accountId))
      .run();

    db.insert(eventsTable).values({
      accountId,
      timestamp: now,
      eventType: 'COOLDOWN_FINISHED',
      message: 'Cooldown cleared manually or expired',
      projectId: null,
      metadata: null,
    }).run();

    logger.logStructuredEvent({
      accountId,
      timestamp: now,
      eventType: 'COOLDOWN_FINISHED',
      message: 'Cooldown cleared',
      projectId: null,
      metadata: null,
    });
  }

  public checkAndExpireCooldowns(): void {
    const now = Date.now();
    const db = getDb();
    const expiredAccounts = db
      .select()
      .from(accountsTable)
      .where(
        and(
          eq(accountsTable.status, 'COOLDOWN'),
          lte(accountsTable.cooldownUntil, now)
        )
      )
      .all() as Account[];

    for (const acc of expiredAccounts) {
      db.update(accountsTable)
        .set({
          status: 'READY',
          cooldownUntil: null,
          updatedAt: now,
        })
        .where(eq(accountsTable.id, acc.id))
        .run();

      db.insert(eventsTable).values({
        accountId: acc.id,
        timestamp: now,
        eventType: 'COOLDOWN_FINISHED',
        message: 'Cooldown expired automatically, account restored to READY',
        projectId: null,
        metadata: null,
      }).run();

      logger.logStructuredEvent({
        accountId: acc.id,
        timestamp: now,
        eventType: 'COOLDOWN_FINISHED',
        message: 'Cooldown expired, restored to READY',
        projectId: null,
        metadata: null,
      });
    }
  }
}

export const cooldownManager = new CooldownManager();
