import { diffFields } from "~/contracts/events";
import type { EditCommercialScopeInput } from "~/contracts/workflow/inputs";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import type { WorkflowLeadId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/actor";

import { editCommercialScope } from "../../lead/domain/decide";
import { runLeadTransaction } from "../write/transition";

type CommercialSnapshot = {
  currentProvider: string;
  currentDebitRate: number;
  currentCreditRate: number;
  gpv: number;
  ticket: number;
  settlementBank: string;
  posCount: number;
  lineOfBusiness: string | null;
};

const COMMERCIAL_FIELD_KEYS = [
  "currentProvider",
  "currentDebitRate",
  "currentCreditRate",
  "gpv",
  "ticket",
  "settlementBank",
  "posCount",
  "lineOfBusiness",
] as const satisfies ReadonlyArray<keyof CommercialSnapshot>;

export async function editCommercialScopeCommand(
  input: Omit<EditCommercialScopeInput, "leadId"> & {
    actor: WorkflowActor;
    leadId: WorkflowLeadId;
  },
  ports: {
    executor: DatabaseExecutor;
    now: Date;
  },
): Promise<Result<{ leadId: string }, DomainError>> {
  return runLeadTransaction(ports, async (ctx) => {
    const state = await ctx.repos.leads.findById(input.leadId);

    if (!state) {
      return Err(fail("lead_not_found"));
    }

    const commercial = await ctx.repos.leads.findCommercialScope(input.leadId);

    if (!commercial) {
      return Err(fail("lead_not_found"));
    }

    const org = await ctx.repos.organization.findOrganizationById(
      state.organizationId,
    );

    // Normalize an absent line of business to "" (not null) so a per-field edit
    // that leaves it untouched sends "" and diffs clean; diffFields treats
    // null !== "" and would otherwise log a spurious change on every save.
    const prev: CommercialSnapshot = {
      ...commercial,
      lineOfBusiness: org?.lineOfBusiness ?? "",
    };

    const next: CommercialSnapshot = {
      currentProvider: input.currentProvider,
      currentDebitRate: input.currentDebitRate,
      currentCreditRate: input.currentCreditRate,
      gpv: input.gpv,
      ticket: input.ticket,
      settlementBank: input.settlementBank,
      posCount: input.posCount,
      lineOfBusiness: input.lineOfBusiness,
    };

    const changes = diffFields(prev, next, COMMERCIAL_FIELD_KEYS);

    if (changes.length === 0) {
      return Ok({ leadId: state.id });
    }

    const transition = editCommercialScope(state, {
      actor: input.actor,
      changes,
      now: ctx.now,
    });

    if (!transition.ok) {
      return transition;
    }

    await ctx.repos.leads.updateCommercialSnapshot(
      state.id,
      {
        currentProvider: input.currentProvider,
        currentDebitRate: input.currentDebitRate,
        currentCreditRate: input.currentCreditRate,
        gpv: input.gpv,
        ticket: input.ticket,
        settlementBank: input.settlementBank,
        posCount: input.posCount,
      },
      ctx.now,
      input.actor.userId,
    );

    await ctx.repos.organization.updateCommercialProfile({
      organizationId: state.organizationId,
      lineOfBusiness: input.lineOfBusiness,
    });

    const committed = await ctx.commitTransition(transition.value);

    if (!committed.ok) {
      return committed;
    }

    return Ok({ leadId: state.id });
  });
}
