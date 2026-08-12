import type { ListLeadsFiltersInput } from "~/contracts/workflow/inputs";
import { LEAD_STAGES, LEAD_STATUSES } from "~/contracts/workflow/vocabulary";

export const LEAD_WORKSPACE_FILTER_DEFAULT = "all";

function isLeadStage(value: string): value is (typeof LEAD_STAGES)[number] {
  return (LEAD_STAGES as readonly string[]).includes(value);
}

function isLeadStatus(value: string): value is (typeof LEAD_STATUSES)[number] {
  return (LEAD_STATUSES as readonly string[]).includes(value);
}

export function resolveLeadWorkspaceFilterQuery(
  value: string | undefined,
): Pick<ListLeadsFiltersInput, "stage" | "status" | "updatedToday"> {
  if (value === "updated_today") {
    return { updatedToday: true };
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
