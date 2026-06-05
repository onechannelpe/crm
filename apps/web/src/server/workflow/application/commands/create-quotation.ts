import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { CreateQuotationCommandInput } from "~/server/workflow/types";

import { leadNotFound } from "../../domain/lead/lead-errors";
import { createQuotation } from "../../domain/lead/transitions";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";

export async function createQuotationCommand(
  input: CreateQuotationCommandInput,
  ports: { executor: DatabaseExecutor },
): Promise<Result<{ id: string }, DomainError>> {
  return ports.executor.transaction().execute(async (tx) => {
    const repos = createWorkflowRepos(tx);
    const leads = createLeadStateRepo(tx);
    const uow = createLeadUow(tx);

    const state = await leads.findById(input.leadId);
    if (!state) return leadNotFound();

    const now = Date.now();
    const version = await repos.leadQuotations.nextVersion(state.id);
    const quotationId = randomUUIDv7();

    const transition = createQuotation(state, {
      actor: input.actor,
      quotationId,
      version,
      moneda: input.moneda,
      now,
    });
    if (!transition.ok) return transition;

    await tx
      .insertInto("workflow_quotations")
      .values({
        id: quotationId,
        lead_id: state.id,
        payback_pricing: input.paybackPricing,
        tarifa_debito: input.tarifaDebito,
        tarifa_credito: input.tarifaCredito,
        tarifa_foraneo: input.tarifaForaneo,
        fee: input.fee,
        moneda: input.moneda,
        version,
        created_at: now,
        created_by: input.actor.userId,
      })
      .executeTakeFirstOrThrow();

    const committed = await uow.commit({
      next: transition.value.next,
      events: transition.value.events,
      idempotencyKey: randomUUIDv7(),
    });
    if (!committed.ok) return committed;

    return Ok({ id: quotationId });
  });
}
