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
  currentProvider: string | null;
  currentDebitRate: number | null;
  currentCreditRate: number | null;
  gpv: number | null;
  ticket: number | null;
  settlementBank: string | null;
  posCount: number | null;
  giroNegocio: string | null;
};

const COMMERCIAL_FIELD_KEYS = [
  "currentProvider",
  "currentDebitRate",
  "currentCreditRate",
  "gpv",
  "ticket",
  "settlementBank",
  "posCount",
  "giroNegocio",
] as const satisfies ReadonlyArray<keyof CommercialSnapshot>;

// Inline correction of the commercial scope captured at registration. There is
// no stage transition: it rewrites the profile fields for the owning executive
// and records the field-level correction on the lead history (and the audit
// spine) like every other mutation.
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
      currentProvider: profile?.currentProvider ?? null,
      currentDebitRate: profile?.currentDebitRate ?? null,
      currentCreditRate: profile?.currentCreditRate ?? null,
      gpv: profile?.gpv ?? null,
      ticket: profile?.ticket ?? null,
      settlementBank: profile?.settlementBank ?? null,
      posCount: profile?.posCount ?? null,
      giroNegocio: org?.giroNegocio ?? null,
    };
    const next: CommercialSnapshot = {
      currentProvider: input.currentProvider,
      currentDebitRate: input.currentDebitRate,
      currentCreditRate: input.currentCreditRate,
      gpv: input.gpv,
      ticket: input.ticket,
      settlementBank: input.settlementBank,
      posCount: input.posCount,
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

    await repos.leadProfiles.updateCommercialScope({
      leadId: state.id,
      fields: {
        currentProvider: input.currentProvider,
        currentDebitRate: input.currentDebitRate,
        currentCreditRate: input.currentCreditRate,
        gpv: input.gpv,
        ticket: input.ticket,
        settlementBank: input.settlementBank,
        posCount: input.posCount,
      },
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
