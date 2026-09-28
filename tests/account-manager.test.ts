import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { AccountManager } from '../src/core/account-manager';
import { TokenManager } from '../src/auth/token-manager';
import { WindowsCredentialStore } from '../src/auth/credential-store';
import { initializeDatabase, closeDatabase } from '../src/db/client';

describe('Account Manager', () => {
  let tempDir: string;
  let accMgr: AccountManager;
  let tokenMgr: TokenManager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpm-acc-test-'));
    process.env.CPM_HOME = tempDir;
    process.env.CPM_DB_PATH = path.join(tempDir, 'test.db');
    initializeDatabase(process.env.CPM_DB_PATH);

    tokenMgr = new TokenManager(new WindowsCredentialStore('cpm:test:acc'));
    accMgr = new AccountManager(tokenMgr);
  });

  afterEach(() => {
    closeDatabase();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('should generate sequential zero-padded account IDs', async () => {
    expect(accMgr.getNextAccountId()).toBe('01');
  });

  it('should add account and retrieve it', async () => {
    const acc = await accMgr.addAccount({
      githubUsername: 'octocat',
      displayName: 'The Octocat',
      token: 'ghp_sample1234567890abcdef1234567890abcdef',
      skipValidation: true,
    });

    expect(acc.id).toBe('01');
    expect(acc.githubUsername).toBe('octocat');
    expect(acc.status).toBe('READY');

    const retrieved = accMgr.getAccount('01');
    expect(retrieved?.githubUsername).toBe('octocat');

    const byUsername = accMgr.getAccount('octocat');
    expect(byUsername?.id).toBe('01');
  });

  it('should handle active account switching', async () => {
    const acc1 = await accMgr.addAccount({
      githubUsername: 'user1',
      token: 'ghp_token111111111111111111111111111111111',
      skipValidation: true,
    });
    const acc2 = await accMgr.addAccount({
      githubUsername: 'user2',
      token: 'ghp_token222222222222222222222222222222222',
      skipValidation: true,
    });

    accMgr.setActiveAccount(acc1.id);
    expect(accMgr.getAccount(acc1.id)?.status).toBe('ACTIVE');

    accMgr.setActiveAccount(acc2.id);
    expect(accMgr.getAccount(acc1.id)?.status).toBe('READY');
    expect(accMgr.getAccount(acc2.id)?.status).toBe('ACTIVE');
  });

  it('should remove account and credentials', async () => {
    const acc = await accMgr.addAccount({
      githubUsername: 'tempuser',
      token: 'ghp_temporarytoken1234567890abcdefghijklm',
      skipValidation: true,
    });

    const removed = accMgr.removeAccount(acc.id);
    expect(removed).toBe(true);
    expect(accMgr.getAccount(acc.id)).toBeNull();
  });
});
