import { Match, Switch } from "solid-js";

import type { LeadDetailView } from "~/contracts/workflow/views";

import { CommercialScopeWidget } from "../forms/commercial-scope-widget";
import { QuotationSection } from "../forms/quotation";
import { QuotedSection } from "../forms/quoted";
import { RepLegalWidget } from "../forms/rep-legal-widget";

type WorkflowStageSectionsProps = {
  leadId: string;
  data: LeadDetailView;
};

export function WorkflowStageSections(props: WorkflowStageSectionsProps) {
  const latestQuotation = () => props.data.quotations.at(-1);
  const canCreateQuotation = () =>
    props.data.availableActions.includes("create-quotation");
  const canApprove = () =>
    props.data.availableActions.includes("approve-for-sale");
  const canRequestNegotiation = () =>
    props.data.availableActions.includes("request-rate-negotiation");

  return (
    <>
      <CommercialScopeWidget leadId={props.leadId} data={props.data} />

      <Switch>
        <Match
          when={props.data.lead.stage === "QUOTING" && canCreateQuotation()}
        >
          <QuotationSection
            leadId={props.leadId}
            existingQuotation={latestQuotation()}
          />
        </Match>
        <Match when={props.data.lead.stage === "QUOTED" && latestQuotation()}>
          {(quotation) => (
            <QuotedSection
              leadId={props.leadId}
              quotation={quotation()}
              negotiationRequests={props.data.negotiationRequests}
              canRequestNegotiation={canRequestNegotiation()}
              canApprove={canApprove()}
            />
          )}
        </Match>
      </Switch>

      <RepLegalWidget leadId={props.leadId} data={props.data} />
    </>
  );
}
