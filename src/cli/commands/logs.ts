import pc from 'picocolors';
import { getDb } from '../../db/client';
import { eventsTable } from '../../db/schema';
import { EventRecord } from '../../types';
import { sanitizeText } from '../../logging/logger';
import { formatTimeAgo } from '../../terminal/tables';

function formatTimestamp(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function logsCommand(limit: number = 25): void {
  const db = getDb();
  const events = db
    .select()
    .from(eventsTable)
    .all() as EventRecord[];

  console.log('\n' + pc.bold('CPM EVENT LOGS') + '\n');

  if (events.length === 0) {
    console.log(pc.dim('  No events logged yet.\n'));
    return;
  }

  const recent = events.slice(-limit);

  for (const ev of recent) {
    const timeStr = pc.dim(formatTimestamp(ev.timestamp));
    const eventTypeStr = pc.cyan(pc.bold(ev.eventType));
    const accountStr = ev.accountId ? pc.yellow(`account=${ev.accountId}`) : '';
    const projectStr = ev.projectId ? pc.magenta(`project=${ev.projectId}`) : '';
    const messageStr = sanitizeText(ev.message);

    console.log(`${timeStr}  ${eventTypeStr}  ${[accountStr, projectStr].filter(Boolean).join(' ')}`);
    console.log(`  ${messageStr}`);
    console.log('');
  }
}
