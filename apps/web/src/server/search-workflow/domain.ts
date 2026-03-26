import type { SearchResult } from "~/server/shared/engine/types";

export interface SearchResultItem {
  id: string;
  label: string;
}

export interface SearchResult_ {
  items: readonly SearchResultItem[];
  raw: SearchResult[];
}

export function mapToSearchResult(response: SearchResult[]): SearchResult_ {
  return {
    items: response.map((r) => ({
      id: r.person.dni,
      label: r.person.name ?? r.person.dni,
    })),
    raw: response,
  };
}
