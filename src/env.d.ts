/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly PUBLIC_GOOGLE_SHEET_CSV_URL?: string;
	readonly PUBLIC_INTEREST_APPS_SCRIPT_URL?: string;
	readonly PUBLIC_RARE_CLUB_DECK_URL?: string;
	readonly PUBLIC_RARE_CLUB_WEBSITE_URL?: string;
	readonly PUBLIC_BARCODE_DECK_URL?: string;
	readonly PUBLIC_BARCODE_WEBSITE_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}