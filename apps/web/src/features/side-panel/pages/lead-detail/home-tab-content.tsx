import { Show } from "solid-js";

import { CommercialInputSection } from "~/features/pipeline/detail/commercial-input-section";
import { LeadActionsWidget } from "~/features/pipeline/detail/lead-actions-widget";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

import { FieldsWidget } from "./widgets/fields";
import { WorkflowWidget } from "./widgets/workflow";

import pageStyles from "./page.module.css";

export function HomeTabContent(props: { data: LeadDetailView }) {
  return (
    <div class={pageStyles.homeContent}>
      <FieldsWidget data={props.data} />

      <Show when={props.data.lead.stage === "NEEDS_EXECUTIVE_INPUT"}>
        <CommercialInputSection
          leadId={props.data.lead.id}
          initialValues={props.data.commercialInput}
        />
      </Show>

      <WorkflowWidget data={props.data} />

      <LeadActionsWidget
        leadId={props.data.lead.id}
        availableActions={props.data.availableActions}
      />
    </div>
  );
}
