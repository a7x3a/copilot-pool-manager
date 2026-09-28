import { CpmConfig } from '../types';

export const DEFAULT_CONFIG: CpmConfig = {
  copilotCommand: 'copilot',
  selectionStrategy: 'least-recently-used',
  automaticSelection: true,
  respectCooldown: true,
  usageTracking: true,
  logging: true,
  defaultCooldownMinutes: 15,
  autoRotateOnRateLimit: true,
};

export const CREDENTIAL_SERVICE_NAME = 'cpm:copilot';
