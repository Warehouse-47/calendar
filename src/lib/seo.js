function cleanBaseUrl(raw) {
  const value = String(raw ?? '').trim();
  if (!value) {
    return 'https://example.com';
  }

  return value.replace(/\/$/, '');
}

export function getSiteBaseUrl(raw = import.meta.env.PUBLIC_SITE_URL) {
  return cleanBaseUrl(raw);
}

export function toAbsoluteUrl(pathname, rawBaseUrl = import.meta.env.PUBLIC_SITE_URL) {
  const baseUrl = cleanBaseUrl(rawBaseUrl);

  if (/^https?:\/\//i.test(pathname)) {
    return pathname;
  }

  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${baseUrl}${normalizedPath}`;
}

export function serializeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function parseDateToIso(dateInput) {
  const text = String(dateInput ?? '').trim();
  if (!text) {
    return '';
  }

  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) {
    return '';
  }

  return new Date(parsed).toISOString();
}

export function buildOrganizationStructuredData(rawBaseUrl = import.meta.env.PUBLIC_SITE_URL) {
  const baseUrl = cleanBaseUrl(rawBaseUrl);

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Warehouse47',
    url: baseUrl,
    description: 'Brand-focused event discovery and venue programming platform.',
  };
}

export function buildWebsiteStructuredData(rawBaseUrl = import.meta.env.PUBLIC_SITE_URL) {
  const baseUrl = cleanBaseUrl(rawBaseUrl);

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Warehouse47 Calendar',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildCollectionPageStructuredData({ path, name, description }, rawBaseUrl = import.meta.env.PUBLIC_SITE_URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: toAbsoluteUrl(path, rawBaseUrl),
  };
}

export function buildItemListStructuredData({ path, name, items }, rawBaseUrl = import.meta.env.PUBLIC_SITE_URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    url: toAbsoluteUrl(path, rawBaseUrl),
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: toAbsoluteUrl(item.url, rawBaseUrl),
    })),
  };
}

export function buildEventStructuredData({ path, event }, rawBaseUrl = import.meta.env.PUBLIC_SITE_URL) {
  const startDate = parseDateToIso(event.dateDisplay);
  const locationParts = String(event.locationDisplay ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    url: toAbsoluteUrl(path, rawBaseUrl),
    description: event.about || event.remark || `Discover ${event.title} on Warehouse47 Calendar.`,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus:
      String(event.status ?? '').toLowerCase() === 'sold_out'
        ? 'https://schema.org/EventScheduled'
        : 'https://schema.org/EventScheduled',
    ...(startDate ? { startDate } : {}),
    location: {
      '@type': 'Place',
      name: event.venue || event._normalized?.venue || locationParts[0] || 'Venue TBA',
      address: {
        '@type': 'PostalAddress',
        addressLocality: event._normalized?.city || locationParts[0] || '',
        addressCountry: event._normalized?.country || locationParts[1] || '',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: 'Warehouse47',
      url: toAbsoluteUrl('/', rawBaseUrl),
    },
    keywords: [event.category, event.partnershipCategories].filter(Boolean).join(', '),
  };
}
