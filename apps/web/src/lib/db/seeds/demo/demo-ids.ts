import { randomUUIDv7 } from "bun";

import {
  UserId,
  WorkflowLeadId,
  WorkflowRateProposalId,
  WorkflowVenueId,
} from "~/server/shared/ids";

const newUserId = () => UserId.trust(randomUUIDv7());
const newWorkflowLeadId = () => WorkflowLeadId.trust(randomUUIDv7());
const newWorkflowRateProposalId = () =>
  WorkflowRateProposalId.trust(randomUUIDv7());
const newWorkflowVenueId = () => WorkflowVenueId.trust(randomUUIDv7());

export const DEMO_BRANCH_1 = randomUUIDv7();
export const DEMO_BRANCH_2 = randomUUIDv7();
export const DEMO_BRANCH_3 = randomUUIDv7();

export const DEMO_TEAM_ALPHA = randomUUIDv7();
export const DEMO_TEAM_BRAVO = randomUUIDv7();
export const DEMO_TEAM_NORTE = randomUUIDv7();
export const DEMO_TEAM_NORTE_B = randomUUIDv7();

export const WORKFLOW_LEAD_IDS = {
  pending: newWorkflowLeadId(),
  needs: newWorkflowLeadId(),
  ready: newWorkflowLeadId(),
  quoted: newWorkflowLeadId(),
  forSale: newWorkflowLeadId(),
  converted: newWorkflowLeadId(),
  rejected: newWorkflowLeadId(),
} as const;

export const WORKFLOW_RATE_PROPOSAL_IDS = {
  quoted: newWorkflowRateProposalId(),
  forSale: newWorkflowRateProposalId(),
  converted: newWorkflowRateProposalId(),
} as const;

export const WORKFLOW_VENUE_IDS = {
  converted: newWorkflowVenueId(),
} as const;

export const WORKFLOW_LEAD_ASSIGNMENT_IDS = {
  pending: randomUUIDv7(),
  needs: randomUUIDv7(),
  ready: randomUUIDv7(),
  quoted: randomUUIDv7(),
  forSale: randomUUIDv7(),
  converted: randomUUIDv7(),
  rejected: randomUUIDv7(),
} as const;

export const WORKFLOW_VENUE_ACCOUNT_IDS = {
  pen: randomUUIDv7(),
  usd: randomUUIDv7(),
} as const;

export const VALERIA = newUserId();
export const DIEGO = newUserId();
export const CAMILA = newUserId();
export const JOSEFINA = newUserId();
export const MATIAS = newUserId();
export const LUCIA = newUserId();
export const ANDRES = newUserId();
export const NICOLAS = newUserId();
export const SOFIA = newUserId();
export const GABRIEL = newUserId();
export const ELENA = newUserId();
export const ROBERTO = newUserId();
export const ISABELLA = newUserId();
export const MANUEL = newUserId();
export const FERNANDA = newUserId();
export const CLAUDIA = newUserId();
export const PABLO = newUserId();
export const MARINA = newUserId();
export const MARIANA = newUserId();
export const JOSE = newUserId();
