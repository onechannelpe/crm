import { createMemo, Show } from "solid-js";

import { DetailFieldsWidget } from "~/features/side-panel/pages/record-page/widgets/fields";
import { WorkflowWidget } from "~/features/side-panel/pages/record-page/widgets/workflow";
import { LeadActionsWidget } from "~/features/workflow/detail/actions/widget";
import { QuotationSection } from "~/features/workflow/detail/forms/quotation";
import { ScopingForm } from "~/features/workflow/detail/forms/scoping-form";
import type { LeadDetailView } from "~/server/workflow/application/queries/views/lead-detail";

import { RecordSummaryCard } from "../summary-card/record-summary-card";

import styles from "./record-left-panel.module.css";

type RecordLeftPanelProps = {
  data: LeadDetailView;
};

export function RecordLeftPanel(props: RecordLeftPanelProps) {
  const stage = createMemo(() => props.data.lead.stage);
  const lastQuotation = createMemo(
    () => props.data.quotations[props.data.quotations.length - 1],
  );

  return (
    <div class={styles.panel}>
      <RecordSummaryCard lead={props.data.lead} />
      <div class={styles.scrollBody}>
        <DetailFieldsWidget data={props.data} />

        <Show when={stage() === "SCOPING"}>
          <ScopingForm
            leadId={props.data.lead.id}
            initialValues={props.data.profile}
          />
        </Show>

        <Show when={stage() === "QUOTING"}>
          <QuotationSection
            leadId={props.data.lead.id}
            existingQuotation={lastQuotation()}
          />
        </Show>

        <WorkflowWidget data={props.data} />
        <LeadActionsWidget
          leadId={props.data.lead.id}
          availableActions={props.data.availableActions}
        />
      </div>
    </div>
  );
}
