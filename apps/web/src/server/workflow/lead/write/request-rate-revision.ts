import { randomUUIDv7 } from "bun";

import type { RequestRateRevisionInput } from "~/contracts/workflow/inputs";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/actor";

import { requestRateRevision } from "../../lead/domain/decide";
import { resolveRateProposalPolicy } from "../../lead/domain/pricing";
import {
  computeReservationExpiry,
  isReservationActive,
} from "../../lead/domain/reservation";
import type { SubmitReadyRevisionFile } from "../domain/rows";
import { runLeadTransaction } from "./transition";

export async function requestRateRevisionCommand(
  input: RequestRateRevisionInput & {
    actor: WorkflowActor;
  },
  ports: {
    executor: DatabaseExecutor;
    now: number;
  },
): Promise<Result<{ leadId: string }, DomainError>> {
  return runLeadTransaction(ports, async (ctx) => {
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

    if (!isReservationActive(state, ctx.now)) {
      return Err(fail("rate_proposal_expired"));
    }

    const policy = resolveRateProposalPolicy({
      branchPolicy: await ctx.repos.rateProposalPolicies.findByBranchId(
        input.actor.branchId,
      ),
    });

    const reservationExpiresAt = computeReservationExpiry({
      now: ctx.now,
      validityDays: policy.validityDays,
    });

    const existingCount = await ctx.repos.rateRevisions.countByLeadId(state.id);

    const revisionFiles = await Promise.all(
      input.artifactIds.map(async (artifactId) => {
        const file = await ctx.repos.rateRevisions.findSubmitReadyRevisionFile({
          artifactId,
          leadId: state.id,
          uploadedByUserId: input.actor.userId,
        });

        return { artifactId, file };
      }),
    );

    const validatedArtifacts: SubmitReadyRevisionFile[] = [];

    for (const { artifactId, file } of revisionFiles) {
      if (!file) {
        return Err(
          fail("rate_revision_file_not_submit_ready", {
            details: { artifactId },
          }),
        );
      }

      validatedArtifacts.push(file);
    }

    const revisionId = randomUUIDv7();
    const round = existingCount + 1;

    const transition = requestRateRevision(state, {
      actor: input.actor,
      revisionId,
      round,
      justification: input.justification,
      artifactIds: input.artifactIds,
      reservationExpiresAt,
      now: ctx.now,
    });

    if (!transition.ok) {
      return transition;
    }

    await ctx.repos.rateProposals.markOutcome(
      proposal.id,
      "revision_requested",
      ctx.now,
    );

    await ctx.repos.rateRevisions.insert({
      id: revisionId,
      leadId: state.id,
      proposalId: proposal.id,
      round,
      justification: input.justification,
      requestedBy: input.actor.userId,
      requestedAt: ctx.now,
    });

    await Promise.all(
      validatedArtifacts.map((artifact) =>
        ctx.repos.rateRevisions.insertFile({
          leadId: state.id,
          revisionId,
          artifactId: artifact.artifactId,
          fileAssetId: artifact.fileAssetId,
          uploadedByUserId: input.actor.userId,
          createdAt: ctx.now,
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
