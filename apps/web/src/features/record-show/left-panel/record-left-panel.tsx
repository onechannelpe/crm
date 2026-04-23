import { createMemo, Show } from "solid-js";

import { DetailFieldsWidget } from "~/features/side-panel/pages/record-page/widgets/fields";
import { WorkflowWidget } from "~/features/side-panel/pages/record-page/widgets/workflow";
import { CommercialInputSection } from "~/features/workflow/detail/commercial-input-section";
import { LeadActionsWidget } from "~/features/workflow/detail/lead-actions-widget";
import { QuotationSection } from "~/features/workflow/detail/quotation-section";
import { SaleSection } from "~/features/workflow/detail/sale-section";
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

        <Show when={stage() === "NEEDS_EXECUTIVE_INPUT"}>
          <CommercialInputSection
            leadId={props.data.lead.id}
            initialValues={props.data.commercialInput}
          />
        </Show>

        <Show when={stage() === "READY_FOR_QUOTATION"}>
          <QuotationSection
            leadId={props.data.lead.id}
            existingQuotation={lastQuotation()}
          />
        </Show>

        <Show when={stage() === "READY_FOR_SALE"}>
          <SaleSection leadId={props.data.lead.id} />
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
