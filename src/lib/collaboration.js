import Papa from 'papaparse';
import generatedCollaboration from '../data/collaboration.generated.json';
import { COLLABORATION_SECTIONS, normalizeCollaborationRows } from './collaboration-core.js';
import { toGoogleSheetCsvUrl } from './google-sheet-url.js';

const sheetInputUrl = import.meta.env.PUBLIC_COLLABORATION_SHEET_URL ?? import.meta.env.PUBLIC_GOOGLE_SHEET_CSV_URL;
const SHEET_CSV_URL = String(sheetInputUrl ?? '').trim();

const collaborationCache = new Map();

function getFallbackRows(sectionName) {
  const rawRows = generatedCollaboration?.[sectionName] ?? [];
  return normalizeCollaborationRows(rawRows, sectionName);
}

async function fetchSectionRows(sectionName) {
  if (!SHEET_CSV_URL) {
    return [];
  }

  const csvUrl = toGoogleSheetCsvUrl(SHEET_CSV_URL, sectionName);
  if (!csvUrl) {
    return [];
  }

  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(`Could not fetch collaboration sheet CSV for ${sectionName}. Status: ${response.status}`);
  }

  const csvText = await response.text();
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse failed for ${sectionName}: ${parsed.errors[0].message}`);
  }

  return normalizeCollaborationRows(parsed.data, sectionName);
}

export async function getCollaborationEntries(sectionName) {
  const normalizedSection = COLLABORATION_SECTIONS.includes(sectionName) ? sectionName : 'Brand';

  if (collaborationCache.has(normalizedSection)) {
    return collaborationCache.get(normalizedSection);
  }

  try {
    const liveRows = await fetchSectionRows(normalizedSection);
    if (liveRows.length > 0 || SHEET_CSV_URL) {
      collaborationCache.set(normalizedSection, liveRows);
      return liveRows;
    }
  } catch (error) {
    console.warn(`Falling back to generated collaboration data for ${normalizedSection}.`, error);
  }

  const fallbackRows = getFallbackRows(normalizedSection);
  collaborationCache.set(normalizedSection, fallbackRows);
  return fallbackRows;
}