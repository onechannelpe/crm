import { createSignal, Show } from "solid-js";
import { Dynamic } from "solid-js/web";

import type { LeadDetailView } from "~/contracts/workflow/views";
import { TabStrip } from "~/features/side-panel/components/tab-strip";
import type { ViewRecordTabId } from "~/features/side-panel/pages/record-page/model";
import {
  VIEW_RECORD_TABS,
  VIEW_RECORD_TABS_BY_ID,
} from "~/features/side-panel/pages/record-page/tabs/view-record-tabs";

import styles from "./record-right-panel.module.css";

type RecordRightPanelProps = {
  data: LeadDetailView;
};

export function RecordRightPanel(props: RecordRightPanelProps) {
  const [activeTab, setActiveTab] = createSignal<ViewRecordTabId>("workflow");

  return (
    <div class={styles.panel}>
      <TabStrip
        tabs={VIEW_RECORD_TABS}
        activeTab={activeTab()}
        onTabSelect={setActiveTab}
      />
      <div class={styles.tabContent}>
        <Show when={activeTab()} keyed>
          {(tab) => (
            <div class={styles.tabPane}>
              <Dynamic
                component={VIEW_RECORD_TABS_BY_ID[tab].component}
                data={props.data}
              />
            </div>
          )}
        </Show>
      </div>
    </div>
  );
}
