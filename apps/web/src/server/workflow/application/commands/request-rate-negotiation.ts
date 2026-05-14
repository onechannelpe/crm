import { randomUUIDv7 } from "bun";

import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/types";

import { leadNotFound } from "../../domain/lead/lead-errors";
import { requestRateNegotiation } from "../../domain/lead/transitions";
import type { LeadStateRepository } from "../../infrastructure/lead-state-repo";
import type { NegotiationRequestRepository } from "../ports/entities";
import type { LeadUnitOfWork } from "../ports/uow";

type Ports = {
  leads: LeadStateRepository;
  uow: LeadUnitOfWork;
  negotiationRequests: NegotiationRequestRepository;
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

  const state = await ports.leads.findById(input.leadId);
  if (!state) return leadNotFound();

  const existingCount = await ports.negotiationRequests.countByLeadId(state.id);

  const artifacts = await Promise.all(
    input.artifactIds.map(async (artifactId) => {
      const fileAssetId =
        await ports.negotiationRequests.findFileAssetIdForArtifact(
          artifactId,
          state.id,
        );
      return { artifactId, fileAssetId };
    }),
  );

  const validatedArtifacts: Array<{ artifactId: string; fileAssetId: number }> = [];
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
    validatedArtifacts.push({ artifactId: art.artifactId, fileAssetId: art.fileAssetId });
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

  const committed = await ports.uow.commit({
    next: transition.value.next,
    events: transition.value.events,
    idempotencyKey: input.idempotencyKey ?? randomUUIDv7(),
  });
  if (!committed.ok) return committed;

  await ports.negotiationRequests.insert({
    id: negotiationRequestId,
    leadId: state.id,
    round,
    justification: input.justification,
    requestedBy: input.actor.userId,
    requestedAt: now,
  });

  await Promise.all(
    validatedArtifacts.map((art) =>
      ports.negotiationRequests.insertFile({
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
}
