/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly PUBLIC_SITE_URL?: string;
	readonly PUBLIC_GOOGLE_SHEET_CSV_URL?: string;
	readonly GOOGLE_SHEET_CSV_URL?: string;
	readonly PUBLIC_COLLABORATION_SHEET_URL?: string;
	readonly PUBLIC_INTEREST_APPS_SCRIPT_URL?: string;
	readonly PUBLIC_STRATEGIC_COLLABORATION_DECK_URL?: string;
	readonly PUBLIC_RARE_CLUB_DECK_URL?: string;
	readonly PUBLIC_RARE_CLUB_WEBSITE_URL?: string;
	readonly PUBLIC_BARCODE_DECK_URL?: string;
	readonly PUBLIC_BARCODE_WEBSITE_URL?: string;
	readonly PUBLIC_IN_STORE_FASHION_LIFESTYLE_DECK_URL?: string;
	readonly PUBLIC_IN_STORE_AUTOMOBILE_DECK_URL?: string;
	readonly PUBLIC_IN_STORE_LUXURY_JEWELRY_DECK_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}