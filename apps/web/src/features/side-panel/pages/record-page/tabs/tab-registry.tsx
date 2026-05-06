import type { JSX } from "solid-js";

import Checkbox from "~/components/icons/checkbox";
import HomeTabler from "~/components/icons/home-tabler";
import TimelineEvent from "~/components/icons/timeline-event";
import type { TabItem } from "~/features/side-panel/components/tab-strip";

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
  icon?: TabItem<TTabId>["icon"];
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

export function toTabItems<TTabId extends string>(
  tabs: ReadonlyArray<TabDefinition<TTabId>>,
): ReadonlyArray<TabItem<TTabId>> {
  return tabs.map(({ id, label, icon }) => ({ id, label, icon }));
}

export function getTabComponent<TTabId extends string>(
  tabs: ReadonlyArray<TabDefinition<TTabId>>,
  tabId: TTabId,
): TabComponent {
  return tabs.find((tab) => tab.id === tabId)?.component ?? tabs[0].component;
}

export function getTabInfoLabel<TTabId extends string>(
  tabs: ReadonlyArray<TabDefinition<TTabId>>,
  tabId: TTabId,
): string {
  const tab = tabs.find((entry) => entry.id === tabId);
  return tab?.infoLabel ?? tab?.label ?? tabs[0].label;
}

export function getInitialActiveTabId<TTabId extends string>(params: {
  activeTabId: string;
  tabs: ReadonlyArray<TabDefinition<TTabId>>;
}): TTabId {
  const { activeTabId, tabs } = params;
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  if (activeTab) {
    return activeTab.id;
  }
  return tabs[0].id;
}
