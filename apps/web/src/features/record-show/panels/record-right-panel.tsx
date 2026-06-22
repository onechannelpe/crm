import { createSignal } from "solid-js";

import type { LeadDetailView } from "~/contracts/workflow/views";
import type { RecordTabId } from "~/features/record-show/model/record-tab-id";
import { RecordTabs } from "~/features/record-show/tabs/record-tabs";

import styles from "./record-right-panel.module.css";

type RecordRightPanelProps = {
  data: LeadDetailView;
};

export function RecordRightPanel(props: RecordRightPanelProps) {
  const [activeTab, setActiveTab] = createSignal<RecordTabId>("resumen");

  return (
    <div class={styles.panel}>
      <RecordTabs
        context={{ kind: "lead", data: props.data }}
        activeTab={activeTab()}
        onTabSelect={setActiveTab}
      />
    </div>
  );
}
