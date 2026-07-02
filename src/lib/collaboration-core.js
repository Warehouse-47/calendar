import slugify from 'slugify';
import { z } from 'zod';

export const COLLABORATION_SECTIONS = ['Brand', 'Artist', 'Playbook', 'Influencer'];
export const COLLABORATION_SCHEMA = {
  Brand: {
    titleKeys: ['Brand Name'],
    summaryKeys: ['About Brand'],
    categoryKeys: ['Category'],
    linkKeys: ['Link'],
    tagKeys: ['Category'],
  },
  Artist: {
    titleKeys: ['Artist'],
    summaryKeys: ['About the Artist'],
    categoryKeys: ['Type', 'Genre'],
    linkKeys: ['Instagram Link', 'Other Link', 'Deck Link'],
    tagKeys: ['Type', 'Genre', 'Previous Brand Collaboration'],
  },
  Playbook: {
    titleKeys: ['Category'], 
    summaryKeys: ['Context'],
    categoryKeys: ['Category'],
    linkKeys: ['Playbook_URL'],
    tagKeys: ['Status'],
  },
  Influencer: {
    titleKeys: ['Influencer Name'],
    summaryKeys: ['About'],
    categoryKeys: ['Category'],
    linkKeys: ['Instagram Link', 'Portfolio Link'],
    tagKeys: ['Niche', 'Tier', 'Category'], 
  },
};

const CollaborationRowSchema = z.record(z.any());

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

function splitList(value) {
  return text(value)
    .split(/[\n,;|]/g)
    .map((item) => text(item))
    .filter((item) => item.length > 0);
}

function firstValue(row, keys) {
  for (const key of keys) {
    if (key in row) {
      const value = text(row[key]);
      if (value.length > 0) {
        return value;
      }
    }
  }

  return '';
}

function collectLinks(row, keys) {
  const links = [];

  for (const key of keys) {
    const value = text(row[key]);
    if (!value || !/^https?:\/\//i.test(value)) {
      continue;
    }

    if (!links.includes(value)) {
      links.push(value);
    }
  }

  return links;
}

function getSchema(sheetName) {
  return COLLABORATION_SCHEMA[sheetName] ?? COLLABORATION_SCHEMA.Brand;
}

function buildSlug(title, sheetName, index) {
  const seed = `${sheetName}-${title}`;
  const slug = slugify(seed, { lower: true, strict: true, trim: true });

  if (slug.length > 0) {
    return slug;
  }

  return `${sheetName.toLowerCase()}-${index + 1}`;
}

export function normalizeCollaborationRows(rows, sheetName) {
  const schema = getSchema(sheetName);
  const normalizedRows = (rows || [])
    .filter((row) => row && typeof row === 'object')
    .map((row, index) => {
      const parsedRow = CollaborationRowSchema.parse(row);
      const title = textOrFallback(firstValue(parsedRow, schema.titleKeys), `${sheetName} Entry ${index + 1}`);
      const summary = firstValue(parsedRow, schema.summaryKeys);
      const category = textOrFallback(firstValue(parsedRow, schema.categoryKeys), sheetName);
      const location = firstValue(parsedRow, ['City', 'Location', 'Market', 'Region', 'Base']);
      const status = textOrFallback(firstValue(parsedRow, ['Status', 'Availability', 'Stage']), 'Open');
      
      // Logic for tags: capture Niche, Tier, and Category specifically for Influencers
      const tags = [
        ...splitList(firstValue(parsedRow, schema.tagKeys)),
        ...splitList(firstValue(parsedRow, ['Tags', 'Keywords', 'Themes', 'Focus'])),
        ...splitList(firstValue(parsedRow, ['Service', 'Services', 'Deliverables'])),
      ];

      const links = collectLinks(parsedRow, [...schema.linkKeys, 'URL', 'Website', 'Deck', 'Portfolio', 'Profile', 'Reference']);
      
      // BASIC MAPPINGS
      const instagramLink = firstValue(parsedRow, ['Instagram Link']);
      const otherLink = firstValue(parsedRow, ['Other Link']);
      const deckLink = firstValue(parsedRow, ['Deck Link']);
      const brandLink = firstValue(parsedRow, ['Link']);

      // --- INFLUENCER SPECIFIC OVERRIDES ---
      let finalData = {
        slug: buildSlug(title, sheetName, index),
        title,
        summary,
        category,
        location,
        status,
        tags,
        links,
        primaryLink: links[0] || '',
        secondaryLink: links[1] || '',
        instagramFollower: firstValue(parsedRow, ['Instagram Follower']),
        instagramLink,
        otherLink,
        deckLink,
        brandLink,
        previousBrandCollaboration: firstValue(parsedRow, ['Previous Brand Collaboration']),
        executionCount: firstValue(parsedRow, ['Execution_Count', 'Execution Count']),
        sheetName,
      };

      if (sheetName === 'Influencer') {
        finalData.handle = firstValue(parsedRow, ['Handle']);
        finalData.reach = firstValue(parsedRow, ['Reach']);
        finalData.niche = firstValue(parsedRow, ['Niche']);
        finalData.tier = firstValue(parsedRow, ['Tier']);
        // Ensure Reach is also stored in instagramFollower for backward compatibility
        finalData.instagramFollower = finalData.reach || finalData.instagramFollower;
        // Ensure Portfolio Link is mapped
        finalData.otherLink = firstValue(parsedRow, ['Portfolio Link']) || finalData.otherLink;
      }
      // -------------------------------------

      return finalData;
    })
    .filter((row) => row.title.length > 0);

  // ... (keep the slug deduplication logic at the end of the function as it was)
  const seen = new Map();
  return normalizedRows.map((row, index) => {
    const baseSlug = slugify(text(row.slug), { lower: true, strict: true, trim: true }) || buildSlug(row.title, sheetName, index);
    const currentCount = seen.get(baseSlug) ?? 0;
    seen.set(baseSlug, currentCount + 1);
    if (currentCount === 0) return { ...row, slug: baseSlug };
    return { ...row, slug: `${baseSlug}-${currentCount + 1}` };
  });
}