import type { LeadListRowView } from "~/actions/pipeline/contracts";

import type { RecordIndexSortDefinition } from "../../../record-index/model/sort";

export type LeadSortKey =
  | "createdAt_desc"
  | "createdAt_asc"
  | "ruc_asc"
  | "ruc_desc";

export const LEADS_RECORD_INDEX_SORTS = [
  { value: "createdAt_desc", label: "Newest first" },
  { value: "createdAt_asc", label: "Oldest first" },
  { value: "ruc_asc", label: "RUC A-Z" },
  { value: "ruc_desc", label: "RUC Z-A" },
] as const satisfies ReadonlyArray<{ label: string; value: LeadSortKey }>;

export function sortLeadRows(leads: LeadListRowView[], sortKey: LeadSortKey) {
  const items = [...leads];

  items.sort((left, right) => {
    switch (sortKey) {
      case "createdAt_desc":
        return right.createdAt - left.createdAt;
      case "createdAt_asc":
        return left.createdAt - right.createdAt;
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

export const LEADS_RECORD_INDEX_SORT: RecordIndexSortDefinition<
  LeadListRowView,
  LeadSortKey
> = {
  label: "Sort",
  menuId: "record-index-sort-menu",
  options: LEADS_RECORD_INDEX_SORTS,
  defaultValue: "createdAt_desc",
  apply: sortLeadRows,
};
