import type { SearchResult } from "~/contracts/search/engine-results.generated";

export interface SearchDirectResult {
  rows: SearchResult[];
}
