import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type {
  VenueDigitalConfig,
  WorkflowActor,
} from "~/server/workflow/types";

import { parseRequiredLeadText } from "../../domain/lead-schema-parser";
import { leadNotFound } from "../../domain/lead/lead-errors";
import { createVenue } from "../../domain/lead/transitions";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";
import {
  parseVenueDigitalFields,
  toVenueDigitalInsert,
} from "../services/digital-product-policy";

type Ports = {
  executor: DatabaseExecutor;
};

export async function createVenueCommand(
  input: {
    actor: WorkflowActor;
    leadId: string;
    nombreComercial: string;
    posQuantity: number;
    digitalConfig?: VenueDigitalConfig;
    direccion: string;
    referencia: string;
    distrito: string;
    provincia: string;
    departamento: string;
    idempotencyKey?: string;
  },
  ports: Ports,
): Promise<Result<{ leadId: string }, DomainError>> {
  const nombreComercial = parseRequiredLeadText(
    input.nombreComercial,
    "nombre_comercial_required",
    "Nombre comercial is required",
  );
  if (!nombreComercial.ok) return nombreComercial;
  const direccion = parseRequiredLeadText(
    input.direccion,
    "direccion_required",
    "Direccion is required",
  );
  if (!direccion.ok) return direccion;
  const referencia = parseRequiredLeadText(
    input.referencia,
    "referencia_required",
    "Referencia is required",
  );
  if (!referencia.ok) return referencia;
  const distrito = parseRequiredLeadText(
    input.distrito,
    "distrito_required",
    "Distrito is required",
  );
  if (!distrito.ok) return distrito;
  const provincia = parseRequiredLeadText(
    input.provincia,
    "provincia_required",
    "Provincia is required",
  );
  if (!provincia.ok) return provincia;
  const departamento = parseRequiredLeadText(
    input.departamento,
    "departamento_required",
    "Departamento is required",
  );
  if (!departamento.ok) return departamento;

  return ports.executor.transaction().execute(async (tx) => {
    const repos = createWorkflowRepos(tx);
    const leads = createLeadStateRepo(tx);
    const uow = createLeadUow(tx);

    const state = await leads.findById(input.leadId);
    if (!state) return leadNotFound();

    const profile = await repos.leadProfiles.findByLeadId(input.leadId);
    const venueFields = parseVenueDigitalFields(
      {
        linkScope: profile?.linkScope ?? "none",
        onlineScope: profile?.onlineScope ?? "none",
      },
      input.digitalConfig,
    );
    if (!venueFields.ok) return venueFields;

    const now = Date.now();
    const venueId = randomUUIDv7();
    const transition = createVenue(state, {
      actor: input.actor,
      venueId,
      nombreComercial: nombreComercial.value,
      posQuantity: input.posQuantity,
      direccion: direccion.value,
      referencia: referencia.value,
      distrito: distrito.value,
      provincia: provincia.value,
      departamento: departamento.value,
      now,
    });
    if (!transition.ok) return transition;

    await tx
      .insertInto("workflow_lead_venues")
      .values({
        id: venueId,
        lead_id: input.leadId,
        nombre_comercial: nombreComercial.value,
        pos_quantity: input.posQuantity,
        ...toVenueDigitalInsert(venueFields.value),
        direccion: direccion.value,
        referencia: referencia.value,
        distrito: distrito.value,
        provincia: provincia.value,
        departamento: departamento.value,
        created_at: now,
        created_by: input.actor.userId,
      })
      .executeTakeFirstOrThrow();

    const committed = await uow.commit({
      next: transition.value.next,
      events: transition.value.events,
      idempotencyKey: input.idempotencyKey ?? randomUUIDv7(),
    });
    if (!committed.ok) return committed;

    return Ok({ leadId: state.id });
  });
}
