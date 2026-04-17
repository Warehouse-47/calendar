/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly PUBLIC_GOOGLE_SHEET_CSV_URL?: string;
	readonly PUBLIC_INTEREST_APPS_SCRIPT_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}