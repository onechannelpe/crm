import { type ListLeadsFiltersInput } from "~/contracts/workflow/inputs";
import { LEAD_STAGES, LEAD_STATUSES } from "~/contracts/workflow/vocabulary";
import type { RecordIndexFilterCatalog } from "~/features/record-index/model/catalog";

import {
  LEAD_WORKSPACE_FILTER_FIELDS,
  type LeadWorkspaceFilterValue,
} from "./filter-fields";

export type { LeadWorkspaceFilterValue } from "./filter-fields";

function isLeadStage(value: string): value is (typeof LEAD_STAGES)[number] {
  return (LEAD_STAGES as readonly string[]).includes(value);
}

function isLeadStatus(value: string): value is (typeof LEAD_STATUSES)[number] {
  return (LEAD_STATUSES as readonly string[]).includes(value);
}

export function resolveLeadWorkspaceFilterQuery(
  value: string | undefined,
): Pick<
  ListLeadsFiltersInput,
  "stage" | "status" | "updatedSinceMs" | "updatedUntilMs"
> {
  if (value === "updated_today") {
    const now = new Date();
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const end = start + 24 * 60 * 60 * 1000;

    return { updatedSinceMs: start, updatedUntilMs: end };
  }

  if (value?.startsWith("stage:")) {
    const stage = value.slice("stage:".length);
    if (isLeadStage(stage)) {
      return { stage };
    }
  }

  if (value?.startsWith("status:")) {
    const status = value.slice("status:".length);
    if (isLeadStatus(status)) {
      return { status };
    }
  }

  return {};
}

export const LEAD_WORKSPACE_FILTER: RecordIndexFilterCatalog<LeadWorkspaceFilterValue> =
  {
    label: "Filtrar",
    menuId: "lead-workspace-filter-menu",
    fields: LEAD_WORKSPACE_FILTER_FIELDS,
    defaultValue: "all",
  };
