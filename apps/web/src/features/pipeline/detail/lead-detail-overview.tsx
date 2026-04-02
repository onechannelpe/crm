import type { queryLeadDetail } from "~/actions/pipeline/queries/leads";

import { LeadActionsSection } from "./lead-actions-section";
import { LeadInteractionComposer } from "./lead-interaction-composer";
import { LeadQuotationsSection } from "./lead-quotations-section";
import { LeadSummarySection } from "./lead-summary-section";
import { LeadTimelineSection } from "./lead-timeline-section";

import styles from "./lead-detail-overview.module.css";

export type LeadDetailData = Awaited<ReturnType<typeof queryLeadDetail>>;

export function LeadDetailOverview(props: {
  data: LeadDetailData;
  compact?: boolean;
  onChanged?: () => void;
}) {
  return (
    <div class={styles.content} data-compact={props.compact ? "true" : "false"}>
      <LeadSummarySection data={props.data} />
      <LeadInteractionComposer
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
