import { Match, Show, Switch, createMemo } from "solid-js";

import { CommercialInputSection } from "~/features/workflow/detail/commercial-input-section";
import { LeadActionsWidget } from "~/features/workflow/detail/lead-actions-widget";
import { QuotationSection } from "~/features/workflow/detail/quotation-section";
import { SaleSection } from "~/features/workflow/detail/sale-section";
import type { LeadDetailView } from "~/server/workflow/application/queries/views/lead-detail";

import { BootstrapWidget } from "../widgets/bootstrap";
import { CreateFieldsWidget, DetailFieldsWidget } from "../widgets/fields";
import { SunatWidget } from "../widgets/sunat";
import { WorkflowWidget } from "../widgets/workflow";
import type { TabContentProps } from "./content-props";

import styles from "./home.module.css";

export function HomeTab(props: TabContentProps) {
  const viewProps = createMemo(() => (props.mode === "view" ? props : null));
  const createProps = createMemo(() =>
    props.mode === "create" ? props : null,
  );

  return (
    <Switch>
      <Match when={viewProps()} keyed>
        {(view) => (
          <div class={styles.homeContent}>
            <DetailContent data={view.data} />
          </div>
        )}
      </Match>
      <Match when={createProps()} keyed>
        {(create) => (
          <div class={styles.homeContent}>
            <CreateContent
              razonSocial={create.razonSocial}
              address={create.address}
              engineStatus={create.engineStatus}
              submitting={create.submitting}
              onSubmit={create.onSubmit}
            />
          </div>
        )}
      </Match>
    </Switch>
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

      <Show when={props.data.lead.id} keyed>
        {(leadId) => (
          <Switch>
            <Match when={props.data.lead.stage === "NEEDS_EXECUTIVE_INPUT"}>
              <CommercialInputSection
                leadId={leadId}
                initialValues={props.data.commercialInput}
              />
            </Match>

            <Match when={props.data.lead.stage === "READY_FOR_QUOTATION"}>
              <QuotationSection
                leadId={leadId}
                existingQuotation={
                  props.data.quotations[props.data.quotations.length - 1]
                }
              />
            </Match>

            <Match when={props.data.lead.stage === "READY_FOR_SALE"}>
              <SaleSection leadId={leadId} />
            </Match>
          </Switch>
        )}
      </Show>

      <WorkflowWidget data={props.data} />

      <LeadActionsWidget
        leadId={props.data.lead.id}
        availableActions={props.data.availableActions}
      />
    </>
  );
}
