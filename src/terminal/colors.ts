import pc from 'picocolors';
import { AccountStatus } from '../types';

export const colors = {
  primary: pc.cyan,
  secondary: pc.magenta,
  success: pc.green,
  warning: pc.yellow,
  danger: pc.red,
  dim: pc.gray,
  bold: pc.bold,
  italic: pc.italic,

  status(status: AccountStatus): string {
    switch (status) {
      case 'READY':
        return pc.green('● READY');
      case 'ACTIVE':
        return pc.cyan(pc.bold('⚡ ACTIVE'));
      case 'COOLDOWN':
        return pc.yellow('⏳ COOLDOWN');
      case 'LIMITED':
        return pc.yellow('⚠️  LIMITED');
      case 'AUTH_ERROR':
        return pc.red(pc.bold('✖ AUTH_ERROR'));
      case 'DISABLED':
      case 'OFFLINE':
        return pc.gray('○ OFFLINE');
      default:
        return pc.dim(`? ${status}`);
    }
  },
};
