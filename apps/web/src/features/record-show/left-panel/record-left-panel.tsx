import { Show } from "solid-js";

import { DetailFieldsWidget } from "~/features/side-panel/pages/record-page/widgets/fields";
import { WorkflowWidget } from "~/features/side-panel/pages/record-page/widgets/workflow";
import { LeadActionsWidget } from "~/features/workflow/detail/actions/widget";
import { CommercialScopeWidget } from "~/features/workflow/detail/forms/commercial-scope-widget";
import { RepLegalWidget } from "~/features/workflow/detail/forms/rep-legal-widget";
import type { LeadDetailView } from "~/server/workflow/application/queries/views/lead-detail";

import { RecordSummaryCard } from "../summary-card/record-summary-card";

import styles from "./record-left-panel.module.css";

type RecordLeftPanelProps = {
  data: LeadDetailView;
};

export function RecordLeftPanel(props: RecordLeftPanelProps) {
  return (
    <div class={styles.panel}>
      <RecordSummaryCard lead={props.data.lead} />
      <div class={styles.scrollBody}>
        <WorkflowWidget data={props.data} />
        <DetailFieldsWidget data={props.data} />
        <Show when={props.data.lead.id} keyed>
          {(leadId) => (
            <>
              <CommercialScopeWidget leadId={leadId} data={props.data} />
              <RepLegalWidget leadId={leadId} data={props.data} />
            </>
          )}
        </Show>
        <LeadActionsWidget
          leadId={props.data.lead.id}
          availableActions={props.data.availableActions}
        />
      </div>
    </div>
  );
}
