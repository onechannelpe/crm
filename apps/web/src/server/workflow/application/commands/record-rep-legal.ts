import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { RecordRepLegalCommandInput } from "~/server/workflow/types";

import { recordRepLegal } from "../../domain/lead/commands";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";

export async function recordRepLegalCommand(
  input: RecordRepLegalCommandInput,
  ports: { executor: DatabaseExecutor; now: number },
): Promise<Result<{ leadId: string }, DomainError>> {
  return ports.executor.transaction().execute(async (tx) => {
    const repos = createWorkflowRepos(tx);
    const leads = createLeadStateRepo(tx);
    const uow = createLeadUow(tx);

    const state = await leads.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const now = ports.now;
    const transition = recordRepLegal(state, {
      actor: input.actor,
      nombres: input.nombres,
      apellidoPaterno: input.apellidoPaterno,
      apellidoMaterno: input.apellidoMaterno,
      dni: input.dni,
      telefono: input.telefono,
      email: input.email,
      now,
    });
    if (!transition.ok) return transition;

    await repos.party.upsertPrimaryLegalRepresentative({
      organizationId: state.organizationId,
      nombres: input.nombres,
      apellidoPaterno: input.apellidoPaterno,
      apellidoMaterno: input.apellidoMaterno,
      dni: input.dni,
      telefono: input.telefono,
      email: input.email,
    });

    const committed = await uow.commit({
      next: transition.value.next,
      events: transition.value.events,
      idempotencyKey: randomUUIDv7(),
    });
    if (!committed.ok) return committed;

    return Ok({ leadId: state.id });
  });
}
