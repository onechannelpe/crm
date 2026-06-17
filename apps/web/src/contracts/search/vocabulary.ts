const SEARCH_INTENTS = ["people", "companies", "mixed"] as const;

export type SearchIntent = (typeof SEARCH_INTENTS)[number];

export function isSearchIntent(value: string): value is SearchIntent {
  return SEARCH_INTENTS.some((intent) => intent === value);
}
