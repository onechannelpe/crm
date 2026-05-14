import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/types";

import { leadNotFound } from "../../domain/lead/lead-errors";
import { requestRateNegotiation } from "../../domain/lead/transitions";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";

type Ports = {
  executor: DatabaseExecutor;
};

export async function requestRateNegotiationCommand(
  input: {
    actor: WorkflowActor;
    leadId: string;
    artifactIds: string[];
    justification: string;
    idempotencyKey?: string;
  },
  ports: Ports,
): Promise<Result<{ leadId: string }, DomainError>> {
  if (input.artifactIds.length === 0) {
    return Err(
      domainError(
        "validation",
        "negotiation_files_required",
        "At least one document is required for rate negotiation",
      ),
    );
  }

  return ports.executor.transaction().execute(async (tx) => {
    const leads = createLeadStateRepo(tx);
    const uow = createLeadUow(tx);
    const repos = createWorkflowRepos(tx);
    const state = await leads.findById(input.leadId);
    if (!state) return leadNotFound();

    const existingCount = await repos.leadNegotiationRequests.countByLeadId(
      state.id,
    );

    const artifacts = await Promise.all(
      input.artifactIds.map(async (artifactId) => {
        const fileAssetId =
          await repos.leadNegotiationRequests.findFileAssetIdForArtifact(
            artifactId,
            state.id,
          );
        return { artifactId, fileAssetId };
      }),
    );

    const validatedArtifacts: Array<{
      artifactId: string;
      fileAssetId: number;
    }> = [];
    for (const art of artifacts) {
      if (!art.fileAssetId) {
        return Err(
          domainError(
            "conflict",
            "artifact_not_found",
            `Artifact ${art.artifactId} not found or not ready`,
          ),
        );
      }
      validatedArtifacts.push({
        artifactId: art.artifactId,
        fileAssetId: art.fileAssetId,
      });
    }

    const negotiationRequestId = randomUUIDv7();
    const round = existingCount + 1;
    const now = Date.now();

    const transition = requestRateNegotiation(state, {
      actor: input.actor,
      negotiationRequestId,
      round,
      negotiationRequestCount: existingCount,
      artifactCount: validatedArtifacts.length,
      now,
    });
    if (!transition.ok) return transition;

    const committed = await uow.commit({
      next: transition.value.next,
      events: transition.value.events,
      idempotencyKey: input.idempotencyKey ?? randomUUIDv7(),
    });
    if (!committed.ok) return committed;

    await repos.leadNegotiationRequests.insert({
      id: negotiationRequestId,
      leadId: state.id,
      round,
      justification: input.justification,
      requestedBy: input.actor.userId,
      requestedAt: now,
    });

    await Promise.all(
      validatedArtifacts.map((art) =>
        repos.leadNegotiationRequests.insertFile({
          leadId: state.id,
          negotiationRequestId,
          artifactId: art.artifactId,
          fileAssetId: art.fileAssetId,
          uploadedByUserId: input.actor.userId,
          createdAt: now,
        }),
      ),
    );

    return Ok({ leadId: state.id });
  });
}
