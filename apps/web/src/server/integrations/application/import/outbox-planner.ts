import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { enqueueNeedsExecutiveOutboxEvents } from "./outbox-needs-executive-repo";
import { enqueueReadyForQuotationOutboxEvents } from "./outbox-ready-for-quotation-repo";
import type { LeadMutationOutcome, PlannedOutboxEvents } from "./types";

export function createEmptyOutboxPlan(): PlannedOutboxEvents {
  return {
    needsExecutiveInput: [],
    readyForQuotation: [],
  };
}

export async function planOutboxForMutation(input: {
  executor: DatabaseExecutor;
  mutation: LeadMutationOutcome;
  outboxPlan: PlannedOutboxEvents;
}) {
  const mutation = input.mutation;
  if (!mutation.stageChanged) {
    return;
  }

  if (
    mutation.nextStage === "NEEDS_EXECUTIVE_INPUT" &&
    mutation.executiveId > 0
  ) {
    input.outboxPlan.needsExecutiveInput.push({
      leadId: mutation.leadId,
      ruc: mutation.ruc,
      executiveId: mutation.executiveId,
    });
    return;
  }

  if (mutation.nextStage !== "READY_FOR_QUOTATION") {
    return;
  }

  const user = await input.executor
    .selectFrom("users")
    .select("branch_id")
    .where("id", "=", mutation.executiveId)
    .executeTakeFirst();
  if (!user || user.branch_id <= 0) {
    return;
  }

  input.outboxPlan.readyForQuotation.push({
    leadId: mutation.leadId,
    ruc: mutation.ruc,
    executiveId: mutation.executiveId,
    branchId: user.branch_id,
  });
}

export async function persistOutboxPlan(input: {
  executor: DatabaseExecutor;
  outboxPlan: PlannedOutboxEvents;
  now: number;
}) {
  await enqueueNeedsExecutiveOutboxEvents(
    input.executor,
    input.outboxPlan.needsExecutiveInput,
    input.now,
  );
  await enqueueReadyForQuotationOutboxEvents(
    input.executor,
    input.outboxPlan.readyForQuotation,
    input.now,
  );
}
