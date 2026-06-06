import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { CreateVenueCommandInput } from "~/server/workflow/types";

import { createVenue } from "../../domain/lead/commands";
import { leadNotFound } from "../../domain/lead/lead-errors";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";
import {
  parseVenueDigitalFields,
  toVenueDigitalInsert,
} from "../services/digital-product-policy";

export async function createVenueCommand(
  input: CreateVenueCommandInput,
  ports: { executor: DatabaseExecutor },
): Promise<Result<{ leadId: string }, DomainError>> {
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
      nombreComercial: input.nombreComercial,
      posQuantity: input.posQuantity,
      direccion: input.direccion,
      referencia: input.referencia,
      distrito: input.distrito,
      provincia: input.provincia,
      departamento: input.departamento,
      now,
    });
    if (!transition.ok) return transition;

    const digital = toVenueDigitalInsert(venueFields.value);
    await tx
      .insertInto("workflow_lead_venues")
      .values({
        id: venueId,
        lead_id: input.leadId,
        nombre_comercial: input.nombreComercial,
        pos_quantity: input.posQuantity,
        link_url: digital.linkUrl,
        online_url: digital.onlineUrl,
        online_modalidad: digital.onlineModalidad,
        direccion: input.direccion,
        referencia: input.referencia,
        distrito: input.distrito,
        provincia: input.provincia,
        departamento: input.departamento,
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

    return Ok({ leadId: state.id });
  });
}
