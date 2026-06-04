import CalendarClock from "~/components/icons/calendar-clock";
import Info from "~/components/icons/info";
import Target from "~/components/icons/target";
import type { RecordIndexFilterField } from "~/features/record-index/model/filter";
import {
  leadStageLabel,
  leadStatusLabel,
} from "~/features/workflow/presentation/lead-display";

const LEAD_MODIFIED_FILTER_OPTIONS = [
  { value: "updated_today", label: "Hoy" },
  { value: "all", label: "Cualquier fecha" },
] as const;

const LEAD_STAGE_FILTER_OPTIONS = [
  { value: "stage:QUALIFYING", label: leadStageLabel("QUALIFYING") },
  { value: "stage:SCOPING", label: leadStageLabel("SCOPING") },
  { value: "stage:QUOTING", label: leadStageLabel("QUOTING") },
  { value: "stage:QUOTED", label: leadStageLabel("QUOTED") },
  { value: "stage:SETUP_PLAN", label: leadStageLabel("SETUP_PLAN") },
  {
    value: "stage:SETUP_EXECUTION",
    label: leadStageLabel("SETUP_EXECUTION"),
  },
  { value: "stage:LIVE", label: leadStageLabel("LIVE") },
  { value: "stage:DISQUALIFIED", label: leadStageLabel("DISQUALIFIED") },
] as const;

const LEAD_STATUS_FILTER_OPTIONS = [
  { value: "status:DISPONIBLE", label: leadStatusLabel("DISPONIBLE") },
  { value: "status:SIN RESULTADO", label: leadStatusLabel("SIN RESULTADO") },
  { value: "status:CARTERIZADO", label: leadStatusLabel("CARTERIZADO") },
  { value: "status:STOCK", label: leadStatusLabel("STOCK") },
] as const;

export const LEAD_WORKSPACE_FILTER_FIELDS = [
  {
    id: "modified",
    label: "Ultima modificacion",
    icon: CalendarClock,
    options: LEAD_MODIFIED_FILTER_OPTIONS,
  },
  {
    id: "stage",
    label: "Etapa comercial",
    icon: Target,
    options: LEAD_STAGE_FILTER_OPTIONS,
  },
  {
    id: "status",
    label: "Estado operativo",
    icon: Info,
    options: LEAD_STATUS_FILTER_OPTIONS,
  },
] as const satisfies ReadonlyArray<RecordIndexFilterField>;

export type LeadWorkspaceFilterValue =
  (typeof LEAD_WORKSPACE_FILTER_FIELDS)[number]["options"][number]["value"];
