import { randomUUIDv7 } from "bun";

import { diffFields } from "~/contracts/events";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { EditCommercialScopeCommandInput } from "~/server/workflow/types";

import { editCommercialScope } from "../../domain/lead/commands";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";

type CommercialSnapshot = {
  proveedorActual: string | null;
  tasaDebitoActual: number | null;
  tasaCreditoActual: number | null;
  gpv: number | null;
  ticket: number | null;
  abonoBank: string | null;
  posTotal: number | null;
  giroNegocio: string | null;
};

const COMMERCIAL_FIELD_KEYS = [
  "proveedorActual",
  "tasaDebitoActual",
  "tasaCreditoActual",
  "gpv",
  "ticket",
  "abonoBank",
  "posTotal",
  "giroNegocio",
] as const satisfies ReadonlyArray<keyof CommercialSnapshot>;

// Inline correction of the commercial scope captured at registration. There is
// no stage transition: it rewrites the profile fields for the owning executive
// and records the field-level correction on the lead history (and the audit
// spine) like every other mutation. No movement means no correction.
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
    const profile = await repos.leadProfiles.findByLeadId(input.leadId);
    const org = await repos.party.findOrganizationById(state.organizationId);

    const prev: CommercialSnapshot = {
      proveedorActual: profile?.proveedorActual ?? null,
      tasaDebitoActual: profile?.tasaDebitoActual ?? null,
      tasaCreditoActual: profile?.tasaCreditoActual ?? null,
      gpv: profile?.gpv ?? null,
      ticket: profile?.ticket ?? null,
      abonoBank: profile?.abonoBank ?? null,
      posTotal: profile?.posTotal ?? null,
      giroNegocio: org?.giroNegocio ?? null,
    };
    const next: CommercialSnapshot = {
      proveedorActual: input.proveedorActual,
      tasaDebitoActual: input.tasaDebitoActual,
      tasaCreditoActual: input.tasaCreditoActual,
      gpv: input.gpv,
      ticket: input.ticket,
      abonoBank: input.abonoBank,
      posTotal: input.posTotal,
      giroNegocio: input.giroNegocio,
    };

    const changes = diffFields(prev, next, COMMERCIAL_FIELD_KEYS);
    if (changes.length === 0) {
      return Ok({ leadId: state.id });
    }

    const transition = editCommercialScope(state, {
      actor: input.actor,
      changes,
      now,
    });
    if (!transition.ok) return transition;

    await repos.leadProfiles.upsert({
      leadId: state.id,
      proveedorActual: input.proveedorActual,
      tasaDebitoActual: input.tasaDebitoActual,
      tasaCreditoActual: input.tasaCreditoActual,
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
