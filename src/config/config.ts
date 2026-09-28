import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { CpmConfig } from '../types';
import { DEFAULT_CONFIG } from './defaults';

export const CpmConfigSchema = z.object({
  copilotCommand: z.string().default('copilot'),
  selectionStrategy: z.enum(['least-recently-used', 'round-robin', 'priority']).default('least-recently-used'),
  automaticSelection: z.boolean().default(true),
  respectCooldown: z.boolean().default(true),
  usageTracking: z.boolean().default(true),
  logging: z.boolean().default(true),
  defaultCooldownMinutes: z.number().default(15),
  autoRotateOnRateLimit: z.boolean().default(true),
});

export function getCpmDir(): string {
  const customDir = process.env.CPM_HOME || process.env.CPM_DIR;
  if (customDir) {
    return path.resolve(customDir);
  }
  const homeDir = process.env.USERPROFILE || process.env.HOME || '.';
  return path.join(homeDir, '.cpm');
}

export function ensureCpmDirectories(): void {
  const baseDir = getCpmDir();
  const dirs = [
    baseDir,
    path.join(baseDir, 'logs'),
    path.join(baseDir, 'cache'),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export function getConfigPath(): string {
  return path.join(getCpmDir(), 'config.json');
}

export function getDbPath(): string {
  if (process.env.CPM_DB_PATH) {
    return process.env.CPM_DB_PATH;
  }
  return path.join(getCpmDir(), 'cpm.db');
}

export function getLogsDir(): string {
  return path.join(getCpmDir(), 'logs');
}

export function getCacheDir(): string {
  return path.join(getCpmDir(), 'cache');
}

export function getConfig(): CpmConfig {
  ensureCpmDirectories();
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    return CpmConfigSchema.parse(parsed);
  } catch (err) {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: Partial<CpmConfig>): CpmConfig {
  ensureCpmDirectories();
  const configPath = getConfigPath();
  let current = DEFAULT_CONFIG;

  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      current = CpmConfigSchema.parse(JSON.parse(raw));
    } catch {
      current = DEFAULT_CONFIG;
    }
  }

  const merged = { ...current, ...config };
  const validated = CpmConfigSchema.parse(merged);
  fs.writeFileSync(configPath, JSON.stringify(validated, null, 2), 'utf8');
  return validated;
}

export function updateConfig(key: keyof CpmConfig, value: unknown): CpmConfig {
  const current = getConfig();
  let typedVal = value;
  if (typeof current[key] === 'boolean' && typeof value === 'string') {
    typedVal = value.toLowerCase() === 'true' || value === '1';
  } else if (typeof current[key] === 'number' && typeof value === 'string') {
    typedVal = Number(value);
  }
  return saveConfig({ [key]: typedVal } as Partial<CpmConfig>);
}
