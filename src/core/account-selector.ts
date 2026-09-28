import { Account, SelectionStrategy } from '../types';
import { AccountManager, accountManager } from './account-manager';
import { cooldownManager } from './cooldown-manager';
import { getConfig } from '../config/config';
import { logger } from '../logging/logger';
import { getDb } from '../db/client';
import { eventsTable } from '../db/schema';

export interface SelectionOptions {
  projectId?: string;
  preferredAccountId?: string;
  explicitAccountId?: string;
  strategy?: SelectionStrategy;
}

export class AccountSelector {
  private accMgr: AccountManager;

  constructor(accMgr: AccountManager = accountManager) {
    this.accMgr = accMgr;
  }

  public selectAccount(options: SelectionOptions = {}): Account {
    // 1. If explicit account requested, verify and return it
    if (options.explicitAccountId) {
      const explicit = this.accMgr.getAccount(options.explicitAccountId);
      if (!explicit) {
        throw new Error(`Account "${options.explicitAccountId}" not found.`);
      }
      return explicit;
    }

    // 2. Check for usable accounts
    const usable = this.accMgr.getUsableAccounts();
    if (usable.length === 0) {
      const allAccounts = this.accMgr.listAccounts();
      if (allAccounts.length === 0) {
        throw new Error('No GitHub accounts registered in CPM. Run "cpm add" to add an account.');
      }
      // Check if all are cooling down or errored
      const cooldowns = allAccounts.filter((a) => cooldownManager.isCoolingDown(a));
      if (cooldowns.length > 0) {
        const nextAvailable = cooldowns.sort((a, b) => (a.cooldownUntil || 0) - (b.cooldownUntil || 0))[0];
        const waitTime = cooldownManager.formatCooldown(nextAvailable);
        throw new Error(`All accounts are currently limited or on cooldown. Next available account (${nextAvailable.githubUsername}) in: ${waitTime}`);
      }
      throw new Error('No available or healthy accounts found. Check "cpm doctor" or "cpm accounts".');
    }

    // 3. Check project preference if provided
    if (options.preferredAccountId && options.preferredAccountId !== 'AUTO') {
      const preferred = usable.find(
        (a) => a.id === options.preferredAccountId || a.githubUsername.toLowerCase() === options.preferredAccountId?.toLowerCase()
      );
      if (preferred) {
        return preferred;
      }
    }

    // 4. Apply selection strategy
    const config = getConfig();
    const strategy = options.strategy || config.selectionStrategy || 'least-recently-used';

    let selected: Account;

    if (strategy === 'least-recently-used') {
      // Pick account with oldest lastUsedAt, or never used
      const sorted = [...usable].sort((a, b) => {
        const timeA = a.lastUsedAt || 0;
        const timeB = b.lastUsedAt || 0;
        return timeA - timeB;
      });
      selected = sorted[0];
    } else if (strategy === 'round-robin') {
      // Pick next account after currently ACTIVE one
      const activeIdx = usable.findIndex((a) => a.status === 'ACTIVE');
      if (activeIdx >= 0 && activeIdx < usable.length - 1) {
        selected = usable[activeIdx + 1];
      } else {
        selected = usable[0];
      }
    } else {
      // Priority (by ID)
      const sorted = [...usable].sort((a, b) => a.id.localeCompare(b.id));
      selected = sorted[0];
    }

    return selected;
  }

  public recordSelection(selected: Account, projectId?: string, previousAccountId?: string): void {
    const now = Date.now();
    const isSwitched = previousAccountId && previousAccountId !== selected.id;
    const eventType = isSwitched ? 'ACCOUNT_SWITCHED' : 'ACCOUNT_SELECTED';
    const message = isSwitched
      ? `Switched from account ${previousAccountId} to ${selected.id} (${selected.githubUsername})`
      : `Selected account ${selected.id} (${selected.githubUsername})`;

    const db = getDb();
    db.insert(eventsTable).values({
      accountId: selected.id,
      timestamp: now,
      eventType,
      message,
      projectId: projectId || null,
      metadata: JSON.stringify({ strategy: getConfig().selectionStrategy }),
    }).run();

    logger.logStructuredEvent({
      accountId: selected.id,
      timestamp: now,
      eventType,
      message,
      projectId: projectId || null,
      metadata: null,
    });
  }
}

export const accountSelector = new AccountSelector();
