import type { JSX } from "solid-js";

import Checkbox from "~/components/icons/checkbox";
import HomeTabler from "~/components/icons/home-tabler";
import TimelineEvent from "~/components/icons/timeline-event";

import {
  LEAD_RECORD_PRIMARY_TABS,
  LEAD_RECORD_SECONDARY_TABS,
  type LeadRecordPrimaryTabId,
  type LeadRecordSecondaryTabId,
  type LeadRecordTabId,
} from "./model";

export type TabId = LeadRecordPrimaryTabId;
export type HiddenTabId = LeadRecordSecondaryTabId;
export type ExtendedTabId = LeadRecordTabId;

export type IconComponent = (props: {
  size?: number;
  class?: string;
}) => JSX.Element;

export const TAB_ITEMS: ReadonlyArray<{
  id: TabId;
  icon: IconComponent;
  label: string;
}> = [
  { id: LEAD_RECORD_PRIMARY_TABS[0], icon: HomeTabler, label: "Inicio" },
  {
    id: LEAD_RECORD_PRIMARY_TABS[1],
    icon: TimelineEvent,
    label: "Línea de tiempo",
  },
  { id: LEAD_RECORD_PRIMARY_TABS[2], icon: Checkbox, label: "Tareas" },
] as const;

export const HIDDEN_TAB_ITEMS: ReadonlyArray<{
  id: HiddenTabId;
  label: string;
}> = [
  { id: LEAD_RECORD_SECONDARY_TABS[0], label: "Notas" },
  { id: LEAD_RECORD_SECONDARY_TABS[1], label: "Archivos" },
  { id: LEAD_RECORD_SECONDARY_TABS[2], label: "Correos" },
  { id: LEAD_RECORD_SECONDARY_TABS[3], label: "Calendario" },
] as const;
