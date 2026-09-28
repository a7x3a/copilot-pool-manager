import { describe, it, expect, beforeEach } from 'vitest';
import { CooldownManager } from '../src/core/cooldown-manager';
import { Account } from '../src/types';

describe('Cooldown Manager', () => {
  let cdMgr: CooldownManager;

  beforeEach(() => {
    cdMgr = new CooldownManager();
  });

  it('should detect if an account is cooling down', () => {
    const activeAccount: Account = {
      id: '01',
      githubUsername: 'user1',
      displayName: 'User 1',
      credentialReference: 'ref1',
      copilotPlan: 'individual',
      status: 'READY',
      lastAuthenticatedAt: null,
      lastUsedAt: null,
      lastHealthCheckAt: null,
      lastError: null,
      cooldownUntil: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    expect(cdMgr.isCoolingDown(activeAccount)).toBe(false);
    expect(cdMgr.formatCooldown(activeAccount)).toBe('--');

    const coolingAccount: Account = {
      ...activeAccount,
      status: 'COOLDOWN',
      cooldownUntil: Date.now() + 5 * 60 * 1000 + 30 * 1000, // 5m 30s
    };

    expect(cdMgr.isCoolingDown(coolingAccount)).toBe(true);
    expect(cdMgr.getRemainingCooldownMs(coolingAccount)).toBeGreaterThan(0);
    expect(cdMgr.formatCooldown(coolingAccount)).toMatch(/^05:[23][0-9]$/);
  });

  it('should return -- when cooldown has expired in the past', () => {
    const expiredAccount: Account = {
      id: '02',
      githubUsername: 'user2',
      displayName: 'User 2',
      credentialReference: 'ref2',
      copilotPlan: 'individual',
      status: 'COOLDOWN',
      lastAuthenticatedAt: null,
      lastUsedAt: null,
      lastHealthCheckAt: null,
      lastError: null,
      cooldownUntil: Date.now() - 1000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    expect(cdMgr.isCoolingDown(expiredAccount)).toBe(false);
    expect(cdMgr.formatCooldown(expiredAccount)).toBe('--');
  });
});
