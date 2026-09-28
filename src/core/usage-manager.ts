import { eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import { usageTable } from '../db/schema';
import { UsageRecord, NewUsageRecord } from '../types';

export class UsageManager {
  public recordUsage(params: {
    accountId: string;
    projectId?: string | null;
    model?: string | null;
    sessionId?: string | null;
    credits?: number | null;
    tokens?: number | null;
    source: string;
    rawSummary?: string | null;
  }): UsageRecord {
    const db = getDb();
    const now = Date.now();

    const newRecord: NewUsageRecord = {
      accountId: params.accountId,
      timestamp: now,
      projectId: params.projectId || null,
      model: params.model || null,
      sessionId: params.sessionId || null,
      credits: params.credits ?? null,
      tokens: params.tokens ?? null,
      source: params.source,
      rawSummary: params.rawSummary || null,
    };

    const inserted = db.insert(usageTable).values(newRecord as any).returning().get();
    return inserted as UsageRecord;
  }

  public getUsageForAccount(accountId: string): UsageRecord[] {
    const db = getDb();
    return db.select().from(usageTable).where(eq(usageTable.accountId, accountId)).all() as UsageRecord[];
  }

  public getAllUsage(): UsageRecord[] {
    const db = getDb();
    return db.select().from(usageTable).all() as UsageRecord[];
  }

  /**
   * Parse observable output from Copilot CLI commands such as /usage or /limits.
   * Does NOT invent numbers; extracts only what is plainly observed.
   */
  public parseCopilotOutput(output: string): { tokens?: number; credits?: number; raw: string } | null {
    if (!output) return null;

    let tokens: number | undefined;
    let credits: number | undefined;

    // Pattern: tokens: 1234 or total tokens = 1234
    const tokenMatch = output.match(/tokens?\s*[:=]\s*([0-9,]+)/i);
    if (tokenMatch) {
      tokens = parseInt(tokenMatch[1].replace(/,/g, ''), 10);
    }

    // Pattern: credits: 12.5 or remaining credits: 12.5
    const creditsMatch = output.match(/credits?\s*[:=]\s*([0-9.]+)/i);
    if (creditsMatch) {
      credits = parseFloat(creditsMatch[1]);
    }

    if (tokens !== undefined || credits !== undefined) {
      return { tokens, credits, raw: output };
    }

    return null;
  }
}

export const usageManager = new UsageManager();
