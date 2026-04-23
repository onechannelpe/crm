import { createSignal } from "solid-js";
import { Dynamic } from "solid-js/web";

import Checkbox from "~/components/icons/checkbox";
import MessageSquare from "~/components/icons/message-square";
import Paperclip from "~/components/icons/paperclip";
import TimelineEvent from "~/components/icons/timeline-event";
import { TabStrip } from "~/features/side-panel/components/tab-strip";
import type { TabItem } from "~/features/side-panel/components/tab-strip";
import { TAB_COMPONENTS } from "~/features/side-panel/pages/record-page/tabs/tab-components";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

import styles from "./record-right-panel.module.css";

type RecordRightPanelTab = "timeline" | "tasks" | "notes" | "files";

type RecordRightPanelProps = {
  data: LeadDetailView;
};

const RIGHT_PANEL_TABS: ReadonlyArray<TabItem<RecordRightPanelTab>> = [
  { id: "timeline", icon: TimelineEvent, label: "Línea de tiempo" },
  { id: "tasks", icon: Checkbox, label: "Tareas" },
  { id: "notes", icon: MessageSquare, label: "Notas" },
  { id: "files", icon: Paperclip, label: "Archivos" },
] as const;

export function RecordRightPanel(props: RecordRightPanelProps) {
  const [activeTab, setActiveTab] =
    createSignal<RecordRightPanelTab>("timeline");

  return (
    <div class={styles.panel}>
      <TabStrip<RecordRightPanelTab, RecordRightPanelTab>
        tabs={RIGHT_PANEL_TABS}
        hiddenTabs={[]}
        activeTab={activeTab()}
        onTabSelect={setActiveTab}
        onHiddenTabSelect={setActiveTab}
      />
      <div class={styles.tabContent}>
        <Dynamic
          component={TAB_COMPONENTS[activeTab()]}
          mode="view"
          data={props.data}
        />
      </div>
    </div>
  );
}
