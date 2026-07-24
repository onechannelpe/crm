import type { LeadDetailView } from "~/contracts/workflow/views";
import { SummaryRail } from "~/features/record-show/summary-rail/summary-rail";

import styles from "./record-left-panel.module.css";

export function RecordLeftPanel(props: {
  data: LeadDetailView;
  evaluatedAt: number;
}) {
  return (
    <div class={styles.panel}>
      <SummaryRail data={props.data} evaluatedAt={props.evaluatedAt} />
    </div>
  );
}
