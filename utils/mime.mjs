// utils/mime.mjs
export function guessMimeType(fileName) {
  const lower = String(fileName || '').toLowerCase();
  if (lower.endsWith('.txt')) { return 'text/plain'; }
  if (lower.endsWith('.md')) { return 'text/markdown'; }
  if (lower.endsWith('.json')) { return 'application/json'; }
  if (lower.endsWith('.pdf')) { return 'application/pdf'; }
  if (lower.endsWith('.png')) { return 'image/png'; }
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) { return 'image/jpeg'; }
  if (lower.endsWith('.gif')) { return 'image/gif'; }
  if (lower.endsWith('.csv')) { return 'text/csv'; }
  if (lower.endsWith('.html') || lower.endsWith('.htm')) { return 'text/html'; }
  return 'application/octet-stream';
}
