import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { LeadCommandResult } from "~/server/workflow/types";
import type { ApproveForSaleInput } from "~/server/workflow/types";

import { leadNotFound } from "../../domain/lead/lead-errors";
import { requireLeadActionAccess } from "../policies/lead-action-policy";
import type { LeadMutationUow } from "../ports/lead-mutation-uow";
import type { LeadReadRepository } from "../ports/lead-read-repository";
import type { LeadClock } from "../services/lead-clock";

type ApproveForSaleCommandDeps = {
  leadReader: LeadReadRepository;
  mutationUow: LeadMutationUow;
  clock: LeadClock;
};

export async function approveForSaleCommand(
  deps: ApproveForSaleCommandDeps,
  input: ApproveForSaleInput,
): Promise<Result<LeadCommandResult, DomainError>> {
  const lead = await deps.leadReader.findById(input.leadId);
  if (!lead) return leadNotFound();

  const canApprove = requireLeadActionAccess({
    action: "approve-for-sale",
    actorUserId: input.actor.userId,
    actorRole: input.actor.role,
    lead,
  });
  if (!canApprove.ok) return canApprove;

  const now = deps.clock.now();
  const outcome = await deps.mutationUow.commit({
    lead,
    actorUserId: input.actor.userId,
    now,
    intent: { kind: "approve_for_sale" },
  });
  if (!outcome.ok) return outcome;

  return Ok({ leadId: lead.id });
}
