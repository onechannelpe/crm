import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { EditCommercialScopeCommandInput } from "~/server/workflow/types";

import { authorizeLeadAction } from "../../domain/lead/policy";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";

// Inline correction of the commercial scope captured at registration. There is
// no stage transition: it just rewrites the profile fields for the owning
// executive.
export async function editCommercialScopeCommand(
  input: EditCommercialScopeCommandInput,
  ports: { executor: DatabaseExecutor },
): Promise<Result<{ leadId: string }, DomainError>> {
  return ports.executor.transaction().execute(async (tx) => {
    const repos = createWorkflowRepos(tx);
    const leads = createLeadStateRepo(tx);

    const state = await leads.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const authz = authorizeLeadAction(
      "edit-commercial-scope",
      input.actor,
      state,
    );
    if (!authz.ok) return authz;

    const profile = await repos.leadProfiles.findByLeadId(input.leadId);
    const now = Date.now();

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

    return Ok({ leadId: state.id });
  });
}
