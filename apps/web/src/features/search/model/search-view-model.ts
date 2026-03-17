import type { SearchResult_ } from "~/server/search-workflow/domain";

import {
  groupCompaniesByRuc,
  groupPeopleByDni,
  type CompanyGroup,
  type PersonGroup,
} from "./grouping";

export interface SearchViewModel {
  people: PersonGroup[];
  companies: CompanyGroup[];
  total: number;
}

export function createSearchViewModel(
  response: SearchResult_,
): SearchViewModel {
  const people = groupPeopleByDni(response.raw);
  const companies = groupCompaniesByRuc(response.raw);

  return {
    people,
    companies,
    total: response.raw.length,
  };
}
