import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';
import { toGoogleSheetCsvUrl } from '../src/lib/google-sheet-url.js';

const PROJECT_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUTPUT_PATH = resolve(PROJECT_ROOT, 'src/data/portfolio.generated.json');

// Helpers to read .env and parse arguments
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
      if (!line || line.startsWith('#')) continue;
      const separatorIndex = line.indexOf('=');
      if (separatorIndex <= 0) continue;
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
    process.env.PUBLIC_PORTFOLIO_SHEET_URL || 
    envFromFile.PUBLIC_PORTFOLIO_SHEET_URL || 
    '';
    
  // This returns the base URL needed for toGoogleSheetCsvUrl
  return sourceUrl;
}

async function sync() {
  try {
    const baseSheetUrl = await resolveSheetUrl();
    if (!baseSheetUrl) throw new Error('Missing Portfolio Google Sheet URL.');

    const sections = ['Category', 'Activation']; // Your two sheet tabs
    const output = {};

    for (const sectionName of sections) {
      // Correctly call the utility to get the CSV version of the specific tab
      const csvUrl = toGoogleSheetCsvUrl(baseSheetUrl, sectionName);
      
      const response = await fetch(csvUrl);
      if (!response.ok) throw new Error(`Fetch failed for ${sectionName}. Status: ${response.status}`);

      const csvText = await response.text();
      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
      
      // If it's the Activation tab, we ensure slugs are generated
      if (sectionName === 'Activation') {
        output[sectionName] = parsed.data.map((row, index) => ({
          ...row,
          slug: row.slug || `${row.Title?.toLowerCase().replace(/\s+/g, '-') || 'case-study-'+index}`,
        }));
      } else {
        output[sectionName] = parsed.data;
      }
    }

    await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`Successfully synced Portfolio Categories and Activations.`);
  } catch (e) {
    console.error('Portfolio Sync Error:', e);
  }
}

sync();