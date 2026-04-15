import type { JSX } from "solid-js";

import Building2 from "~/components/icons/building-2";
import Clock from "~/components/icons/calendar-clock";
import Checkbox from "~/components/icons/checkbox";
import HomeTabler from "~/components/icons/home-tabler";
import MapIcon from "~/components/icons/map";
import Package from "~/components/icons/package";
import TimelineEvent from "~/components/icons/timeline-event";
import User from "~/components/icons/user";

import {
  LEAD_DETAIL_PRIMARY_TABS,
  LEAD_DETAIL_SECONDARY_TABS,
  type LeadDetailPrimaryTabId,
  type LeadDetailSecondaryTabId,
  type LeadDetailTabId,
} from "./model";

export type TabId = LeadDetailPrimaryTabId;
export type HiddenTabId = LeadDetailSecondaryTabId;
export type ExtendedTabId = LeadDetailTabId;

export type IconComponent = (props: {
  size?: number;
  class?: string;
}) => JSX.Element;

export type DisplayField = {
  label: string;
  icon: IconComponent;
  key:
    | "ruc"
    | "razonSocial"
    | "economicActivities"
    | "status"
    | "prioridad"
    | "stage"
    | "nextStep"
    | "updatedAt";
};

export const TAB_ITEMS: ReadonlyArray<{
  id: TabId;
  icon: IconComponent;
  label: string;
}> = [
  { id: LEAD_DETAIL_PRIMARY_TABS[0], icon: HomeTabler, label: "Inicio" },
  {
    id: LEAD_DETAIL_PRIMARY_TABS[1],
    icon: TimelineEvent,
    label: "Línea de tiempo",
  },
  { id: LEAD_DETAIL_PRIMARY_TABS[2], icon: Checkbox, label: "Tareas" },
] as const;

export const HIDDEN_TAB_ITEMS: ReadonlyArray<{
  id: HiddenTabId;
  label: string;
}> = [
  { id: LEAD_DETAIL_SECONDARY_TABS[0], label: "Notes" },
  { id: LEAD_DETAIL_SECONDARY_TABS[1], label: "Files" },
  { id: LEAD_DETAIL_SECONDARY_TABS[2], label: "Emails" },
  { id: LEAD_DETAIL_SECONDARY_TABS[3], label: "Calendar" },
] as const;

export const FIELD_ROWS: ReadonlyArray<DisplayField> = [
  { label: "RUC", icon: MapIcon, key: "ruc" },
  { label: "Razón social", icon: Building2, key: "razonSocial" },
  { label: "Actividades", icon: Building2, key: "economicActivities" },
  { label: "Estado", icon: Package, key: "status" },
  { label: "Prioridad", icon: Checkbox, key: "prioridad" },
  { label: "Etapa", icon: Package, key: "stage" },
  { label: "Siguiente paso", icon: User, key: "nextStep" },
  { label: "Actualizado", icon: Clock, key: "updatedAt" },
] as const;
