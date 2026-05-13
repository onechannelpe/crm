import { createSignal, Show } from "solid-js";
import { Dynamic } from "solid-js/web";

import type { LeadDetailView } from "~/contracts/workflow/views";
import { TabStrip } from "~/features/side-panel/components/tab-strip";
import type { TabItem } from "~/features/side-panel/components/tab-strip";
import { VIEW_RECORD_TABS_BY_ID } from "~/features/side-panel/pages/record-page/tabs/tab-registry";

import styles from "./record-right-panel.module.css";

type RecordRightPanelTab = "activity" | "tasks" | "files";

type RecordRightPanelProps = {
  data: LeadDetailView;
};

const RIGHT_PANEL_TABS: ReadonlyArray<TabItem<RecordRightPanelTab>> = [
  {
    id: "activity",
    icon: VIEW_RECORD_TABS_BY_ID.activity.icon,
    label: VIEW_RECORD_TABS_BY_ID.activity.label,
  },
  {
    id: "tasks",
    icon: VIEW_RECORD_TABS_BY_ID.tasks.icon,
    label: VIEW_RECORD_TABS_BY_ID.tasks.label,
  },
  {
    id: "files",
    icon: VIEW_RECORD_TABS_BY_ID.files.icon,
    label: VIEW_RECORD_TABS_BY_ID.files.label,
  },
] as const;

export function RecordRightPanel(props: RecordRightPanelProps) {
  const [activeTab, setActiveTab] =
    createSignal<RecordRightPanelTab>("activity");

  return (
    <div class={styles.panel}>
      <TabStrip
        tabs={RIGHT_PANEL_TABS}
        activeTab={activeTab()}
        onTabSelect={setActiveTab}
      />
      <div class={styles.tabContent}>
        <Show when={activeTab()} keyed>
          {(tab) => (
            <div class={styles.tabPane}>
              <Dynamic
                component={VIEW_RECORD_TABS_BY_ID[tab].component}
                mode="view"
                data={props.data}
              />
            </div>
          )}
        </Show>
      </div>
    </div>
  );
}
