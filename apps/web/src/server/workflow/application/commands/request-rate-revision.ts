import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { RequestRateRevisionCommandInput } from "~/server/workflow/types";

import { requestRateRevision } from "../../domain/lead/commands";
import {
  computeReservationExpiry,
  isReservationActive,
} from "../../domain/lead/reservation";
import { resolveRateProposalPolicy } from "../../domain/pricing-policy";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";
import type { SubmitReadyRevisionFile } from "../ports/entities";

export async function requestRateRevisionCommand(
  input: RequestRateRevisionCommandInput,
  ports: { executor: DatabaseExecutor; now: number },
): Promise<Result<{ leadId: string }, DomainError>> {
  return ports.executor.transaction().execute(async (tx) => {
    const leads = createLeadStateRepo(tx);
    const uow = createLeadUow(tx);
    const repos = createWorkflowRepos(tx);
    const state = await leads.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const proposal = await repos.rateProposals.findLatest(state.id);
    if (!proposal) return Err(fail("rate_proposal_not_found"));
    if (proposal.outcome !== "pending") {
      return Err(fail("rate_proposal_not_pending"));
    }
    const now = ports.now;
    if (!isReservationActive(state, now)) {
      return Err(fail("rate_proposal_expired"));
    }

    const policy = resolveRateProposalPolicy({
      branchPolicy: await repos.rateProposalPolicies.findByBranchId(
        input.actor.branchId,
      ),
    });
    const reservationExpiresAt = computeReservationExpiry({
      now,
      validityDays: policy.validityDays,
    });

    const existingCount = await repos.rateRevisions.countByLeadId(state.id);

    const resolved = await Promise.all(
      input.artifactIds.map(async (artifactId) => {
        const file = await repos.rateRevisions.findSubmitReadyRevisionFile({
          artifactId,
          leadId: state.id,
          uploadedByUserId: input.actor.userId,
        });
        return { artifactId, file };
      }),
    );

    const validatedArtifacts: SubmitReadyRevisionFile[] = [];
    for (const { artifactId, file } of resolved) {
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
      now,
    });
    if (!transition.ok) return transition;

    await repos.rateProposals.markOutcome(
      proposal.id,
      "revision_requested",
      now,
    );

    await repos.rateRevisions.insert({
      id: revisionId,
      leadId: state.id,
      proposalId: proposal.id,
      round,
      justification: input.justification,
      requestedBy: input.actor.userId,
      requestedAt: now,
    });

    await Promise.all(
      validatedArtifacts.map((art) =>
        repos.rateRevisions.insertFile({
          leadId: state.id,
          revisionId,
          artifactId: art.artifactId,
          fileAssetId: art.fileAssetId,
          uploadedByUserId: input.actor.userId,
          createdAt: now,
        }),
      ),
    );

    const committed = await uow.commit({
      next: transition.value.next,
      events: transition.value.events,
      idempotencyKey: randomUUIDv7(),
    });
    if (!committed.ok) return committed;

    return Ok({ leadId: state.id });
  });
}
