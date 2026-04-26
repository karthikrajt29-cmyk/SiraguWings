/** Quote a single CSV cell, doubling embedded quotes per RFC 4180. */
function escape(cell: unknown): string {
  if (cell == null) return '';
  const s = String(cell);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Trigger a download of `rows` as `<filename>.csv`. The first row is the header.
 * No external deps; works in all evergreen browsers.
 */
export function downloadCsv(headers: string[], rows: (string | number | null | undefined)[][], filename: string) {
  const lines = [headers.map(escape).join(',')];
  for (const row of rows) lines.push(row.map(escape).join(','));
  const csv = lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
