import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const accountsTable = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  githubUsername: text('github_username').notNull(),
  displayName: text('display_name').notNull(),
  credentialReference: text('credential_reference').notNull(),
  copilotPlan: text('copilot_plan').notNull().default('individual'),
  status: text('status').notNull().default('READY'),
  lastAuthenticatedAt: integer('last_authenticated_at'),
  lastUsedAt: integer('last_used_at'),
  lastHealthCheckAt: integer('last_health_check_at'),
  lastError: text('last_error'),
  cooldownUntil: integer('cooldown_until'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const usageTable = sqliteTable('usage', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: text('account_id').notNull(),
  timestamp: integer('timestamp').notNull(),
  projectId: text('project_id'),
  model: text('model'),
  sessionId: text('session_id'),
  credits: real('credits'),
  tokens: integer('tokens'),
  source: text('source').notNull(),
  rawSummary: text('raw_summary'),
});

export const eventsTable = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: text('account_id'),
  timestamp: integer('timestamp').notNull(),
  eventType: text('event_type').notNull(),
  message: text('message').notNull(),
  projectId: text('project_id'),
  metadata: text('metadata'),
});

export const projectsTable = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  path: text('path').notNull(),
  preferredAccountId: text('preferred_account_id').notNull().default('AUTO'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
