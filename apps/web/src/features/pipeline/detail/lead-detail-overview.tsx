import { InteractionsPanel } from "./interactions/interactions-panel";
import { LeadActionsSection } from "./lead-actions-section";
import { LeadQuotationsSection } from "./lead-quotations-section";
import { LeadSummarySection } from "./lead-summary-section";
import { LeadTimelineSection } from "./lead-timeline-section";
import type { LeadDetailData } from "./types";

import styles from "./lead-detail-overview.module.css";

export function LeadDetailOverview(props: {
  data: LeadDetailData;
  compact?: boolean;
  onChanged?: () => void;
}) {
  return (
    <div class={styles.content} data-compact={props.compact ? "true" : "false"}>
      <LeadSummarySection data={props.data} />
      <InteractionsPanel
        leadId={props.data.lead.id}
        availableActions={props.data.availableActions}
        onChanged={props.onChanged}
      />
      <LeadTimelineSection timeline={props.data.timeline} />
      <LeadActionsSection
        leadId={props.data.lead.id}
        availableActions={props.data.availableActions}
      />
      <LeadQuotationsSection quotations={props.data.quotations ?? []} />
    </div>
  );
}
