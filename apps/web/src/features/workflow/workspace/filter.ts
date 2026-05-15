import { type ListLeadsFiltersInput } from "~/contracts/workflow/inputs";
import { type LeadListRowView } from "~/contracts/workflow/views";
import { LEAD_STAGES, LEAD_STATUSES } from "~/contracts/workflow/vocabulary";
import type { RecordIndexFilterDefinition } from "~/features/record-index/model/filter";
import {
  leadStageLabel,
  leadStatusLabel,
} from "~/features/workflow/presentation/lead-display";

function isLeadStage(value: string): value is (typeof LEAD_STAGES)[number] {
  return (LEAD_STAGES as readonly string[]).includes(value);
}

function isLeadStatus(value: string): value is (typeof LEAD_STATUSES)[number] {
  return (LEAD_STATUSES as readonly string[]).includes(value);
}

export const LEAD_WORKSPACE_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "updated_today", label: "Hoy" },
  {
    value: "stage:QUALIFYING",
    label: leadStageLabel("QUALIFYING"),
  },
  {
    value: "stage:SCOPING",
    label: leadStageLabel("SCOPING"),
  },
  {
    value: "stage:QUOTING",
    label: leadStageLabel("QUOTING"),
  },
  { value: "stage:QUOTED", label: leadStageLabel("QUOTED") },
  { value: "stage:SETUP_PLAN", label: leadStageLabel("SETUP_PLAN") },
  {
    value: "stage:SETUP_EXECUTION",
    label: leadStageLabel("SETUP_EXECUTION"),
  },
  { value: "stage:LIVE", label: leadStageLabel("LIVE") },
  {
    value: "stage:DISQUALIFIED",
    label: leadStageLabel("DISQUALIFIED"),
  },
  { value: "status:DISPONIBLE", label: leadStatusLabel("DISPONIBLE") },
  { value: "status:SIN RESULTADO", label: leadStatusLabel("SIN RESULTADO") },
  { value: "status:CARTERIZADO", label: leadStatusLabel("CARTERIZADO") },
  { value: "status:STOCK", label: leadStatusLabel("STOCK") },
] as const;

export type LeadWorkspaceFilterValue =
  (typeof LEAD_WORKSPACE_FILTERS)[number]["value"];

export function applyLeadWorkspaceFilter(
  rows: LeadListRowView[],
  filterValue: LeadWorkspaceFilterValue,
) {
  switch (filterValue) {
    case "all":
    case "updated_today":
      return rows;
    default:
      return rows;
  }
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

export const LEAD_WORKSPACE_FILTER: RecordIndexFilterDefinition<
  LeadListRowView,
  LeadWorkspaceFilterValue
> = {
  label: "Filtrar",
  menuId: "lead-workspace-filter-menu",
  options: LEAD_WORKSPACE_FILTERS,
  defaultValue: "all",
  apply: applyLeadWorkspaceFilter,
};
