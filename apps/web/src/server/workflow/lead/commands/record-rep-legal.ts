import type { RecordRepLegalInput } from "~/contracts/workflow/inputs";
import { fail, type DomainError } from "~/domain/errors";
import type { WorkflowLeadId } from "~/domain/ids";
import { LEGAL_REPRESENTATIVE_ROLE } from "~/server/organization/organization-repo";
import type { WorkflowActor } from "~/server/workflow/actor";
import type { WorkflowWriteContext } from "~/server/workflow/types";
import { Err, Ok, type Result } from "~/shared/result";

import { recordRepLegal } from "../../lead/domain/decide";
import { runLeadTransaction } from "../write/transition";

export async function recordRepLegalCommand(
  input: Omit<RecordRepLegalInput, "leadId"> & {
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

    const transition = recordRepLegal(state, {
      actor: input.actor,
      nombres: input.nombres,
      apellidoPaterno: input.apellidoPaterno,
      apellidoMaterno: input.apellidoMaterno,
      dni: input.dni,
      telefono: input.telefono,
      email: input.email,
      occurredAt: ctx.operationAt,
    });

    if (!transition.ok) {
      return transition;
    }

    const membership = await ctx.repos.organization.upsertMembership({
      organizationId: state.organizationId,
      person: {
        dni: input.dni,
        names: input.nombres,
        firstSurname: input.apellidoPaterno,
        secondSurname: input.apellidoMaterno,
        email: input.email,
      },
      phone: input.telefono,
      email: input.email,
      upsertedAt: ctx.operationAt,
    });
    await ctx.repos.organization.setPrimaryRole({
      organizationId: state.organizationId,
      organizationPersonId: membership.id,
      role: LEGAL_REPRESENTATIVE_ROLE,
      effectiveAt: ctx.operationAt,
    });

    const committed = await ctx.commitTransition(transition.value);

    if (!committed.ok) {
      return committed;
    }

    return Ok({ leadId: state.id });
  });
}
