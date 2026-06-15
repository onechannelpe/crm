import { Show } from "solid-js";

import type { LeadDetailView } from "~/contracts/workflow/views";

import { ProposeRateSection } from "../forms/pricing/propose-rate";
import { RateProposalSection } from "../forms/pricing/rate-proposal";
import { RepLegalSection } from "../forms/rep-legal-section";

type WorkflowStageSectionsProps = {
  leadId: string;
  data: LeadDetailView;
};

export function WorkflowStageSections(props: WorkflowStageSectionsProps) {
  const latestProposal = () => props.data.rateProposals.at(-1);
  const canPropose = () => props.data.availableActions.includes("propose-rate");

  return (
    <>
      <Show when={props.data.lead.stage === "PRICING"}>
        <Show when={latestProposal()}>
          {(proposal) => (
            <RateProposalSection
              leadId={props.leadId}
              proposal={proposal()}
              reservationExpiresAt={props.data.lead.reservationExpiresAt}
              rateRevisions={props.data.rateRevisions}
              canAccept={props.data.availableActions.includes("accept-rate")}
              canRequestRevision={props.data.availableActions.includes(
                "request-rate-revision",
              )}
            />
          )}
        </Show>
        <Show when={canPropose()}>
          <ProposeRateSection
            leadId={props.leadId}
            latestProposal={latestProposal()}
          />
        </Show>
      </Show>

      <RepLegalSection leadId={props.leadId} data={props.data} />
    </>
  );
}
