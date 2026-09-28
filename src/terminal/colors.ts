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
        return pc.green(status);
      case 'ACTIVE':
        return pc.cyan(pc.bold(status));
      case 'LIMITED':
      case 'COOLDOWN':
        return pc.yellow(status);
      case 'AUTH_ERROR':
        return pc.red(pc.bold(status));
      case 'DISABLED':
      case 'OFFLINE':
        return pc.gray(status);
      default:
        return pc.dim(status);
    }
  },
};
