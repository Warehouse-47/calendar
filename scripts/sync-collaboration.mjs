import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';
import { COLLABORATION_SCHEMA, COLLABORATION_SECTIONS, normalizeCollaborationRows } from '../src/lib/collaboration-core.js';
import { toGoogleSheetCsvUrl } from '../src/lib/google-sheet-url.js';

const PROJECT_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUTPUT_PATH = resolve(PROJECT_ROOT, 'src/data/collaboration.generated.json');

function parseArgs(argv) {
  const args = { url: '', envFile: '.env' };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--url' && argv[index + 1]) {
      args.url = argv[index + 1];
      index += 1;
    }

    if (value === '--env-file' && argv[index + 1]) {
      args.envFile = argv[index + 1];
      index += 1;
    }
  }

  return args;
}

async function readEnvFile(filePath) {
  try {
    const content = await readFile(resolve(PROJECT_ROOT, filePath), 'utf-8');
    const values = {};

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }

      const separatorIndex = line.indexOf('=');
      if (separatorIndex <= 0) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      const rawValue = line.slice(separatorIndex + 1).trim();
      values[key] = rawValue.replace(/^"|"$/g, '');
    }

    return values;
  } catch {
    return {};
  }
}

async function resolveSheetUrl() {
  const args = parseArgs(process.argv.slice(2));
  const envFromFile = await readEnvFile(args.envFile);

  const sourceUrl =
    args.url ||
    process.env.COLLABORATION_SHEET_URL ||
    process.env.PUBLIC_COLLABORATION_SHEET_URL ||
    envFromFile.COLLABORATION_SHEET_URL ||
    envFromFile.PUBLIC_COLLABORATION_SHEET_URL ||
    '';

  return String(sourceUrl).trim();
}

const sheetUrl = await resolveSheetUrl();

if (!sheetUrl) {
  throw new Error('Missing collaboration Google Sheet URL. Use --url, env vars, or set PUBLIC_COLLABORATION_SHEET_URL.');
}

const output = {};

for (const sectionName of COLLABORATION_SECTIONS) {
  const csvUrl = toGoogleSheetCsvUrl(sheetUrl, sectionName);
  if (!csvUrl) {
    output[sectionName] = [];
    continue;
  }

  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(`Unable to fetch collaboration sheet CSV for ${sectionName}. Status: ${response.status}`);
  }

  const csvText = await response.text();
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse failed for ${sectionName}: ${parsed.errors[0].message}`);
  }

  output[sectionName] = normalizeCollaborationRows(parsed.data, sectionName);
}

const nextJson = `${JSON.stringify(output, null, 2)}\n`;

let currentJson = '';
try {
  currentJson = await readFile(OUTPUT_PATH, 'utf-8');
} catch {
  currentJson = '';
}

if (currentJson === nextJson) {
  console.log('No changes. Collaboration data is already up-to-date in src/data/collaboration.generated.json');
  process.exit(0);
}

await writeFile(OUTPUT_PATH, nextJson, 'utf-8');

console.log('Synced collaboration data to src/data/collaboration.generated.json');