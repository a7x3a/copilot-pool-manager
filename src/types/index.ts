export type AccountStatus =
  | 'READY'
  | 'ACTIVE'
  | 'LIMITED'
  | 'COOLDOWN'
  | 'AUTH_ERROR'
  | 'OFFLINE'
  | 'DISABLED'
  | 'UNKNOWN';

export type ErrorClassification =
  | 'RATE_LIMIT'
  | 'AUTH_ERROR'
  | 'NETWORK_ERROR'
  | 'SERVICE_ERROR'
  | 'MODEL_ERROR'
  | 'CLI_ERROR'
  | 'UNKNOWN';

export type EventType =
  | 'LOGIN'
  | 'LOGOUT'
  | 'HEALTH_CHECK'
  | 'RATE_LIMIT'
  | 'COOLDOWN_STARTED'
  | 'COOLDOWN_FINISHED'
  | 'ACCOUNT_SELECTED'
  | 'ACCOUNT_SWITCHED'
  | 'AUTH_ERROR'
  | 'CLI_STARTED'
  | 'CLI_EXITED';

export type SelectionStrategy = 'least-recently-used' | 'round-robin' | 'priority';

export interface Account {
  id: string;
  githubUsername: string;
  displayName: string;
  credentialReference: string;
  copilotPlan: string;
  status: AccountStatus;
  lastAuthenticatedAt: number | null;
  lastUsedAt: number | null;
  lastHealthCheckAt: number | null;
  lastError: string | null;
  cooldownUntil: number | null;
  createdAt: number;
  updatedAt: number;
}

export type NewAccount = Omit<Account, 'createdAt' | 'updatedAt'> & {
  createdAt?: number;
  updatedAt?: number;
};

export interface UsageRecord {
  id: number;
  accountId: string;
  timestamp: number;
  projectId: string | null;
  model: string | null;
  sessionId: string | null;
  credits: number | null;
  tokens: number | null;
  source: string;
  rawSummary: string | null;
}

export type NewUsageRecord = Omit<UsageRecord, 'id'>;

export interface EventRecord {
  id: number;
  accountId: string | null;
  timestamp: number;
  eventType: EventType;
  message: string;
  projectId: string | null;
  metadata: string | null;
}

export type NewEventRecord = Omit<EventRecord, 'id'>;

export interface Project {
  id: string;
  name: string;
  path: string;
  preferredAccountId: string;
  createdAt: number;
  updatedAt: number;
}

export type NewProject = Omit<Project, 'createdAt' | 'updatedAt'> & {
  createdAt?: number;
  updatedAt?: number;
};

export interface CpmConfig {
  copilotCommand: string;
  selectionStrategy: SelectionStrategy;
  automaticSelection: boolean;
  respectCooldown: boolean;
  usageTracking: boolean;
  logging: boolean;
  defaultCooldownMinutes: number;
}

export interface DoctorCheckItem {
  name: string;
  status: 'ok' | 'warn' | 'fail';
  message: string;
  details?: string;
}

export interface DoctorResult {
  system: DoctorCheckItem[];
  accounts: DoctorCheckItem[];
  projects: DoctorCheckItem[];
}
