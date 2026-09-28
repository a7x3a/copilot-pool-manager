import { describe, it, expect, vi } from 'vitest';
import { AccountSelector } from '../src/core/account-selector';
import { AccountManager } from '../src/core/account-manager';
import { Account } from '../src/types';

describe('Account Selector', () => {
  const mockAccounts: Account[] = [
    {
      id: '01',
      githubUsername: 'user1',
      displayName: 'User 1',
      credentialReference: 'ref1',
      copilotPlan: 'individual',
      status: 'READY',
      lastAuthenticatedAt: null,
      lastUsedAt: 1000,
      lastHealthCheckAt: null,
      lastError: null,
      cooldownUntil: null,
      createdAt: 100,
      updatedAt: 100,
    },
    {
      id: '02',
      githubUsername: 'user2',
      displayName: 'User 2',
      credentialReference: 'ref2',
      copilotPlan: 'individual',
      status: 'READY',
      lastAuthenticatedAt: null,
      lastUsedAt: null, // never used -> should be picked first by least-recently-used
      lastHealthCheckAt: null,
      lastError: null,
      cooldownUntil: null,
      createdAt: 200,
      updatedAt: 200,
    },
    {
      id: '03',
      githubUsername: 'user3',
      displayName: 'User 3',
      credentialReference: 'ref3',
      copilotPlan: 'individual',
      status: 'COOLDOWN',
      lastAuthenticatedAt: null,
      lastUsedAt: 2000,
      lastHealthCheckAt: null,
      lastError: 'Rate limit',
      cooldownUntil: Date.now() + 60000,
      createdAt: 300,
      updatedAt: 300,
    },
    {
      id: '04',
      githubUsername: 'user4',
      displayName: 'User 4',
      credentialReference: 'ref4',
      copilotPlan: 'individual',
      status: 'AUTH_ERROR',
      lastAuthenticatedAt: null,
      lastUsedAt: 500,
      lastHealthCheckAt: null,
      lastError: 'Bad token',
      cooldownUntil: null,
      createdAt: 400,
      updatedAt: 400,
    },
  ];

  it('should select least-recently-used account by default', () => {
    const mockMgr = {
      listAccounts: () => mockAccounts,
      getUsableAccounts: () => mockAccounts.filter((a) => a.status === 'READY'),
      getAccount: (id: string) => mockAccounts.find((a) => a.id === id) || null,
    } as unknown as AccountManager;

    const selector = new AccountSelector(mockMgr);
    const selected = selector.selectAccount({ strategy: 'least-recently-used' });

    // user2 has never been used (lastUsedAt: null = 0), so it should be picked over user1 (lastUsedAt: 1000)
    expect(selected.id).toBe('02');
  });

  it('should select preferred account for project when available', () => {
    const mockMgr = {
      listAccounts: () => mockAccounts,
      getUsableAccounts: () => mockAccounts.filter((a) => a.status === 'READY'),
      getAccount: (id: string) => mockAccounts.find((a) => a.id === id) || null,
    } as unknown as AccountManager;

    const selector = new AccountSelector(mockMgr);
    const selected = selector.selectAccount({ preferredAccountId: '01' });

    expect(selected.id).toBe('01');
  });

  it('should respect explicit account override', () => {
    const mockMgr = {
      listAccounts: () => mockAccounts,
      getUsableAccounts: () => mockAccounts.filter((a) => a.status === 'READY'),
      getAccount: (id: string) => mockAccounts.find((a) => a.id === id) || null,
    } as unknown as AccountManager;

    const selector = new AccountSelector(mockMgr);
    const selected = selector.selectAccount({ explicitAccountId: '01' });

    expect(selected.id).toBe('01');
  });

  it('should never select accounts in COOLDOWN or AUTH_ERROR when auto-selecting', () => {
    const mockMgr = {
      listAccounts: () => mockAccounts,
      getUsableAccounts: () => mockAccounts.filter((a) => a.status === 'READY'),
      getAccount: (id: string) => mockAccounts.find((a) => a.id === id) || null,
    } as unknown as AccountManager;

    const selector = new AccountSelector(mockMgr);
    const selected = selector.selectAccount();

    expect(['01', '02']).toContain(selected.id);
    expect(selected.id).not.toBe('03');
    expect(selected.id).not.toBe('04');
  });
});
