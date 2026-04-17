import slugify from 'slugify';

function text(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function isUnknown(value) {
  const upper = text(value).toUpperCase();
  return upper === '' || upper === 'TBA' || upper === 'TBC' || upper === 'LOCATION TBA';
}

export function toCitySlug(city, country = 'global') {
  const seed = `${text(city)}-${text(country)}`;
  return slugify(seed, { lower: true, strict: true, trim: true }) || 'city';
}

export function getCityLandingGroups(events, options = {}) {
  const countryFilter = text(options.countryFilter).toUpperCase();
  const groups = new Map();

  for (const event of events) {
    const city = text(event?._normalized?.city);
    const country = text(event?._normalized?.country);

    if (isUnknown(city)) {
      continue;
    }

    if (countryFilter && country.toUpperCase() !== countryFilter) {
      continue;
    }

    const safeCountry = country || 'Global';
    const key = `${city}||${safeCountry}`;

    if (!groups.has(key)) {
      groups.set(key, {
        city,
        country: safeCountry,
        slug: toCitySlug(city, safeCountry),
        events: [],
      });
    }

    groups.get(key).events.push(event);
  }

  return [...groups.values()]
    .map((group) => ({ ...group, eventCount: group.events.length }))
    .sort((a, b) => {
      if (b.eventCount !== a.eventCount) {
        return b.eventCount - a.eventCount;
      }

      return a.city.localeCompare(b.city);
    });
}
