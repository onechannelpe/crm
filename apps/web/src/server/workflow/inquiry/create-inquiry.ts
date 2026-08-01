import { fail, type DomainError } from "~/domain/errors";
import { parseRuc } from "~/domain/identity/document";
import type { WorkflowInquiryId } from "~/domain/ids";
import type { WorkflowActor } from "~/server/workflow/actor";
import { requireCapability } from "~/server/workflow/lead/domain/policy";
import { createLeadRepo } from "~/server/workflow/lead/write/lead-repo";
import type { WorkflowWriteContext } from "~/server/workflow/types";
import { Err, Ok, type Result } from "~/shared/result";

import { createInquiryRepo } from "./repo";

export async function createInquiry(
  input: { ruc: string; actor: WorkflowActor },
  scope: WorkflowWriteContext,
): Promise<Result<{ inquiryId: WorkflowInquiryId }, DomainError>> {
  // Same actor set as registration: an inquiry is a pre-registration ask.
  const canRegister = requireCapability("register", { role: input.actor.role });
  if (!canRegister.ok) return canRegister;

  const ruc = parseRuc(input.ruc);
  if (!ruc.ok) return ruc;

  // The executive's own active lead already receives the answer through the
  // import; an inquiry would duplicate it. Another executive's lead does not
  // block: this executive still wants to know if the client frees up.
  const heldLead = await createLeadRepo(scope.executor).findActiveByRuc(
    ruc.value,
  );
  if (heldLead && heldLead.executiveId === input.actor.userId) {
    return Err(fail("inquiry_lead_registered"));
  }

  const inserted = await createInquiryRepo(scope.executor).insert({
    ruc: ruc.value,
    executiveId: input.actor.userId,
    now: scope.operationAt,
  });
  if (!inserted) {
    return Err(fail("inquiry_exists"));
  }

  return Ok({ inquiryId: inserted.id });
}
