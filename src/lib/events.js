import Papa from 'papaparse';
import generatedEvents from '../data/events.generated.json';
import { MONTHS, getUniqueLocations, normalizeEvents } from './events-core.js';
import { toGoogleSheetCsvUrl } from './google-sheet-url.js';

const sheetInputUrl = import.meta.env.GOOGLE_SHEET_CSV_URL ?? import.meta.env.PUBLIC_GOOGLE_SHEET_CSV_URL;
const SHEET_CSV_URL = toGoogleSheetCsvUrl(sheetInputUrl);

let cachedEvents;

async function fetchSheetEvents() {
  if (!SHEET_CSV_URL) {
    return [];
  }

  const response = await fetch(SHEET_CSV_URL);
  if (!response.ok) {
    throw new Error(`Could not fetch Google Sheet CSV. Status: ${response.status}`);
  }

  const csvText = await response.text();
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse failed: ${parsed.errors[0].message}`);
  }

  return normalizeEvents(parsed.data);
}

export async function getEvents() {
  if (cachedEvents) {
    return cachedEvents;
  }

  try {
    const sheetEvents = await fetchSheetEvents();
    if (sheetEvents.length > 0) {
      cachedEvents = sheetEvents;
      return cachedEvents;
    }
  } catch (error) {
    console.warn('Falling back to generated JSON event data.', error);
  }

  cachedEvents = normalizeEvents(generatedEvents);
  return cachedEvents;
}

export { MONTHS, getUniqueLocations };