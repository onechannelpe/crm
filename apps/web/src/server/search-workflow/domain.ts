import type { SearchGatewayResponse } from "./gateway";

export interface SearchResultItem {
  id: string;
  label: string;
}

export interface SearchResult_ {
  items: readonly SearchResultItem[];
  raw: SearchGatewayResponse[];
}

export function mapToSearchResult(
  response: SearchGatewayResponse[],
): SearchResult_ {
  return {
    items: response.map((r) => ({
      id: r.person.dni,
      label: r.person.name ?? r.person.dni,
    })),
    raw: response,
  };
}
