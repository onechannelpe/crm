import type { SearchDirectResult } from "~/actions/search/contracts";

import {
  groupByCompany,
  groupByDocument,
  type CompanyGroup,
  type PersonGroup,
} from "./grouping";

export interface SearchViewModel {
  people: PersonGroup[];
  companies: CompanyGroup[];
  total: number;
}

export function createSearchViewModel(
  response: SearchDirectResult,
): SearchViewModel {
  const people = groupByDocument(response.raw);
  const companies = groupByCompany(response.raw);

  return {
    people,
    companies,
    total: response.raw.length,
  };
}
