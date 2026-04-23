/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly PUBLIC_GOOGLE_SHEET_CSV_URL?: string;
	readonly PUBLIC_INTEREST_APPS_SCRIPT_URL?: string;
	readonly PUBLIC_ROCKAGE_DECK_URL?: string;
	readonly PUBLIC_BARCODE_DECK_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}