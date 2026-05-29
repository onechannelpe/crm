import type { JSX } from "solid-js";

import Checkbox from "~/components/icons/checkbox";
import HomeTabler from "~/components/icons/home-tabler";
import Paperclip from "~/components/icons/paperclip";
import TimelineEvent from "~/components/icons/timeline-event";
import type { LeadDetailView } from "~/contracts/workflow/views";
import { ActivityTab } from "~/features/record-workflow/tabs/activity-tab";
import { DataTab } from "~/features/record-workflow/tabs/data-tab";
import { FilesTab } from "~/features/record-workflow/tabs/files-tab";
import { WorkflowTab } from "~/features/record-workflow/tabs/workflow-tab";
import type { TabIconComponent } from "~/features/side-panel/components/tab-strip";
import type { ViewRecordTabId } from "~/features/side-panel/pages/record-page/tab-ids";

type TabComponent = (props: { data: LeadDetailView }) => JSX.Element;

export type TabDefinition<TTabId extends string> = {
  id: TTabId;
  label: string;
  icon?: TabIconComponent;
  component: TabComponent;
};

export const VIEW_RECORD_TABS_BY_ID: Record<
  ViewRecordTabId,
  TabDefinition<ViewRecordTabId>
> = {
  workflow: {
    id: "workflow",
    icon: Checkbox,
    label: "Flujo",
    component: WorkflowTab,
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
  data: {
    id: "data",
    icon: HomeTabler,
    label: "Datos",
    component: DataTab,
  },
};

export const VIEW_RECORD_TABS = [
  VIEW_RECORD_TABS_BY_ID.workflow,
  VIEW_RECORD_TABS_BY_ID.activity,
  VIEW_RECORD_TABS_BY_ID.files,
  VIEW_RECORD_TABS_BY_ID.data,
] as const satisfies ReadonlyArray<TabDefinition<ViewRecordTabId>>;

export function resolveActiveViewRecordTabId(tabId: string): ViewRecordTabId {
  switch (tabId) {
    case "workflow":
    case "activity":
    case "files":
    case "data":
      return tabId;
    default:
      return VIEW_RECORD_TABS[0].id;
  }
}
