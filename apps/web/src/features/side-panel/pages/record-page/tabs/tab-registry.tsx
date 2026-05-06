import type { JSX } from "solid-js";

import Checkbox from "~/components/icons/checkbox";
import HomeTabler from "~/components/icons/home-tabler";
import Map from "~/components/icons/map";
import Notes from "~/components/icons/notes";
import Paperclip from "~/components/icons/paperclip";
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

export const CREATE_LEAD_TABS_BY_ID: Record<
  CreateLeadTabId,
  TabDefinition<CreateLeadTabId>
> = {
  home: {
    id: "home",
    icon: HomeTabler,
    label: "Inicio",
    infoLabel: "Borrador",
    component: HomeTab,
  },
  timeline: {
    id: "timeline",
    icon: TimelineEvent,
    label: "Línea de tiempo",
    component: TimelineTab,
  },
  tasks: { id: "tasks", icon: Checkbox, label: "Tareas", component: TasksTab },
  notes: { id: "notes", icon: Notes, label: "Notas", component: NotesTab },
  files: {
    id: "files",
    icon: Paperclip,
    label: "Archivos",
    component: FilesTab,
  },
};

export const CREATE_LEAD_TABS = [
  CREATE_LEAD_TABS_BY_ID.home,
  CREATE_LEAD_TABS_BY_ID.timeline,
  CREATE_LEAD_TABS_BY_ID.tasks,
  CREATE_LEAD_TABS_BY_ID.notes,
  CREATE_LEAD_TABS_BY_ID.files,
] as const satisfies ReadonlyArray<TabDefinition<CreateLeadTabId>>;

export const VIEW_RECORD_TABS_BY_ID: Record<
  ViewRecordTabId,
  TabDefinition<ViewRecordTabId>
> = {
  home: { id: "home", icon: HomeTabler, label: "Inicio", component: HomeTab },
  timeline: {
    id: "timeline",
    icon: TimelineEvent,
    label: "Línea de tiempo",
    component: TimelineTab,
  },
  tasks: { id: "tasks", icon: Checkbox, label: "Tareas", component: TasksTab },
  sedes: { id: "sedes", icon: Map, label: "Sedes", component: SedesTab },
  notes: { id: "notes", icon: Notes, label: "Notas", component: NotesTab },
  files: {
    id: "files",
    icon: Paperclip,
    label: "Archivos",
    component: FilesTab,
  },
};

export const VIEW_RECORD_TABS = [
  VIEW_RECORD_TABS_BY_ID.home,
  VIEW_RECORD_TABS_BY_ID.timeline,
  VIEW_RECORD_TABS_BY_ID.tasks,
  VIEW_RECORD_TABS_BY_ID.sedes,
  VIEW_RECORD_TABS_BY_ID.notes,
  VIEW_RECORD_TABS_BY_ID.files,
] as const satisfies ReadonlyArray<TabDefinition<ViewRecordTabId>>;

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
