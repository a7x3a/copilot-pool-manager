import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { AccountManager } from '../src/core/account-manager';
import { TokenManager } from '../src/auth/token-manager';
import { WindowsCredentialStore } from '../src/auth/credential-store';
import { initializeDatabase, closeDatabase } from '../src/db/client';

describe('Account Switching & Activation', () => {
  let tempDir: string;
  let accMgr: AccountManager;
  let tokenMgr: TokenManager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpm-switch-test-'));
    process.env.CPM_HOME = tempDir;
    process.env.CPM_DB_PATH = path.join(tempDir, 'switch-test.db');
    initializeDatabase(process.env.CPM_DB_PATH);

    tokenMgr = new TokenManager(new WindowsCredentialStore('cpm:test:switch'));
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

  it('should switch active account and rotate previously active account back to READY', async () => {
    const acc1 = await accMgr.addAccount({
      githubUsername: 'userA',
      token: 'ghp_tokenA123456789012345678901234567890',
      skipValidation: true,
    });
    const acc2 = await accMgr.addAccount({
      githubUsername: 'userB',
      token: 'ghp_tokenB123456789012345678901234567890',
      skipValidation: true,
    });

    accMgr.setActiveAccount(acc1.id);
    expect(accMgr.getAccount(acc1.id)?.status).toBe('ACTIVE');

    // Switch to acc2
    accMgr.setActiveAccount(acc2.id);
    expect(accMgr.getAccount(acc2.id)?.status).toBe('ACTIVE');
    expect(accMgr.getAccount(acc1.id)?.status).toBe('READY');
  });
});
