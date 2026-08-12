export const SEARCH_INTENTS = ["people", "companies", "mixed"] as const;

export type SearchIntent = (typeof SEARCH_INTENTS)[number];
