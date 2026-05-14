import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type {
  LeadCommandResult,
  RecordRepLegalCommandInput,
} from "~/server/workflow/types";

import { leadNotFound } from "../../domain/lead/lead-errors";
import {
  canCompleteScoping,
  requirePipelineActionAccess,
} from "../policies/access";
import type { LeadMutationUow } from "../ports/lead-mutation-uow";
import type { LeadReadRepository } from "../ports/lead-read-repository";
import type { PartyRepository } from "../ports/party-repository";
import type { LeadClock } from "../services/lead-clock";

type RecordRepLegalCommandDeps = {
  leadReader: LeadReadRepository;
  mutationUow: LeadMutationUow;
  party: PartyRepository;
  clock: LeadClock;
};

export async function recordRepLegalCommand(
  deps: RecordRepLegalCommandDeps,
  input: RecordRepLegalCommandInput,
): Promise<Result<LeadCommandResult, DomainError>> {
  const canRecord = requirePipelineActionAccess(
    input.actor.role,
    canCompleteScoping,
  );
  if (!canRecord.ok) return canRecord;

  const lead = await deps.leadReader.findById(input.leadId);
  if (!lead) return leadNotFound();

  if (lead.executiveId !== input.actor.userId) {
    return Err(
      domainError(
        "forbidden",
        "not_owner",
        "Only the assigned executive can record rep legal",
      ),
    );
  }

  if (lead.stage !== "CLOSING") {
    return Err(
      domainError("validation", "wrong_stage", "Lead is not in CLOSING stage"),
    );
  }

  await deps.party.upsertPrimaryLegalRepresentative({
    organizationId: lead.organizationId,
    nombres: input.nombres,
    apellidoPaterno: input.apellidoPaterno,
    apellidoMaterno: input.apellidoMaterno,
    dni: input.dni,
    telefono: input.telefono,
    email: input.email,
  });

  const now = deps.clock.now();
  const outcome = await deps.mutationUow.commit({
    lead,
    actorUserId: input.actor.userId,
    now,
    intent: {
      kind: "record_rep_legal",
      nombres: input.nombres,
      apellidoPaterno: input.apellidoPaterno,
      apellidoMaterno: input.apellidoMaterno,
      dni: input.dni,
      telefono: input.telefono,
      email: input.email,
    },
  });
  if (!outcome.ok) return outcome;

  return Ok({ leadId: lead.id });
}
