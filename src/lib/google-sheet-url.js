function parseSheetId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] ?? null;
}

function parseGid(url) {
  const parsed = new URL(url);
  const gidFromQuery = parsed.searchParams.get('gid');
  const gidFromHash = parsed.hash.startsWith('#gid=') ? parsed.hash.replace('#gid=', '') : null;
  return gidFromQuery ?? gidFromHash ?? '0';
}

function cleanEnvValue(value) {
  if (!value) {
    return '';
  }

  return String(value).trim().replace(/^"|"$/g, '');
}

export function toGoogleSheetCsvUrl(rawUrl) {
  const input = cleanEnvValue(rawUrl);
  if (!input) {
    return '';
  }

  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error('Invalid Google Sheet URL format.');
  }

  if (!parsed.hostname.includes('docs.google.com')) {
    return input;
  }

  if (parsed.searchParams.get('tqx') === 'out:csv') {
    return input;
  }

  const sheetId = parseSheetId(input);
  if (!sheetId) {
    throw new Error('Could not extract Google Sheet ID from URL.');
  }

  const gid = parseGid(input);
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
}