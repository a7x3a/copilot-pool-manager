import fs from 'fs';
import path from 'path';
import { ensureCpmDirectories, getLogsDir } from '../config/config';
import { EventType, NewEventRecord } from '../types';

const TOKEN_PATTERNS = [
  /ghp_[a-zA-Z0-9]{36,}/gi,
  /gho_[a-zA-Z0-9]{36,}/gi,
  /ghu_[a-zA-Z0-9]{36,}/gi,
  /ghs_[a-zA-Z0-9]{36,}/gi,
  /github_pat_[a-zA-Z0-9_]{50,}/gi,
  /Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi,
  /token\s*[:=]\s*["']?[a-zA-Z0-9_\-\.]+["']?/gi,
  /password\s*[:=]\s*["']?[^"'\s]+["']?/gi,
];

let extraKnownTokens: Set<string> = new Set();

export function registerKnownToken(token: string): void {
  if (token && token.length > 5) {
    extraKnownTokens.add(token);
  }
}

export function sanitizeText(text: string): string {
  if (!text) return '';
  let sanitized = text;

  for (const token of extraKnownTokens) {
    if (token && sanitized.includes(token)) {
      sanitized = sanitized.replaceAll(token, '***REDACTED***');
    }
  }

  for (const pattern of TOKEN_PATTERNS) {
    sanitized = sanitized.replace(pattern, '***REDACTED***');
  }

  return sanitized;
}

function formatDate(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

export class Logger {
  private logFilePath: string;

  constructor() {
    ensureCpmDirectories();
    this.logFilePath = path.join(getLogsDir(), 'cpm.log');
  }

  public writeRaw(content: string): void {
    try {
      fs.appendFileSync(this.logFilePath, content + '\n', 'utf8');
    } catch {
      // Ignore write errors to prevent breaking execution
    }
  }

  public info(message: string): void {
    const sanitized = sanitizeText(message);
    const line = `[${formatDate()}] [INFO] ${sanitized}`;
    this.writeRaw(line);
  }

  public warn(message: string): void {
    const sanitized = sanitizeText(message);
    const line = `[${formatDate()}] [WARN] ${sanitized}`;
    this.writeRaw(line);
  }

  public error(message: string, error?: unknown): void {
    const sanitized = sanitizeText(message);
    let errStr = '';
    if (error instanceof Error) {
      errStr = ` - ${error.message}`;
    } else if (error) {
      errStr = ` - ${String(error)}`;
    }
    const line = `[${formatDate()}] [ERROR] ${sanitized}${sanitizeText(errStr)}`;
    this.writeRaw(line);
  }

  public logStructuredEvent(event: NewEventRecord): void {
    const timeStr = formatDate(new Date(event.timestamp || Date.now()));
    const lines = [
      timeStr,
      event.eventType,
      event.accountId ? `account=${event.accountId}` : null,
      event.projectId ? `project=${event.projectId}` : null,
      event.message ? `message=${sanitizeText(event.message)}` : null,
      event.metadata ? `metadata=${sanitizeText(event.metadata)}` : null,
      '',
    ].filter((l): l is string => l !== null);

    this.writeRaw(lines.join('\n'));
  }
}

export const logger = new Logger();
