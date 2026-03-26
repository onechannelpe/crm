import type { LeadRow } from "./columns";

export type SortKey =
  | "created_at_desc"
  | "created_at_asc"
  | "ruc_asc"
  | "ruc_desc";

export const FILTER_OPTIONS = [
  { value: "all", label: "All prospects" },
  { value: "NEW", label: "New" },
  { value: "NEEDS_EXECUTIVE_INPUT", label: "Needs executive input" },
  { value: "READY_FOR_SALE", label: "Ready for sale" },
] as const;

export const SORT_OPTIONS = [
  { value: "created_at_desc", label: "Newest first" },
  { value: "created_at_asc", label: "Oldest first" },
  { value: "ruc_asc", label: "RUC A-Z" },
  { value: "ruc_desc", label: "RUC Z-A" },
] as const satisfies ReadonlyArray<{ label: string; value: SortKey }>;

export function sortLeads(leads: LeadRow[], sortKey: SortKey) {
  const items = [...leads];

  items.sort((left, right) => {
    switch (sortKey) {
      case "created_at_desc":
        return right.created_at - left.created_at;
      case "created_at_asc":
        return left.created_at - right.created_at;
      case "ruc_asc":
        return left.ruc.localeCompare(right.ruc);
      case "ruc_desc":
        return right.ruc.localeCompare(left.ruc);
      default:
        sortKey satisfies never;
        return 0;
    }
  });

  return items;
}
