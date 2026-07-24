import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { parseRuc } from "~/server/shared/document";
import { fail, type DomainError } from "~/server/shared/domain-error";
import type { WorkflowInquiryId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/actor";
import { requireCapability } from "~/server/workflow/lead/domain/policy";
import { createLeadRepo } from "~/server/workflow/lead/write/lead-repo";

import { createInquiryRepo } from "./repo";

export async function createInquiry(
  input: { ruc: string; actor: WorkflowActor },
  ports: { executor: DatabaseExecutor; now: Date },
): Promise<Result<{ inquiryId: WorkflowInquiryId }, DomainError>> {
  // Same actor set as registration: an inquiry is a pre-registration ask.
  const canRegister = requireCapability("register", { role: input.actor.role });
  if (!canRegister.ok) return canRegister;

  const ruc = parseRuc(input.ruc);
  if (!ruc.ok) return ruc;

  // The executive's own active lead already receives the answer through the
  // import; an inquiry would duplicate it. Another executive's lead does not
  // block: this executive still wants to know if the client frees up.
  const heldLead = await createLeadRepo(ports.executor).findActiveByRuc(
    ruc.value,
  );
  if (heldLead && heldLead.executiveId === input.actor.userId) {
    return Err(fail("inquiry_lead_registered"));
  }

  const inserted = await createInquiryRepo(ports.executor).insert({
    ruc: ruc.value,
    executiveId: input.actor.userId,
    now: ports.now,
  });
  if (!inserted) {
    return Err(fail("inquiry_exists"));
  }

  return Ok({ inquiryId: inserted.id });
}
