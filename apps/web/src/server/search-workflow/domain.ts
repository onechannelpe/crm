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
      id:
        r.kind === "document"
          ? `${r.doc.doc_type}:${r.doc.doc_number}`
          : `ruc:${r.company.ruc}`,
      label:
        r.kind === "document"
          ? (r.doc.name ?? r.doc.doc_number)
          : (r.company.legal_name ?? r.company.ruc),
    })),
    raw: response,
  };
}
