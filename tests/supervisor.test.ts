import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { initializeDatabase, closeDatabase } from '../src/db/client';
import { accountManager } from '../src/core/account-manager';
import { tokenManager } from '../src/auth/token-manager';
import { cooldownManager } from '../src/core/cooldown-manager';
import { CopilotSupervisor } from '../src/core/copilot-supervisor';
import * as githubAuth from '../src/auth/github-auth';

vi.spyOn(githubAuth, 'validateGitHubToken').mockImplementation(async (token: string) => ({
  valid: true,
  user: {
    username: token.includes('acc2') ? 'user-two' : 'user-one',
    name: token.includes('acc2') ? 'User Two' : 'User One',
    copilotPlan: 'individual',
  },
}));

describe('CopilotSupervisor Real-Time Auto-Rotation', () => {
  let tempDir: string;
  let mockBin: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpm-supervisor-test-'));
    process.env.CPM_HOME = tempDir;
    process.env.CPM_DB_PATH = path.join(tempDir, 'supervisor.db');
    initializeDatabase(process.env.CPM_DB_PATH);

    // Mock binary that simulates rate limit on first account, then success on second account
    mockBin = path.join(tempDir, 'mock-copilot-supervisor.js');
    fs.writeFileSync(
      mockBin,
      `
      const token = process.env.COPILOT_GITHUB_TOKEN || '';
      if (token.includes('acc1')) {
        // Output rate limit error in stream
        process.stdout.write("Error: 429 Too Many Requests - GitHub Copilot rate limit reached\\n");
        // Keep process open briefly to allow supervisor stream reader to catch it
        setTimeout(() => process.exit(1), 100);
      } else {
        process.stdout.write("Success on rotated account! Hello Copilot.\\n");
        process.exit(0);
      }
      `,
      'utf8'
    );
  });

  afterEach(() => {
    closeDatabase();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('detects rate limit in stdout stream and seamlessly auto-rotates to the next account', async () => {
    const acc1 = await accountManager.addAccount({
      githubUsername: 'user-one',
      token: 'ghp_token_acc1_12345',
      copilotPlan: 'individual',
    });

    const acc2 = await accountManager.addAccount({
      githubUsername: 'user-two',
      token: 'ghp_token_acc2_67890',
      copilotPlan: 'business',
    });

    accountManager.setActiveAccount(acc1.id);

    const supervisor = new CopilotSupervisor({
      command: `node "${mockBin}"`,
      cliArgs: ['-p', 'test'],
      cwd: tempDir,
      initialAccount: acc1,
    });

    const exitCode = await supervisor.run();

    expect(exitCode).toBe(0);

    // Account 1 should now be in cooldown
    const updatedAcc1 = accountManager.getAccount(acc1.id)!;
    expect(cooldownManager.isCoolingDown(updatedAcc1)).toBe(true);
    expect(updatedAcc1.status).toBe('COOLDOWN');

    // Account 2 should now be active
    const active = accountManager.getActiveAccount();
    expect(active?.id).toBe(acc2.id);
    expect(active?.githubUsername).toBe('user-two');
  });

  it('detects "You have exceeded your monthly quota" and auto-rotates', async () => {
    const quotaMockBin = path.join(tempDir, 'mock-quota.js');
    fs.writeFileSync(
      quotaMockBin,
      `
      const token = process.env.COPILOT_GITHUB_TOKEN || '';
      if (token.includes('acc1')) {
        process.stderr.write("You have exceeded your monthly quota (Request ID: C0AC:B3ABF:16EEE:199B6:6ABAE09E)\\n");
        setTimeout(() => process.exit(1), 100);
      } else {
        process.stdout.write("Success on rotated account!\\n");
        process.exit(0);
      }
      `,
      'utf8'
    );

    const acc1 = await accountManager.addAccount({
      githubUsername: 'user-one',
      token: 'ghp_token_acc1_12345',
      copilotPlan: 'individual',
    });

    const acc2 = await accountManager.addAccount({
      githubUsername: 'user-two',
      token: 'ghp_token_acc2_67890',
      copilotPlan: 'business',
    });

    accountManager.setActiveAccount(acc1.id);

    const supervisor = new CopilotSupervisor({
      command: `node "${quotaMockBin}"`,
      cliArgs: ['-p', 'test'],
      cwd: tempDir,
      initialAccount: acc1,
    });

    const exitCode = await supervisor.run();
    expect(exitCode).toBe(0);

    const updatedAcc1 = accountManager.getAccount(acc1.id)!;
    expect(cooldownManager.isCoolingDown(updatedAcc1)).toBe(true);
    expect(updatedAcc1.status).toBe('COOLDOWN');
  });
});
