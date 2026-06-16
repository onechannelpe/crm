import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { EditCommercialScopeCommandInput } from "~/server/workflow/types";

import { editCommercialScope } from "../../domain/lead/commands";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";

// Inline correction of the commercial scope captured at registration. There is
// no stage transition: it rewrites the profile fields for the owning executive
// and records the correction on the lead history like every other mutation.
export async function editCommercialScopeCommand(
  input: EditCommercialScopeCommandInput,
  ports: { executor: DatabaseExecutor; now: number },
): Promise<Result<{ leadId: string }, DomainError>> {
  return ports.executor.transaction().execute(async (tx) => {
    const repos = createWorkflowRepos(tx);
    const leads = createLeadStateRepo(tx);
    const uow = createLeadUow(tx);

    const state = await leads.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const now = ports.now;
    const transition = editCommercialScope(state, {
      actor: input.actor,
      now,
    });
    if (!transition.ok) return transition;

    const profile = await repos.leadProfiles.findByLeadId(input.leadId);

    await repos.leadProfiles.upsert({
      leadId: state.id,
      proveedorActual: input.proveedorActual,
      tasaActual: input.tasaActual,
      gpv: input.gpv,
      ticket: input.ticket,
      linkScope: profile?.linkScope ?? "none",
      linkUrl: profile?.linkUrl ?? null,
      onlineScope: profile?.onlineScope ?? "none",
      onlineUrl: profile?.onlineUrl ?? null,
      onlineModalidad: profile?.onlineModalidad ?? null,
      abonoBank: input.abonoBank,
      posTotal: input.posTotal,
      updatedAt: now,
      updatedBy: input.actor.userId,
    });

    await repos.party.updateOrganizationCommercial({
      organizationId: state.organizationId,
      giroNegocio: input.giroNegocio,
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
