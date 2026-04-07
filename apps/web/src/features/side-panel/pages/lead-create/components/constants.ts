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
  LEAD_CREATE_PRIMARY_TABS,
  LEAD_CREATE_SECONDARY_TABS,
  type LeadCreatePrimaryTabId,
  type LeadCreateSecondaryTabId,
  type LeadCreateTabId,
} from "../model";

export type TabId = LeadCreatePrimaryTabId;
export type HiddenTabId = LeadCreateSecondaryTabId;
export type ExtendedTabId = LeadCreateTabId;

export type IconComponent = (props: {
  size?: number;
  class?: string;
}) => JSX.Element;

export type DisplayField = {
  label: string;
  icon: IconComponent;
  value?: string;
  key?: string;
};

export const TAB_ITEMS: ReadonlyArray<{
  id: TabId;
  icon: IconComponent;
  label: string;
}> = [
  { id: LEAD_CREATE_PRIMARY_TABS[0], icon: HomeTabler, label: "Home" },
  { id: LEAD_CREATE_PRIMARY_TABS[1], icon: TimelineEvent, label: "Timeline" },
  { id: LEAD_CREATE_PRIMARY_TABS[2], icon: Checkbox, label: "Tareas" },
] as const;

export const HIDDEN_TAB_ITEMS: ReadonlyArray<{
  id: HiddenTabId;
  label: string;
}> = [
  { id: LEAD_CREATE_SECONDARY_TABS[0], label: "Notes" },
  { id: LEAD_CREATE_SECONDARY_TABS[1], label: "Files" },
  { id: LEAD_CREATE_SECONDARY_TABS[2], label: "Emails" },
  { id: LEAD_CREATE_SECONDARY_TABS[3], label: "Calendar" },
] as const;

export const FIELD_ROWS: ReadonlyArray<DisplayField> = [
  { label: "RUC", icon: MapIcon, key: "ruc" },
  { label: "Razón social", icon: Building2, key: "razonSocial" },
  { label: "Dirección", icon: MapIcon, key: "address" },
  { label: "Ejecutivo asignado", icon: User, value: "Actual" },
  {
    label: "Etapa inicial",
    icon: Package,
    value: "PENDING_EXTERNAL_REVIEW",
  },
  { label: "Última actualización", icon: Clock, value: "Pendiente" },
] as const;

export const RELATION_WIDGETS: ReadonlyArray<{
  title: string;
  showSeeAll: boolean;
}> = [
  { title: "Bootstrap desde Engine", showSeeAll: false },
  { title: "Verificación SUNAT", showSeeAll: false },
] as const;
