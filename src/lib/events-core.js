import slugify from 'slugify';
import { z } from 'zod';

export const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const RawEventSchema = z.object({
  Event: z.any().optional(),
  Type: z.any().optional(),
  Date: z.any().optional(),
  Location: z.any().optional(),
  Venue: z.any().optional(),
  Footfall: z.any().optional(),
  Format: z.any().optional(),
  'Relevant Brand Partnership Categories': z.any().optional(),
  'About the event': z.any().optional(),
  Remark: z.any().optional(),
  'Event Flyer': z.any().optional(),
});

const NormalizedEventSchema = z.object({
  slug: z.any().optional(),
  title: z.any().optional(),
  category: z.any().optional(),
  status: z.any().optional(),
  dateDisplay: z.any().optional(),
  dateUpper: z.any().optional(),
  locationDisplay: z.any().optional(),
  locationUpper: z.any().optional(),
  venue: z.any().optional(),
  footfall: z.any().optional(),
  format: z.any().optional(),
  partnershipCategories: z.any().optional(),
  about: z.any().optional(),
  remark: z.any().optional(),
  eventFlyer: z.any().optional(),
});

function text(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function textOrFallback(value, fallback) {
  const normalized = text(value);
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeStatus(remark) {
  const remarkUpper = text(remark).toUpperCase();
  if (remarkUpper.includes('SOLD OUT') || remarkUpper.includes('CLOSED') || remarkUpper.includes('CANCELLED')) {
    return 'sold_out';
  }

  return 'open';
}

function makeSlug(title, date, index) {
  const seed = `${title}-${date}`;
  const slug = slugify(seed, { lower: true, strict: true, trim: true });
  if (slug.length > 0) {
    return slug;
  }

  return `event-${index + 1}`;
}

export function normalizeEventRow(rawRow, index) {
  if (rawRow && typeof rawRow === 'object' && ('title' in rawRow || 'dateDisplay' in rawRow || 'locationDisplay' in rawRow)) {
    const row = NormalizedEventSchema.parse(rawRow);
    const title = textOrFallback(row.title, `Untitled Event ${index + 1}`);
    const dateDisplay = textOrFallback(row.dateDisplay, 'TBA');
    const locationDisplay = textOrFallback(row.locationDisplay, 'TBC');
    const category = textOrFallback(row.category, 'GENERAL');
    const remark = text(row.remark);
    const status = text(row.status).toLowerCase() === 'sold_out' ? 'sold_out' : normalizeStatus(remark);

    return {
      slug: textOrFallback(row.slug, makeSlug(title, dateDisplay, index)),
      title,
      category,
      status,
      dateDisplay,
      dateUpper: textOrFallback(row.dateUpper, dateDisplay.toUpperCase()),
      locationDisplay,
      locationUpper: textOrFallback(row.locationUpper, locationDisplay.toUpperCase()),
      venue: text(row.venue),
      footfall: text(row.footfall),
      format: text(row.format),
      partnershipCategories: text(row.partnershipCategories),
      about: text(row.about),
      remark,
      eventFlyer: text(row.eventFlyer),
    };
  }

  const row = RawEventSchema.parse(rawRow);

  const title = textOrFallback(row.Event, `Untitled Event ${index + 1}`);
  const dateDisplay = textOrFallback(row.Date, 'TBA');
  const locationDisplay = textOrFallback(row.Location, 'TBC');
  const category = textOrFallback(row.Type, 'GENERAL');
  const remark = text(row.Remark);

  return {
    slug: makeSlug(title, dateDisplay, index),
    title,
    category,
    status: normalizeStatus(remark),
    dateDisplay,
    dateUpper: dateDisplay.toUpperCase(),
    locationDisplay,
    locationUpper: locationDisplay.toUpperCase(),
    venue: text(row.Venue),
    footfall: text(row.Footfall),
    format: text(row.Format),
    partnershipCategories: text(row['Relevant Brand Partnership Categories']),
    about: text(row['About the event']),
    remark,
    eventFlyer: text(row['Event Flyer']),
  };
}

export function normalizeEvents(rows) {
  return rows
    .filter((row) => row && typeof row === 'object')
    .map((row, index) => normalizeEventRow(row, index))
    .filter((event) => event.title.length > 0);
}

export function getUniqueLocations(events) {
  return [...new Set(events.map((event) => event.locationUpper))]
    .filter((location) => location !== 'TBC' && location !== 'TBA' && location !== '')
    .sort((a, b) => a.localeCompare(b));
}