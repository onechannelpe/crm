import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { DomainError } from "~/server/shared/domain-error";
import { isErr, Ok, type Result } from "~/server/shared/result";
import { parseRequiredLeadText } from "~/server/workflow/parsers";
import type { SaveCommercialScopeCommandInput } from "~/server/workflow/types";

import { saveCommercialScope } from "../../domain/lead/commands";
import { leadNotFound } from "../../domain/lead/lead-errors";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";

export async function saveCommercialScopeCommand(
  input: SaveCommercialScopeCommandInput,
  ports: { executor: DatabaseExecutor },
): Promise<Result<{ leadId: string }, DomainError>> {
  const proveedorActual = parseRequiredLeadText(
    input.proveedorActual,
    "proveedor_actual_required",
    "Proveedor actual is required",
  );
  if (isErr(proveedorActual)) return proveedorActual;

  const giroNegocio = parseRequiredLeadText(
    input.giroNegocio,
    "giro_negocio_required",
    "Giro de negocio is required",
  );
  if (isErr(giroNegocio)) return giroNegocio;

  return ports.executor.transaction().execute(async (tx) => {
    const repos = createWorkflowRepos(tx);
    const leads = createLeadStateRepo(tx);
    const uow = createLeadUow(tx);

    const state = await leads.findById(input.leadId);
    if (!state) return leadNotFound();
    const profile = await repos.leadProfiles.findByLeadId(input.leadId);

    const now = Date.now();
    const transition = saveCommercialScope(state, {
      actor: input.actor,
      proveedorActual: proveedorActual.value,
      tasaActual: input.tasaActual,
      gpv: input.gpv,
      ticket: input.ticket,
      giroNegocio: giroNegocio.value,
      abonoBank: input.abonoBank,
      posTotal: input.posTotal,
      now,
    });
    if (!transition.ok) return transition;

    await repos.leadProfiles.upsert({
      leadId: state.id,
      proveedorActual: proveedorActual.value,
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
      giroNegocio: giroNegocio.value,
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
