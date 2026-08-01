import type { DomainError } from "~/domain/errors";
import type { WorkflowLeadId } from "~/domain/ids";
import { reviewLead } from "~/server/workflow/lead/domain/decide";
import type { LeadState } from "~/server/workflow/lead/domain/state";
import type { LeadTransaction } from "~/server/workflow/lead/write/transition";
import { Ok, type Result } from "~/shared/result";

import { isAnswerFresh } from "./carryover";
import { createInquiryRepo, type InquiryRow } from "./repo";

const CARRYOVER_REASON = "Carried from answered inquiry";

// Runs inside the registration transaction, after the lead row and its
// registration events exist. Marks the inquiry converted and, when its answer
// is fresh, re-applies that answer as the same import-grade review the lead
// would otherwise wait a cycle for, attributed to the back-office user whose
// import produced it.
//
// Carry-over is best effort: a missing or no-longer-authorized reviewer just
// leaves the lead in QUALIFYING for the next import to stamp. Only commit
// failures propagate, because they mean the transaction itself is broken.
export async function convertInquiryOnRegistration(
  ctx: LeadTransaction,
  input: {
    inquiry: InquiryRow;
    leadId: WorkflowLeadId;
    bornState: LeadState;
  },
): Promise<Result<void, DomainError>> {
  const { inquiry } = input;

  await createInquiryRepo(ctx.tx).markConverted(
    inquiry.id,
    input.leadId,
    ctx.operationAt,
  );

  if (
    inquiry.status === null ||
    inquiry.answeredAt === null ||
    inquiry.answeredBy === null ||
    !isAnswerFresh(inquiry.answeredAt, ctx.operationAt)
  ) {
    return Ok(undefined);
  }

  const reviewer = await ctx.tx
    .selectFrom("users")
    .select(["id", "role"])
    .where("id", "=", inquiry.answeredBy)
    .executeTakeFirst();
  if (!reviewer) return Ok(undefined);

  const actor = { userId: reviewer.id, role: reviewer.role };

  const statusTransition = reviewLead(input.bornState, {
    actor,
    rowType: "status",
    status: inquiry.status,
    priority: input.bornState.priority,
    reason: CARRYOVER_REASON,
    now: ctx.operationAt,
  });
  if (!statusTransition.ok) return Ok(undefined);

  const statusCommitted = await ctx.commitTransition(statusTransition.value);
  if (!statusCommitted.ok) return statusCommitted;

  // A priority-less answer stamps only the status, exactly like a status-only
  // import row: the stage changes once both fields are known.
  if (inquiry.priority === null) return Ok(undefined);

  const priorityTransition = reviewLead(statusTransition.value.next, {
    actor,
    rowType: "priority",
    status: statusTransition.value.next.status,
    priority: inquiry.priority,
    reason: CARRYOVER_REASON,
    now: ctx.operationAt,
  });
  if (!priorityTransition.ok) return Ok(undefined);

  const priorityCommitted = await ctx.commitTransition(
    priorityTransition.value,
  );
  if (!priorityCommitted.ok) return priorityCommitted;

  return Ok(undefined);
}
