import type { APIRoute } from 'astro';
import { getEvents } from '../lib/events';
import { getCityLandingGroups } from '../lib/cities';

function getBaseUrl() {
  const configured = String(import.meta.env.PUBLIC_SITE_URL ?? '').trim();
  if (!configured) {
    return 'https://example.com';
  }

  return configured.replace(/\/$/, '');
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
  const baseUrl = getBaseUrl();
  const today = new Date().toISOString().split('T')[0];

  const staticPaths = [
    '/',
    '/tayles',
    '/tayles/cabinet-of-tayles',
    '/tayles/advocate-tayles',
    '/tayles/tayles-and-tempo',
    '/tayles/once-upon-a-tayles',
    '/tayles/teppanyaki',
  ];

  const events = await getEvents();
  const eventPaths = events.map((event) => `/events/${event.slug}`);
  const cityPaths = getCityLandingGroups(events, { countryFilter: 'India' }).map((group) => `/cities/${group.slug}`);
  const allPaths = [...new Set([...staticPaths, ...cityPaths, ...eventPaths])];

  const urls = allPaths
    .map((path) => {
      const loc = `${baseUrl}${path}`;
      return [
        '  <url>',
        `    <loc>${xmlEscape(loc)}</loc>`,
        `    <lastmod>${today}</lastmod>`,
        '  </url>',
      ].join('\n');
    })
    .join('\n');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
  ].join('\n');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
