import type { JSX } from "solid-js";

import Checkbox from "~/components/icons/checkbox";
import HomeTabler from "~/components/icons/home-tabler";
import Paperclip from "~/components/icons/paperclip";
import TimelineEvent from "~/components/icons/timeline-event";
import type { RecordContext } from "~/features/record-show/model/record-context";
import type { RecordTabId } from "~/features/record-show/model/record-tab-id";
import { ActivityTab } from "~/features/record-show/tabs/activity-tab";
import { DataTab } from "~/features/record-show/tabs/data-tab";
import { DraftHomeTab } from "~/features/record-show/tabs/draft-home-tab";
import { FilesTab } from "~/features/record-show/tabs/files-tab";
import { WorkflowTab } from "~/features/record-show/tabs/workflow-tab";
import type { TabIconComponent } from "~/features/side-panel/components/tab-strip";

type RecordKind = RecordContext["kind"];

export type RecordTabDefinition = {
  id: RecordTabId;
  label: string;
  infoLabel?: string;
  icon?: TabIconComponent;
  appearsIn: (kind: RecordKind) => boolean;
  component: (props: { context: RecordContext }) => JSX.Element;
};

const onlyLead = (kind: RecordKind) => kind === "lead";
const onlyDraft = (kind: RecordKind) => kind === "draft";
const always = () => true;

const RECORD_TABS: readonly RecordTabDefinition[] = [
  {
    id: "home",
    icon: HomeTabler,
    label: "Inicio",
    infoLabel: "Borrador",
    appearsIn: onlyDraft,
    component: DraftHomeTab,
  },
  {
    id: "workflow",
    icon: Checkbox,
    label: "Flujo",
    appearsIn: onlyLead,
    component: WorkflowTab,
  },
  {
    id: "activity",
    icon: TimelineEvent,
    label: "Actividad",
    appearsIn: always,
    component: ActivityTab,
  },
  {
    id: "files",
    icon: Paperclip,
    label: "Archivos",
    appearsIn: always,
    component: FilesTab,
  },
  {
    id: "data",
    icon: HomeTabler,
    label: "Datos",
    appearsIn: onlyLead,
    component: DataTab,
  },
];

export function recordTabsFor(context: RecordContext): RecordTabDefinition[] {
  return RECORD_TABS.filter((tab) => tab.appearsIn(context.kind));
}

export function resolveActiveRecordTabId(
  tabId: string,
  kind: RecordKind,
): RecordTabId {
  const available = RECORD_TABS.filter((tab) => tab.appearsIn(kind));
  const match = available.find((tab) => tab.id === tabId);
  return match ? match.id : available[0].id;
}

// Side-panel chrome shows the active tab's label (preferring the draft "Borrador"
// info label). Looked up from the same registry so labels never drift from tabs.
export function recordTabDisplayLabel(tabId: RecordTabId): string {
  const tab = RECORD_TABS.find((entry) => entry.id === tabId);
  return tab?.infoLabel ?? tab?.label ?? "";
}
