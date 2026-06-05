import { Match, Switch } from "solid-js";

import type { LeadDetailView } from "~/contracts/workflow/views";

import { ReviewSection } from "../actions/review-section";
import { CommercialScopeSection } from "../forms/commercial-scope-section";
import { QuotationSection } from "../forms/quotation";
import { QuotedSection } from "../forms/quoted";
import { RepLegalSection } from "../forms/rep-legal-section";

type WorkflowStageSectionsProps = {
  leadId: string;
  data: LeadDetailView;
};

export function WorkflowStageSections(props: WorkflowStageSectionsProps) {
  const latestQuotation = () => props.data.quotations.at(-1);
  const canReview = () => props.data.availableActions.includes("review-lead");
  const canCreateQuotation = () =>
    props.data.availableActions.includes("create-quotation");
  const canApprove = () =>
    props.data.availableActions.includes("approve-for-sale");
  const canRequestNegotiation = () =>
    props.data.availableActions.includes("request-rate-negotiation");

  return (
    <>
      <CommercialScopeSection leadId={props.leadId} data={props.data} />

      <Switch>
        <Match when={props.data.lead.stage === "QUALIFYING" && canReview()}>
          <ReviewSection leadId={props.leadId} />
        </Match>
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

      <RepLegalSection leadId={props.leadId} data={props.data} />
    </>
  );
}
