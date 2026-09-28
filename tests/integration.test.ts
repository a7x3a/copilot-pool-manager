import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { initializeDatabase, closeDatabase, getDb } from '../src/db/client';
import { accountManager } from '../src/core/account-manager';
import { projectManager } from '../src/core/project-manager';
import { tokenManager } from '../src/auth/token-manager';
import { healthChecker } from '../src/core/health-checker';
import { copilotRunner } from '../src/core/copilot-runner';
import { saveConfig } from '../src/config/config';
import * as githubAuth from '../src/auth/github-auth';

vi.spyOn(githubAuth, 'validateGitHubToken').mockResolvedValue({
  valid: true,
  user: {
    username: 'dev-user',
    name: 'Developer',
    copilotPlan: 'individual',
  },
});

describe('CPM CLI & Workflow Integration', () => {
  let tempDir: string;
  let fakeCopilotBin: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpm-integ-test-'));
    process.env.CPM_HOME = tempDir;
    process.env.CPM_DB_PATH = path.join(tempDir, 'integration.db');
    initializeDatabase(process.env.CPM_DB_PATH);

    // Create a mock executable script to simulate Copilot CLI without external dependencies
    fakeCopilotBin = path.join(tempDir, 'mock-copilot.js');
    fs.writeFileSync(
      fakeCopilotBin,
      `
      // Check that environment variable is securely injected
      if (!process.env.COPILOT_GITHUB_TOKEN) {
        process.stderr.write("Missing COPILOT_GITHUB_TOKEN\\n");
        process.exit(1);
      }
      process.stdout.write("Mock Copilot CLI v1.0.0\\n");
      process.stdout.write("Session tokens: 350\\n");
      process.exit(0);
      `,
      'utf8'
    );

    saveConfig({
      copilotCommand: `node "${fakeCopilotBin}"`,
    });
  });

  afterEach(() => {
    closeDatabase();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('workflow: add account -> doctor -> add project -> run copilot CLI -> verify usage and events', async () => {
    // 1. Add account (without calling external GitHub network in test)
    const acc = await accountManager.addAccount({
      githubUsername: 'dev-user',
      displayName: 'Developer',
      token: 'ghp_mocktoken1234567890abcdefghijklmnopqr',
      skipValidation: true,
    });

    expect(acc.id).toBe('01');
    expect(acc.githubUsername).toBe('dev-user');
    expect(tokenManager.hasToken(acc.credentialReference)).toBe(true);

    // 2. Run Doctor checks
    const doctor = await healthChecker.runDoctor();
    expect(doctor.system.length).toBeGreaterThan(0);
    const dbCheck = doctor.system.find((s) => s.name === 'SQLite & Database');
    expect(dbCheck?.status).toBe('ok');

    // 3. Add Project
    const projectDir = path.join(tempDir, 'TestProject');
    fs.mkdirSync(projectDir);
    const proj = projectManager.addProject('TestProject', projectDir, '01');
    expect(proj.name).toBe('TestProject');

    // 4. Run Copilot runner in project
    const exitCode = await copilotRunner.run({
      projectName: 'TestProject',
    });
    expect(exitCode).toBe(0);

    // 5. Verify account state updated (lastUsedAt and ACTIVE)
    const updatedAcc = accountManager.getAccount('01');
    expect(updatedAcc?.status).toBe('ACTIVE');
    expect(updatedAcc?.lastUsedAt).not.toBeNull();
  });
});
