import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/types";

import { parseRequiredLeadText } from "../../domain/lead-schema-parser";
import { leadNotFound } from "../../domain/lead/lead-errors";
import { recordRepLegal } from "../../domain/lead/transitions";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";

type Ports = {
  executor: DatabaseExecutor;
};

export async function recordRepLegalCommand(
  input: {
    actor: WorkflowActor;
    leadId: string;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    dni: string;
    telefono: string;
    email: string;
    idempotencyKey?: string;
  },
  ports: Ports,
): Promise<Result<{ leadId: string }, DomainError>> {
  const nombres = parseRequiredLeadText(
    input.nombres,
    "nombres_required",
    "Nombres is required",
  );
  if (!nombres.ok) return nombres;
  const apellidoPaterno = parseRequiredLeadText(
    input.apellidoPaterno,
    "apellido_paterno_required",
    "Apellido paterno is required",
  );
  if (!apellidoPaterno.ok) return apellidoPaterno;
  const apellidoMaterno = parseRequiredLeadText(
    input.apellidoMaterno,
    "apellido_materno_required",
    "Apellido materno is required",
  );
  if (!apellidoMaterno.ok) return apellidoMaterno;
  const dni = parseRequiredLeadText(
    input.dni,
    "dni_required",
    "DNI is required",
  );
  if (!dni.ok) return dni;
  const telefono = parseRequiredLeadText(
    input.telefono,
    "telefono_required",
    "Telefono is required",
  );
  if (!telefono.ok) return telefono;
  const email = parseRequiredLeadText(
    input.email,
    "email_required",
    "Email is required",
  );
  if (!email.ok) return email;

  return ports.executor.transaction().execute(async (tx) => {
    const repos = createWorkflowRepos(tx);
    const leads = createLeadStateRepo(tx);
    const uow = createLeadUow(tx);

    const state = await leads.findById(input.leadId);
    if (!state) return leadNotFound();

    const now = Date.now();
    const transition = recordRepLegal(state, {
      actor: input.actor,
      nombres: nombres.value,
      apellidoPaterno: apellidoPaterno.value,
      apellidoMaterno: apellidoMaterno.value,
      dni: dni.value,
      telefono: telefono.value,
      email: email.value,
      now,
    });
    if (!transition.ok) return transition;

    await repos.party.upsertPrimaryLegalRepresentative({
      organizationId: state.organizationId,
      nombres: nombres.value,
      apellidoPaterno: apellidoPaterno.value,
      apellidoMaterno: apellidoMaterno.value,
      dni: dni.value,
      telefono: telefono.value,
      email: email.value,
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
