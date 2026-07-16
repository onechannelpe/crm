import CalendarClock from "~/components/icons/calendar-clock";
import Info from "~/components/icons/info";
import Target from "~/components/icons/target";
import type { RecordIndexFilterField } from "~/features/record-index/model/catalog";
import { leadStageLabel } from "~/features/workflow/presentation/lead-display";
import { capitalize } from "~/lib/utils";

const LEAD_MODIFIED_FILTER_OPTIONS = [
  { value: "updated_today", label: "Hoy" },
  { value: "all", label: "Cualquier fecha" },
] as const;

const LEAD_STAGE_FILTER_OPTIONS = [
  { value: "stage:QUALIFYING", label: leadStageLabel("QUALIFYING") },
  { value: "stage:PRICING", label: leadStageLabel("PRICING") },
  { value: "stage:SETUP", label: leadStageLabel("SETUP") },
  { value: "stage:LIVE", label: leadStageLabel("LIVE") },
  { value: "stage:DISQUALIFIED", label: leadStageLabel("DISQUALIFIED") },
  { value: "stage:CLOSED_LOST", label: leadStageLabel("CLOSED_LOST") },
] as const;

const LEAD_STATUS_FILTER_OPTIONS = [
  { value: "status:DISPONIBLE", label: capitalize("DISPONIBLE") },
  { value: "status:SIN RESULTADO", label: capitalize("SIN RESULTADO") },
  { value: "status:CARTERIZADO", label: capitalize("CARTERIZADO") },
  { value: "status:STOCK", label: capitalize("STOCK") },
] as const;

export const LEAD_WORKSPACE_FILTER_FIELDS = [
  {
    id: "modified",
    label: "Última modificación",
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
