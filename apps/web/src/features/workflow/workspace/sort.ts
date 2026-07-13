import type { RecordIndexSortCatalog } from "~/features/record-index/model/catalog";

import { LEAD_WORKSPACE_SORT_FIELDS } from "./sort-fields";
import { LEAD_WORKSPACE_SORT_DEFAULT, type LeadSortKey } from "./sort-query";

const LEAD_WORKSPACE_SORTS = [
  { value: "createdAt_desc", label: "Más recientes" },
  { value: "createdAt_asc", label: "Más antiguos" },
  { value: "updatedAt_desc", label: "Más recientes" },
  { value: "updatedAt_asc", label: "Más antiguos" },
  { value: "registeredBy_asc", label: "A-Z" },
  { value: "registeredBy_desc", label: "Z-A" },
  { value: "ruc_asc", label: "A-Z" },
  { value: "ruc_desc", label: "Z-A" },
] as const satisfies ReadonlyArray<{ label: string; value: LeadSortKey }>;

export const LEAD_WORKSPACE_SORT: RecordIndexSortCatalog<LeadSortKey> = {
  label: "Ordenar",
  menuId: "lead-workspace-sort-menu",
  fields: LEAD_WORKSPACE_SORT_FIELDS,
  options: LEAD_WORKSPACE_SORTS,
  defaultValue: LEAD_WORKSPACE_SORT_DEFAULT,
};
