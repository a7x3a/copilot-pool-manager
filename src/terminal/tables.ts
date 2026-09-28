export function formatTimeAgo(timestamp: number | null): string {
  if (!timestamp) return 'never';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 10) return 'now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export interface Column<T> {
  header: string;
  width?: number;
  align?: 'left' | 'right';
  render: (row: T) => string;
}

// Strip ANSI color codes to calculate visual string length
export function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

export function renderTable<T>(data: T[], columns: Column<T>[]): string {
  if (data.length === 0) {
    return '  (No entries)';
  }

  // Calculate actual column widths
  const widths = columns.map((col) => {
    let max = col.width || stripAnsi(col.header).length;
    for (const row of data) {
      const cellLen = stripAnsi(col.render(row)).length;
      if (cellLen > max) {
        max = cellLen;
      }
    }
    return max + 2; // padding
  });

  const headerRow = columns
    .map((col, i) => {
      const title = col.header;
      const pad = widths[i] - stripAnsi(title).length;
      return title + ' '.repeat(Math.max(0, pad));
    })
    .join('');

  const totalWidth = widths.reduce((a, b) => a + b, 0);
  const separator = '─'.repeat(totalWidth);

  const dataRows = data.map((row) => {
    return columns
      .map((col, i) => {
        const val = col.render(row);
        const pad = widths[i] - stripAnsi(val).length;
        if (col.align === 'right') {
          return ' '.repeat(Math.max(0, pad)) + val;
        }
        return val + ' '.repeat(Math.max(0, pad));
      })
      .join('');
  });

  return [' ' + headerRow, ' ' + separator, ...dataRows.map((r) => ' ' + r)].join('\n');
}
