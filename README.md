# Warehouse47 Calendar

Astro app for browsing experiential events with brutalist monochrome styling and client-side filtering by location + month.

## Local development

- Copy `.env.example` to `.env`.
- Set `PUBLIC_GOOGLE_SHEET_CSV_URL` for runtime sheet fetch.
- You can use either a normal Google Sheets viewer/edit link or a direct CSV link.
- Run `npm run dev`.

## Data source

Expected Google Sheet columns:

- `Event`
- `Type`
- `Date`
- `Location`
- `Venue`
- `Footfall`
- `Format`
- `Relevant Brand Partnership Categories`
- `About the event`
- `Remark`
- `Event Flyer`

CSV URL format example:

- `https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:csv&sheet=<TAB_NAME>`
- `https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit?gid=0#gid=0`

## JSON sync pipeline

- Run `npm run sync:events:local` to read URL from `.env` automatically.
- Run `npm run sync:events` in CI or when env vars are already set.
- You can also override URL directly: `node scripts/sync-events.mjs --url "<sheet-link>"`.
- This writes normalized output to `src/data/events.generated.json`.
- If output is unchanged, the script skips writing (faster local runs and cleaner CI commits).
- Runtime falls back to this JSON when live fetch is unavailable.

## GitHub Actions

Workflow: `.github/workflows/sync-events.yml`

- Triggers every 6 hours and on manual dispatch.
- Requires repo secret: `GOOGLE_SHEET_CSV_URL`.
- Commits updated `src/data/events.generated.json` automatically.
