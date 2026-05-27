import type { SearchIntent } from "~/contracts/search/vocabulary";

export type SearchTab = "people" | "companies";

export function intentFromTab(tab: SearchTab): SearchIntent {
  return tab === "companies" ? "companies" : "people";
}

export function tabFromIntent(intent: SearchIntent): SearchTab {
  return intent === "companies" ? "companies" : "people";
}
