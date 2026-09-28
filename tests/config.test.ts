import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getConfig, saveConfig, updateConfig, CpmConfigSchema } from '../src/config/config';
import { DEFAULT_CONFIG } from '../src/config/defaults';

describe('Configuration Management', () => {
  const originalEnv = process.env.CPM_HOME;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpm-test-config-'));
    process.env.CPM_HOME = tempDir;
  });

  afterEach(() => {
    process.env.CPM_HOME = originalEnv;
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('should load default configuration when config file does not exist', () => {
    const config = getConfig();
    expect(config.copilotCommand).toBe(DEFAULT_CONFIG.copilotCommand);
    expect(config.selectionStrategy).toBe('least-recently-used');
    expect(config.automaticSelection).toBe(true);
    expect(config.respectCooldown).toBe(true);
  });

  it('should save and reload custom configuration', () => {
    saveConfig({ copilotCommand: 'gh copilot', selectionStrategy: 'round-robin' });
    const config = getConfig();
    expect(config.copilotCommand).toBe('gh copilot');
    expect(config.selectionStrategy).toBe('round-robin');
  });

  it('should update single config value and parse types correctly', () => {
    updateConfig('defaultCooldownMinutes', '30');
    expect(getConfig().defaultCooldownMinutes).toBe(30);

    updateConfig('automaticSelection', 'false');
    expect(getConfig().automaticSelection).toBe(false);
  });

  it('should validate configuration with Zod schema', () => {
    const valid = CpmConfigSchema.safeParse(DEFAULT_CONFIG);
    expect(valid.success).toBe(true);

    const invalid = CpmConfigSchema.safeParse({ selectionStrategy: 'invalid-strategy' });
    expect(invalid.success).toBe(false);
  });
});
