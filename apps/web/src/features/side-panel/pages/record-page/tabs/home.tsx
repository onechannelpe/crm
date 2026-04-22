import { Show } from "solid-js";

import { CommercialInputSection } from "~/features/pipeline/detail/commercial-input-section";
import { LeadActionsWidget } from "~/features/pipeline/detail/lead-actions-widget";
import { QuotationSection } from "~/features/pipeline/detail/quotation-section";
import { SaleSection } from "~/features/pipeline/detail/sale-section";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

import { BootstrapWidget } from "../widgets/bootstrap";
import { CreateFieldsWidget, DetailFieldsWidget } from "../widgets/fields";
import { SunatWidget } from "../widgets/sunat";
import { WorkflowWidget } from "../widgets/workflow";
import type { TabContentProps } from "./content-props";

import styles from "./home.module.css";

export function HomeTab(props: TabContentProps) {
  if (props.mode === "create") {
    return (
      <div class={styles.homeContent}>
        <CreateContent
          razonSocial={props.razonSocial}
          address={props.address}
          engineStatus={props.engineStatus}
          submitting={props.submitting}
          onSubmit={props.onSubmit}
        />
      </div>
    );
  }

  return (
    <div class={styles.homeContent}>
      <DetailContent data={props.data} />
    </div>
  );
}

function CreateContent(props: {
  razonSocial?: string | null;
  address?: string | null;
  engineStatus?: string;
  submitting?: boolean;
  onSubmit?: () => void;
}) {
  return (
    <>
      <CreateFieldsWidget
        razonSocial={props.razonSocial}
        address={props.address}
      />
      <BootstrapWidget
        engineStatus={props.engineStatus}
        submitting={props.submitting}
        onSubmit={props.onSubmit}
      />
      <SunatWidget />
    </>
  );
}

function DetailContent(props: { data: LeadDetailView }) {
  return (
    <>
      <DetailFieldsWidget data={props.data} />

      <Show when={props.data.lead.stage === "NEEDS_EXECUTIVE_INPUT"}>
        <CommercialInputSection
          leadId={props.data.lead.id}
          initialValues={props.data.commercialInput}
        />
      </Show>

      <Show when={props.data.lead.stage === "READY_FOR_QUOTATION"}>
        <QuotationSection
          leadId={props.data.lead.id}
          existingQuotation={
            props.data.quotations[props.data.quotations.length - 1]
          }
        />
      </Show>

      <Show when={props.data.lead.stage === "READY_FOR_SALE"}>
        <SaleSection leadId={props.data.lead.id} />
      </Show>

      <WorkflowWidget data={props.data} />

      <LeadActionsWidget
        leadId={props.data.lead.id}
        availableActions={props.data.availableActions}
      />
    </>
  );
}
