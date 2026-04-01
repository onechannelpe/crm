import type { LeadStage } from "~/lib/db/types";

export type LeadAvailableAction =
  | "log-call"
  | "add-note"
  | "complete-commercial-input"
  | "create-sale";

export function resolveLeadAvailableActions(input: {
  stage: LeadStage;
  canLogTimeline: boolean;
  canCompleteCommercialInput: boolean;
  canCreateSale: boolean;
}) {
  const actions: LeadAvailableAction[] = [];

  if (input.canLogTimeline) {
    actions.push("log-call", "add-note");
  }

  if (
    input.canCompleteCommercialInput &&
    input.stage === "NEEDS_EXECUTIVE_INPUT"
  ) {
    actions.push("complete-commercial-input");
  }

  if (input.canCreateSale && input.stage === "READY_FOR_SALE") {
    actions.push("create-sale");
  }

  return actions;
}
