import type { DomainError } from "~/server/shared/domain-error";
import { domainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { isQuotedLeadSubject } from "../../domain/lead-subjects";
import { invalidLeadStage, leadNotFound } from "../../domain/lead/lead-errors";
import type { LeadReadRepository } from "../../ports/lead-read-repository";
import type { RequestRateNegotiationInput } from "../contracts/command-inputs";
import type { LeadCommandResult } from "../contracts/command-results";
import {
  canRequestRateNegotiation,
  requirePipelineActionAccess,
} from "../policies/access";
import type { LeadMutationUow } from "../ports/lead-mutation-uow";
import type { NegotiationRequestRepository } from "../ports/negotiation-request-repository";
import type { LeadClock } from "../services/lead-clock";

// Configurable via sourcing policy in future iterations
const MAX_NEGOTIATION_ROUNDS = 3;

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
  const canRequest = requirePipelineActionAccess(
    input.actor.role,
    canRequestRateNegotiation,
  );
  if (!canRequest.ok) return canRequest;

  const lead = await deps.leadReader.findById(input.leadId);
  if (!lead) return leadNotFound();
  if (!isQuotedLeadSubject(lead)) return invalidLeadStage();

  if (lead.executiveId !== input.actor.userId) {
    return Err(
      domainError(
        "forbidden",
        "forbidden",
        "Only the assigned executive can request rate negotiation",
      ),
    );
  }

  const existingCount = await deps.negotiationRequests.countByLeadId(lead.id);
  if (existingCount >= MAX_NEGOTIATION_ROUNDS) {
    return Err(
      domainError(
        "conflict",
        "max_negotiation_rounds_reached",
        `Maximum of ${MAX_NEGOTIATION_ROUNDS} negotiation rounds allowed`,
      ),
    );
  }

  const round = existingCount + 1;
  const now = deps.clock.now();

  const negotiationRequestId = await deps.negotiationRequests.insert({
    leadId: lead.id,
    round,
    justification: input.justification,
    requestedBy: input.actor.userId,
    requestedAt: now,
  });

  const artifacts = await Promise.all(
    input.artifactIds.map(async (artifactId) => {
      const fileAssetId =
        await deps.negotiationRequests.findFileAssetIdForArtifact(artifactId);
      return { artifactId, fileAssetId };
    }),
  );

  const validatedArtifacts: Array<{ artifactId: string; fileAssetId: number }> =
    [];

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

  const outcome = await deps.mutationUow.commit({
    lead,
    actorUserId: input.actor.userId,
    now,
    intent: { kind: "request_rate_negotiation", negotiationRequestId, round },
  });
  if (!outcome.ok) return outcome;

  return Ok({ leadId: lead.id });
}
