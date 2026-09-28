import pc from 'picocolors';
import { getConfig, updateConfig } from '../../config/config';
import { CpmConfig } from '../../types';
import { logSuccess, logError } from '../../terminal/progress';

export function settingsCommand(key?: string, value?: string): void {
  const config = getConfig();

  if (!key) {
    console.log('\n' + pc.bold('CPM CONFIGURATION') + '\n');
    for (const [k, v] of Object.entries(config)) {
      console.log(`  ${pc.cyan(k.padEnd(25))} : ${v}`);
    }
    console.log(`\nTo update a setting: ${pc.dim('cpm settings <key> <value>')}\n`);
    return;
  }

  if (!(key in config)) {
    logError(`Unknown configuration key: "${key}"`);
    console.log(`Valid keys: ${Object.keys(config).join(', ')}`);
    return;
  }

  if (value === undefined) {
    console.log(`${key} = ${(config as any)[key]}`);
    return;
  }

  try {
    const updated = updateConfig(key as keyof CpmConfig, value);
    logSuccess(`Updated ${key} to: ${(updated as any)[key]}`);
  } catch (err: any) {
    logError(`Failed to update setting: ${err.message}`);
  }
}
