import { Show } from "solid-js";

import type { LeadDetailView } from "~/contracts/workflow/views";
import { WorkflowProgressSection } from "~/features/record-show/sections/workflow";

import { RecordSummaryCard } from "../summary-card/record-summary-card";

import styles from "./record-left-panel.module.css";

export function RecordLeftPanel(props: { data: LeadDetailView }) {
  return (
    <div class={styles.panel}>
      <RecordSummaryCard lead={props.data.lead} />
      <div class={styles.scrollBody}>
        <WorkflowProgressSection data={props.data} />
        <Show when={props.data.blockingFields.length > 0}>
          <p class={styles.helperText}>
            Completa las tareas en la pestaña Flujo para avanzar de etapa.
          </p>
        </Show>
      </div>
    </div>
  );
}
