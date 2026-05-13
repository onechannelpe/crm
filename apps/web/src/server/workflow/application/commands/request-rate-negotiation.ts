import { randomUUIDv7 } from "bun";

import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { leadNotFound } from "../../domain/lead/lead-errors";
import type { RequestRateNegotiationInput } from "../contracts/command-inputs";
import type { LeadCommandResult } from "~/contracts/workflow";
import { requireLeadActionAccess } from "../policies/lead-action-policy";
import type { LeadMutationUow } from "../ports/lead-mutation-uow";
import type { LeadReadRepository } from "../ports/lead-read-repository";
import type { NegotiationRequestRepository } from "../ports/negotiation-request-repository";
import type { LeadClock } from "../services/lead-clock";

type Deps = {
  leadReader: LeadReadRepository;
  mutationUow: LeadMutationUow;
  negotiationRequests: NegotiationRequestRepository;
  clock: LeadClock;
};

export async function requestRateNegotiationCommand(
  deps: Deps,
  input: RequestRateNegotiationInput,
): Promise<Result<LeadCommandResult, DomainError>> {
  const lead = await deps.leadReader.findById(input.leadId);
  if (!lead) return leadNotFound();

  if (input.artifactIds.length === 0) {
    return Err(
      domainError(
        "validation",
        "negotiation_files_required",
        "At least one document is required for rate negotiation",
      ),
    );
  }

  const existingCount = await deps.negotiationRequests.countByLeadId(lead.id);
  const canRequest = requireLeadActionAccess({
    action: "request-rate-negotiation",
    actorUserId: input.actor.userId,
    actorRole: input.actor.role,
    lead,
    negotiationRequestCount: existingCount,
    artifactCount: input.artifactIds.length,
  });
  if (!canRequest.ok) return canRequest;

  const round = existingCount + 1;
  const now = deps.clock.now();
  const negotiationRequestId = randomUUIDv7();

  const artifacts = await Promise.all(
    input.artifactIds.map(async (artifactId) => {
      const fileAssetId =
        await deps.negotiationRequests.findFileAssetIdForArtifact(
          artifactId,
          lead.id,
        );
      return { artifactId, fileAssetId };
    }),
  );

  const validatedArtifacts: Array<{ artifactId: string; fileAssetId: number }> =
    [];

  for (const art of artifacts) {
    if (!art.fileAssetId) {
      return {
        ok: false,
        error: domainError(
          "conflict",
          "artifact_not_found",
          `Artifact ${art.artifactId} not found or not ready`,
        ),
      };
    }
    validatedArtifacts.push({
      artifactId: art.artifactId,
      fileAssetId: art.fileAssetId,
    });
  }

  const outcome = await deps.mutationUow.commit({
    lead,
    actorUserId: input.actor.userId,
    now,
    intent: { kind: "request_rate_negotiation", negotiationRequestId, round },
  });
  if (!outcome.ok) return outcome;

  await deps.negotiationRequests.insert({
    id: negotiationRequestId,
    leadId: lead.id,
    round,
    justification: input.justification,
    requestedBy: input.actor.userId,
    requestedAt: now,
  });

  await Promise.all(
    validatedArtifacts.map((art) =>
      deps.negotiationRequests.insertFile({
        leadId: lead.id,
        negotiationRequestId,
        artifactId: art.artifactId,
        fileAssetId: art.fileAssetId,
        uploadedByUserId: input.actor.userId,
        createdAt: now,
      }),
    ),
  );

  return Ok({ leadId: lead.id });
}
