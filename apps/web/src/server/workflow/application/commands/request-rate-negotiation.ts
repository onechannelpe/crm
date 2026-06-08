import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { RequestRateNegotiationCommandInput } from "~/server/workflow/types";

import { requestRateNegotiation } from "../../domain/lead/commands";
import { leadNotFound } from "../../domain/lead/lead-errors";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";
import type { SubmitReadyNegotiationFile } from "../ports/entities";

export async function requestRateNegotiationCommand(
  input: RequestRateNegotiationCommandInput,
  ports: { executor: DatabaseExecutor },
): Promise<Result<{ leadId: string }, DomainError>> {
  return ports.executor.transaction().execute(async (tx) => {
    const leads = createLeadStateRepo(tx);
    const uow = createLeadUow(tx);
    const repos = createWorkflowRepos(tx);
    const state = await leads.findById(input.leadId);
    if (!state) return leadNotFound();

    const existingCount = await repos.leadNegotiationRequests.countByLeadId(
      state.id,
    );

    const resolved = await Promise.all(
      input.artifactIds.map(async (artifactId) => {
        const file =
          await repos.leadNegotiationRequests.findSubmitReadyNegotiationFile({
            artifactId,
            leadId: state.id,
            uploadedByUserId: input.actor.userId,
          });
        return { artifactId, file };
      }),
    );

    const validatedArtifacts: SubmitReadyNegotiationFile[] = [];
    for (const { artifactId, file } of resolved) {
      if (!file) {
        return Err(
          domainError(
            "conflict",
            "negotiation_file_not_submit_ready",
            `Artifact ${artifactId} is not ready for negotiation submission`,
          ),
        );
      }
      validatedArtifacts.push(file);
    }

    const negotiationRequestId = randomUUIDv7();
    const round = existingCount + 1;
    const now = Date.now();

    const transition = requestRateNegotiation(state, {
      actor: input.actor,
      negotiationRequestId,
      round,
      justification: input.justification,
      artifactIds: input.artifactIds,
      now,
    });
    if (!transition.ok) return transition;

    const committed = await uow.commit({
      next: transition.value.next,
      events: transition.value.events,
      idempotencyKey: randomUUIDv7(),
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
