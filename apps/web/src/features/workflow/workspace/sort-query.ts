import type { ListLeadsFiltersInput } from "~/contracts/workflow/inputs";

export type LeadSortKey =
  | "createdAt_desc"
  | "createdAt_asc"
  | "updatedAt_desc"
  | "updatedAt_asc"
  | "registeredBy_asc"
  | "registeredBy_desc"
  | "ruc_asc"
  | "ruc_desc";

export const LEAD_WORKSPACE_SORT_DEFAULT: LeadSortKey = "createdAt_desc";

export function resolveLeadWorkspaceSortQuery(
  value: string | undefined,
): Pick<ListLeadsFiltersInput, "sortBy" | "sortDirection"> {
  switch (value) {
    case "createdAt_asc":
      return { sortBy: "createdAt", sortDirection: "asc" };
    case "updatedAt_desc":
      return { sortBy: "updatedAt", sortDirection: "desc" };
    case "updatedAt_asc":
      return { sortBy: "updatedAt", sortDirection: "asc" };
    case "registeredBy_asc":
      return { sortBy: "registeredBy", sortDirection: "asc" };
    case "registeredBy_desc":
      return { sortBy: "registeredBy", sortDirection: "desc" };
    case "ruc_asc":
      return { sortBy: "ruc", sortDirection: "asc" };
    case "ruc_desc":
      return { sortBy: "ruc", sortDirection: "desc" };
    case "createdAt_desc":
    default:
      return { sortBy: "createdAt", sortDirection: "desc" };
  }
}
