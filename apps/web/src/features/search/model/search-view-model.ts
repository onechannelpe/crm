import type { SearchResponse } from "~/server/shared/engine/types";

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
  response: SearchResponse,
): SearchViewModel {
  const people = groupPeopleByDni(response.results);
  const companies = groupCompaniesByRuc(response.results);

  return {
    people,
    companies,
    total: response.count,
  };
}
