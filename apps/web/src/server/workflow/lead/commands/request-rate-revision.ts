import { randomUUIDv7 } from "bun";

import type { RequestRateRevisionInput } from "~/contracts/workflow/inputs";
import { fail, type DomainError } from "~/domain/errors";
import {
  WorkflowRateRevisionId,
  type WorkflowLeadId,
  type WorkflowRateRevisionFileId,
} from "~/domain/ids";
import type { WorkflowActor } from "~/server/workflow/actor";
import type { WorkflowWriteContext } from "~/server/workflow/types";
import { Err, Ok, type Result } from "~/shared/result";

import { requestRateRevision } from "../../lead/domain/decide";
import { resolveRateProposalPolicy } from "../../lead/domain/pricing";
import {
  computeReservationExpiry,
  isReservationActive,
} from "../../lead/domain/reservation";
import type { SubmitReadyRevisionFile } from "../domain/rows";
import { runLeadTransaction } from "../write/transition";

export async function requestRateRevisionCommand(
  input: Omit<RequestRateRevisionInput, "leadId" | "fileIds"> & {
    actor: WorkflowActor;
    leadId: WorkflowLeadId;
    fileIds: WorkflowRateRevisionFileId[];
  },
  scope: WorkflowWriteContext,
): Promise<Result<{ leadId: WorkflowLeadId }, DomainError>> {
  return runLeadTransaction(scope, async (ctx) => {
    const state = await ctx.repos.leads.findById(input.leadId);

    if (!state) {
      return Err(fail("lead_not_found"));
    }

    const proposal = await ctx.repos.rateProposals.findLatest(state.id);

    if (!proposal) {
      return Err(fail("rate_proposal_not_found"));
    }

    if (proposal.outcome !== "pending") {
      return Err(fail("rate_proposal_not_pending"));
    }

    if (!isReservationActive(state, ctx.operationAt)) {
      return Err(fail("rate_proposal_expired"));
    }

    const policy = resolveRateProposalPolicy({
      branchPolicy: await ctx.repos.rateProposalPolicies.findByBranchId(
        input.actor.branchId,
      ),
    });

    const reservationExpiresAt = computeReservationExpiry({
      reservedAt: ctx.operationAt,
      validityDays: policy.validityDays,
    });

    const existingCount = await ctx.repos.rateRevisions.countByLeadId(state.id);

    const revisionFiles = await Promise.all(
      input.fileIds.map(async (fileId) => {
        const file = await ctx.repos.rateRevisions.findSubmitReadyRevisionFile({
          fileId,
          leadId: state.id,
          uploadedByUserId: input.actor.userId,
        });

        return { fileId, file };
      }),
    );

    const validatedFiles: SubmitReadyRevisionFile[] = [];

    for (const { fileId, file } of revisionFiles) {
      if (!file) {
        return Err(
          fail("rate_revision_file_not_submit_ready", {
            details: { fileId },
          }),
        );
      }

      validatedFiles.push(file);
    }

    const revisionId = WorkflowRateRevisionId.trust(randomUUIDv7());
    const round = existingCount + 1;

    const transition = requestRateRevision(state, {
      actor: input.actor,
      revisionId,
      round,
      justification: input.justification,
      fileIds: input.fileIds,
      reservationExpiresAt,
      occurredAt: ctx.operationAt,
    });

    if (!transition.ok) {
      return transition;
    }

    await ctx.repos.rateProposals.markOutcome(
      proposal.id,
      "revision_requested",
      ctx.operationAt,
    );

    await ctx.repos.rateRevisions.insert({
      id: revisionId,
      leadId: state.id,
      proposalId: proposal.id,
      round,
      justification: input.justification,
      requestedBy: input.actor.userId,
      requestedAt: ctx.operationAt,
    });

    await Promise.all(
      validatedFiles.map((file) =>
        ctx.repos.rateRevisions.attachFileToRevision({
          revisionId,
          fileId: file.fileId,
        }),
      ),
    );

    const committed = await ctx.commitTransition(transition.value);

    if (!committed.ok) {
      return committed;
    }

    return Ok({ leadId: state.id });
  });
}
