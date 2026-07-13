import type { LeadDetailView } from "~/contracts/workflow/views";
import { RecordSummaryCard } from "~/features/record-show/summary-card/record-summary-card";

import styles from "./summary-rail.module.css";

export function SummaryRail(props: { data: LeadDetailView }) {
  return (
    <div class={styles.rail}>
      <RecordSummaryCard lead={props.data.lead} />
    </div>
  );
}
