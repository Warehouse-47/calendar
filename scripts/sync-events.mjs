import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';
import { normalizeEvents } from '../src/lib/events-core.js';
import { toGoogleSheetCsvUrl } from '../src/lib/google-sheet-url.js';

const PROJECT_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUTPUT_PATH = resolve(PROJECT_ROOT, 'src/data/events.generated.json');

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
    process.env.GOOGLE_SHEET_CSV_URL ||
    process.env.PUBLIC_GOOGLE_SHEET_CSV_URL ||
    envFromFile.GOOGLE_SHEET_CSV_URL ||
    envFromFile.PUBLIC_GOOGLE_SHEET_CSV_URL ||
    '';

  return toGoogleSheetCsvUrl(sourceUrl);
}

const csvUrl = await resolveSheetUrl();

if (!csvUrl) {
  throw new Error('Missing Google Sheet URL. Use --url, env vars, or set in .env file.');
}

const response = await fetch(csvUrl);
if (!response.ok) {
  throw new Error(`Unable to fetch Google Sheet CSV. Status: ${response.status}`);
}

const csvText = await response.text();
const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

if (parsed.errors.length > 0) {
  throw new Error(`CSV parse failed: ${parsed.errors[0].message}`);
}

const events = normalizeEvents(parsed.data);
const nextJson = `${JSON.stringify(events, null, 2)}\n`;

let currentJson = '';
try {
  currentJson = await readFile(OUTPUT_PATH, 'utf-8');
} catch {
  currentJson = '';
}

if (currentJson === nextJson) {
  console.log(`No changes. ${events.length} events already up-to-date in src/data/events.generated.json`);
  process.exit(0);
}

await writeFile(OUTPUT_PATH, nextJson, 'utf-8');

console.log(`Synced ${events.length} events to src/data/events.generated.json`);