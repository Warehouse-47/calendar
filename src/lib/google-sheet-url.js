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

function normalizeSheetName(sheetNameOrOptions) {
  if (!sheetNameOrOptions) {
    return '';
  }

  if (typeof sheetNameOrOptions === 'string') {
    return cleanEnvValue(sheetNameOrOptions);
  }

  return cleanEnvValue(sheetNameOrOptions.sheetName);
}

export function toGoogleSheetCsvUrl(rawUrl, sheetNameOrOptions) {
  const input = cleanEnvValue(rawUrl);
  if (!input) {
    return '';
  }

  const sheetName = normalizeSheetName(sheetNameOrOptions);
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
    if (sheetName) {
      parsed.searchParams.set('sheet', sheetName);
      parsed.searchParams.delete('gid');
      return parsed.toString();
    }

    return input;
  }

  const sheetId = parseSheetId(input);
  if (!sheetId) {
    throw new Error('Could not extract Google Sheet ID from URL.');
  }

  const output = new URL(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq`);
  output.searchParams.set('tqx', 'out:csv');

  if (sheetName) {
    output.searchParams.set('sheet', sheetName);
  } else {
    output.searchParams.set('gid', parseGid(input));
  }

  return output.toString();
}