import pc from 'picocolors';

export function showBanner(): string {
  const line = '─'.repeat(62);
  return [
    pc.cyan(`╭${line}╮`),
    pc.cyan(`│`) + pc.bold('                  COPILOT POOL MANAGER                       ') + pc.cyan(`│`),
    pc.cyan(`╰${line}╯`),
  ].join('\n');
}

export function logSuccess(msg: string): void {
  console.log(`${pc.green('✓')} ${msg}`);
}

export function logInfo(msg: string): void {
  console.log(`${pc.cyan('ℹ')} ${msg}`);
}

export function logWarn(msg: string): void {
  console.log(`${pc.yellow('!')} ${msg}`);
}

export function logError(msg: string): void {
  console.error(`${pc.red('✗')} ${msg}`);
}
