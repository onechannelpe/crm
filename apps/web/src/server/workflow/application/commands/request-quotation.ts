import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/types";

import { parseRequiredAbonoBank } from "../../domain/lead-schema-parser";
import { leadNotFound } from "../../domain/lead/lead-errors";
import { requestQuotation } from "../../domain/lead/transitions";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";

type Ports = {
  executor: DatabaseExecutor;
};

export async function requestQuotationCommand(
  input: {
    actor: WorkflowActor;
    leadId: string;
    proveedorActual: string;
    tasaActual: number;
    gpv: number;
    ticket: number;
    giroNegocio: string;
    abonoBank: string;
    posTotal: number;
    idempotencyKey?: string;
  },
  ports: Ports,
): Promise<Result<{ leadId: string }, DomainError>> {
  if (!input.proveedorActual.trim()) {
    return Err(
      domainError(
        "validation",
        "proveedor_actual_required",
        "Proveedor actual is required",
      ),
    );
  }
  if (!input.giroNegocio.trim()) {
    return Err(
      domainError(
        "validation",
        "giro_negocio_required",
        "Giro de negocio is required",
      ),
    );
  }

  return ports.executor.transaction().execute(async (tx) => {
    const repos = createWorkflowRepos(tx);
    const leads = createLeadStateRepo(tx);
    const uow = createLeadUow(tx);

    const state = await leads.findById(input.leadId);
    if (!state) return leadNotFound();

    const abonoBank = parseRequiredAbonoBank(input.abonoBank);
    if (!abonoBank.ok) return abonoBank;
    const now = Date.now();
    const transition = requestQuotation(state, { actor: input.actor, now });
    if (!transition.ok) return transition;

    await repos.leadProfiles.upsert({
      leadId: state.id,
      proveedorActual: input.proveedorActual,
      tasaActual: input.tasaActual,
      gpv: input.gpv,
      ticket: input.ticket,
      abonoBank: abonoBank.value,
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
      idempotencyKey: input.idempotencyKey ?? randomUUIDv7(),
    });
    if (!committed.ok) return committed;

    return Ok({ leadId: state.id });
  });
}
