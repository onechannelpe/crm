import type { JSX } from "solid-js";

import Checkbox from "~/components/icons/checkbox";
import HomeTabler from "~/components/icons/home-tabler";
import TimelineEvent from "~/components/icons/timeline-event";
import type { TabIconComponent } from "~/features/side-panel/components/tab-strip";

import type { CreateLeadTabId, ViewRecordTabId } from "../model";
import type { TabContentProps } from "./content-props";
import { FilesTab } from "./files";
import { HomeTab } from "./home";
import { NotesTab } from "./notes";
import { SedesTab } from "./sedes";
import { TasksTab } from "./tasks";
import { TimelineTab } from "./timeline";

type TabComponent = (props: TabContentProps) => JSX.Element;

export type TabDefinition<TTabId extends string> = {
  id: TTabId;
  label: string;
  infoLabel?: string;
  icon?: TabIconComponent;
  component: TabComponent;
};

export const CREATE_LEAD_TABS = [
  {
    id: "home",
    icon: HomeTabler,
    label: "Inicio",
    infoLabel: "Borrador",
    component: HomeTab,
  },
  {
    id: "timeline",
    icon: TimelineEvent,
    label: "Línea de tiempo",
    component: TimelineTab,
  },
  { id: "tasks", icon: Checkbox, label: "Tareas", component: TasksTab },
  { id: "notes", label: "Notas", component: NotesTab },
  { id: "files", label: "Archivos", component: FilesTab },
] as const satisfies ReadonlyArray<TabDefinition<CreateLeadTabId>>;

export const VIEW_RECORD_TABS = [
  { id: "home", icon: HomeTabler, label: "Inicio", component: HomeTab },
  {
    id: "timeline",
    icon: TimelineEvent,
    label: "Línea de tiempo",
    component: TimelineTab,
  },
  { id: "tasks", icon: Checkbox, label: "Tareas", component: TasksTab },
  { id: "sedes", label: "Sedes", component: SedesTab },
  { id: "notes", label: "Notas", component: NotesTab },
  { id: "files", label: "Archivos", component: FilesTab },
] as const satisfies ReadonlyArray<TabDefinition<ViewRecordTabId>>;

export const CREATE_LEAD_TABS_BY_ID: Record<
  CreateLeadTabId,
  TabDefinition<CreateLeadTabId>
> = {
  home: CREATE_LEAD_TABS[0],
  timeline: CREATE_LEAD_TABS[1],
  tasks: CREATE_LEAD_TABS[2],
  notes: CREATE_LEAD_TABS[3],
  files: CREATE_LEAD_TABS[4],
};

export const VIEW_RECORD_TABS_BY_ID: Record<
  ViewRecordTabId,
  TabDefinition<ViewRecordTabId>
> = {
  home: VIEW_RECORD_TABS[0],
  timeline: VIEW_RECORD_TABS[1],
  tasks: VIEW_RECORD_TABS[2],
  sedes: VIEW_RECORD_TABS[3],
  notes: VIEW_RECORD_TABS[4],
  files: VIEW_RECORD_TABS[5],
};

function hasTabId<TTabId extends string>(
  tabById: Record<TTabId, TabDefinition<TTabId>>,
  tabId: string,
): tabId is TTabId {
  return Object.hasOwn(tabById, tabId);
}

export function resolveActiveTabId<TTabId extends string>(params: {
  activeTabId: string;
  tabById: Record<TTabId, TabDefinition<TTabId>>;
  defaultTabId: TTabId;
}): TTabId {
  const { activeTabId, tabById, defaultTabId } = params;
  if (hasTabId(tabById, activeTabId)) {
    return activeTabId;
  }
  return defaultTabId;
}
