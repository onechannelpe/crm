import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { DomainError } from "~/server/shared/domain-error";
import { isErr, Ok, type Result } from "~/server/shared/result";
import { parseRequiredLeadText } from "~/server/workflow/parsers";
import type { RecordRepLegalCommandInput } from "~/server/workflow/types";

import { recordRepLegal } from "../../domain/lead/commands";
import { leadNotFound } from "../../domain/lead/lead-errors";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";

export async function recordRepLegalCommand(
  input: RecordRepLegalCommandInput,
  ports: { executor: DatabaseExecutor },
): Promise<Result<{ leadId: string }, DomainError>> {
  const nombres = parseRequiredLeadText(
    input.nombres,
    "nombres_required",
    "Nombres is required",
  );
  if (isErr(nombres)) return nombres;

  const apellidoPaterno = parseRequiredLeadText(
    input.apellidoPaterno,
    "apellido_paterno_required",
    "Apellido paterno is required",
  );
  if (isErr(apellidoPaterno)) return apellidoPaterno;

  const apellidoMaterno = parseRequiredLeadText(
    input.apellidoMaterno,
    "apellido_materno_required",
    "Apellido materno is required",
  );
  if (isErr(apellidoMaterno)) return apellidoMaterno;

  const dni = parseRequiredLeadText(
    input.dni,
    "dni_required",
    "DNI is required",
  );
  if (isErr(dni)) return dni;

  const telefono = parseRequiredLeadText(
    input.telefono,
    "telefono_required",
    "Telefono is required",
  );
  if (isErr(telefono)) return telefono;

  const email = parseRequiredLeadText(
    input.email,
    "email_required",
    "Email is required",
  );
  if (isErr(email)) return email;

  const repLegal = {
    nombres: nombres.value,
    apellidoPaterno: apellidoPaterno.value,
    apellidoMaterno: apellidoMaterno.value,
    dni: dni.value,
    telefono: telefono.value,
    email: email.value,
  };

  return ports.executor.transaction().execute(async (tx) => {
    const repos = createWorkflowRepos(tx);
    const leads = createLeadStateRepo(tx);
    const uow = createLeadUow(tx);

    const state = await leads.findById(input.leadId);
    if (!state) return leadNotFound();

    const now = Date.now();
    const transition = recordRepLegal(state, {
      actor: input.actor,
      ...repLegal,
      now,
    });
    if (!transition.ok) return transition;

    await repos.party.upsertPrimaryLegalRepresentative({
      organizationId: state.organizationId,
      ...repLegal,
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
