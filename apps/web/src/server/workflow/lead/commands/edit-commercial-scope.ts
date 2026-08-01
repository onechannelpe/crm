import { diffFields } from "~/contracts/events";
import type { EditCommercialScopeInput } from "~/contracts/workflow/inputs";
import { fail, type DomainError } from "~/domain/errors";
import type { WorkflowLeadId } from "~/domain/ids";
import type { WorkflowActor } from "~/server/workflow/actor";
import type { WorkflowWriteContext } from "~/server/workflow/types";
import { Err, Ok, type Result } from "~/shared/result";

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
  scope: WorkflowWriteContext,
): Promise<Result<{ leadId: string }, DomainError>> {
  return runLeadTransaction(scope, async (ctx) => {
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
      now: ctx.operationAt,
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
      ctx.operationAt,
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
