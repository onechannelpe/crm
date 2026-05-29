import type { JSX } from "solid-js";

import HomeTabler from "~/components/icons/home-tabler";
import Paperclip from "~/components/icons/paperclip";
import TimelineEvent from "~/components/icons/timeline-event";
import type { TabIconComponent } from "~/features/side-panel/components/tab-strip";
import type { CreateLeadTabId } from "~/features/side-panel/pages/record-page/tab-ids";
import { ActivityTab } from "~/features/side-panel/pages/record-page/tabs/activity";
import { FilesTab } from "~/features/side-panel/pages/record-page/tabs/files";

import type { TabContentProps } from "../record-page/tabs/content-props";
import { CreateLeadHomeTab } from "./home-tab";

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
    component: CreateLeadHomeTab,
  },
  activity: {
    id: "activity",
    icon: TimelineEvent,
    label: "Actividad",
    component: ActivityTab,
  },
  files: {
    id: "files",
    icon: Paperclip,
    label: "Archivos",
    component: FilesTab,
  },
};

export const CREATE_LEAD_TABS = [
  CREATE_LEAD_TABS_BY_ID.home,
  CREATE_LEAD_TABS_BY_ID.activity,
  CREATE_LEAD_TABS_BY_ID.files,
] as const satisfies ReadonlyArray<TabDefinition<CreateLeadTabId>>;

export function resolveActiveCreateLeadTabId(tabId: string): CreateLeadTabId {
  switch (tabId) {
    case "home":
    case "activity":
    case "files":
      return tabId;
    default:
      return CREATE_LEAD_TABS[0].id;
  }
}
