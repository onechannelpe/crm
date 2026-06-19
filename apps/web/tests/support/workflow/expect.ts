import { expectOk } from "@tests/support/_core/assertions";
import type { TestRuntime } from "@tests/support/runtime/app";

import type { LeadStatus } from "~/contracts/workflow/vocabulary";

import type { ScenarioActor } from "./leads";

// Lead invariants are asserted through getLeadDetail, the same read model production
// consumers use, rather than by reading raw workflow_leads columns. Every field these
// helpers check (updatedBy, updatedAt, executiveId, status) is exposed on LeadDetailLeadView.
// The caller passes the actor that can see the lead (after a reassign, only the new
// executive or a review role can).

async function loadLead(
  runtime: TestRuntime,
  actor: ScenarioActor,
  leadId: string,
) {
  const detail = await runtime.workflow.queries.getLeadDetail({
    actor,
    leadId,
  });
  return expectOk(detail).lead;
}

export async function expectLeadMetadata(
  runtime: TestRuntime,
  input: {
    actor: ScenarioActor;
    leadId: string;
    updatedBy: number;
    minUpdatedAt?: number;
  },
): Promise<void> {
  const lead = await loadLead(runtime, input.actor, input.leadId);

  if (lead.updatedBy !== input.updatedBy) {
    throw new Error(
      `expected updatedBy=${input.updatedBy} got ${String(lead.updatedBy)}`,
    );
  }
  if (
    input.minUpdatedAt !== undefined &&
    lead.updatedAt <= input.minUpdatedAt
  ) {
    throw new Error(
      `expected updatedAt > ${input.minUpdatedAt} got ${String(lead.updatedAt)}`,
    );
  }
}

export async function expectLeadAssignment(
  runtime: TestRuntime,
  input: {
    actor: ScenarioActor;
    leadId: string;
    executiveId: number;
    updatedBy: number;
  },
): Promise<void> {
  const lead = await loadLead(runtime, input.actor, input.leadId);

  if (lead.executiveId !== input.executiveId) {
    throw new Error(
      `expected executiveId=${input.executiveId} got ${String(lead.executiveId)}`,
    );
  }
  if (lead.updatedBy !== input.updatedBy) {
    throw new Error(
      `expected updatedBy=${input.updatedBy} got ${String(lead.updatedBy)}`,
    );
  }
}

export async function expectLeadStatus(
  runtime: TestRuntime,
  input: {
    actor: ScenarioActor;
    leadId: string;
    updatedBy: number;
    status: LeadStatus;
  },
): Promise<void> {
  const lead = await loadLead(runtime, input.actor, input.leadId);

  if (lead.updatedBy !== input.updatedBy) {
    throw new Error(
      `expected updatedBy=${input.updatedBy} got ${String(lead.updatedBy)}`,
    );
  }
  if (lead.status !== input.status) {
    throw new Error(
      `expected status=${input.status} got ${String(lead.status)}`,
    );
  }
}
