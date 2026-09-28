import pc from 'picocolors';

export function showBanner(): string {
  return [
    '',
    `  ${pc.cyan('____ ____  __  __')}   ${pc.dim('┌──────────────────────────────────────────────┐')}`,
    ` ${pc.cyan('/ ___|  _ \\|  \\/  |')}  ${pc.dim('│')}  ${pc.bold(pc.cyan('COPILOT POOL MANAGER'))}  ${pc.yellow('⚡')}  ${pc.dim('v1.0.0')}        ${pc.dim('│')}`,
    ` ${pc.cyan('| |   | |_) | |\\/| |')}  ${pc.dim('│')}  ${pc.magenta('Zero Rate-Limit Multi-Account Pool')}    ${pc.dim('│')}`,
    ` ${pc.cyan('| |___|  __/| |  | |')}  ${pc.dim('└──────────────────────────────────────────────┘')}`,
    `  ${pc.cyan('\\____|_|   |_|  |_|')}  ${pc.green('● Secure OS Vault Connected')} ${pc.dim('│')} ${pc.cyan('Fast & Local')}`,
    '',
  ].join('\n');
}

export function logSuccess(msg: string): void {
  console.log(`  ${pc.green('✔')} ${msg}`);
}

export function logInfo(msg: string): void {
  console.log(`  ${pc.cyan('ℹ')} ${msg}`);
}

export function logWarn(msg: string): void {
  console.log(`  ${pc.yellow('⚠')} ${msg}`);
}

export function logError(msg: string): void {
  console.error(`  ${pc.red('✖')} ${msg}`);
}
