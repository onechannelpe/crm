import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { RecordRepLegalCommandInput } from "~/server/workflow/types";

import { recordRepLegal } from "../../domain/lead/commands";
import { runLeadTransaction } from "../lead-transaction";

export async function recordRepLegalCommand(
  input: RecordRepLegalCommandInput,
  ports: { executor: DatabaseExecutor; now: number },
): Promise<Result<{ leadId: string }, DomainError>> {
  return runLeadTransaction(ports, async (ctx) => {
    const state = await ctx.repos.leadStates.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const transition = recordRepLegal(state, {
      actor: input.actor,
      nombres: input.nombres,
      apellidoPaterno: input.apellidoPaterno,
      apellidoMaterno: input.apellidoMaterno,
      dni: input.dni,
      telefono: input.telefono,
      email: input.email,
      now: ctx.now,
    });
    if (!transition.ok) return transition;

    await ctx.repos.party.upsertPrimaryLegalRepresentative({
      organizationId: state.organizationId,
      nombres: input.nombres,
      apellidoPaterno: input.apellidoPaterno,
      apellidoMaterno: input.apellidoMaterno,
      dni: input.dni,
      telefono: input.telefono,
      email: input.email,
    });

    const committed = await ctx.commit(transition.value);
    if (!committed.ok) return committed;

    return Ok({ leadId: state.id });
  });
}
