import type { SearchDirectResult } from "~/contracts/search/results";

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
  const people = groupByDocument(response.rows);
  const companies = groupByCompany(response.rows);

  return {
    people,
    companies,
    total: people.length + companies.length,
  };
}
