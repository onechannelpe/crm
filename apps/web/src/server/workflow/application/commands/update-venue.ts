import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";
import type { UpdateVenueCommandInput } from "~/server/workflow/types";

import { updateVenue } from "../../domain/lead/commands";
import { leadNotFound } from "../../domain/lead/lead-errors";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";
import {
  parseVenueDigitalFields,
  toVenueDigitalInsert,
} from "../services/digital-product-policy";
import { parseVenueTextFields } from "../services/venue-fields";

export async function updateVenueCommand(
  input: UpdateVenueCommandInput,
  ports: { executor: DatabaseExecutor },
): Promise<Result<{ leadId: string }, DomainError>> {
  const fields = parseVenueTextFields(input);
  if (isErr(fields)) return fields;
  const {
    nombreComercial,
    direccion,
    referencia,
    distrito,
    provincia,
    departamento,
  } = fields.value;

  return ports.executor.transaction().execute(async (tx) => {
    const repos = createWorkflowRepos(tx);
    const leads = createLeadStateRepo(tx);
    const uow = createLeadUow(tx);

    const state = await leads.findById(input.leadId);
    if (!state) return leadNotFound();

    const venue = await repos.leadVenues.findById(input.venueId);
    if (!venue.ok) return venue;
    if (!venue.value || venue.value.leadId !== input.leadId) {
      return Err(
        domainError(
          "not_found",
          "venue_not_found",
          "Venue not found for this lead",
        ),
      );
    }

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
    const transition = updateVenue(state, {
      actor: input.actor,
      venueId: input.venueId,
      nombreComercial,
      now,
    });
    if (!transition.ok) return transition;

    const digital = toVenueDigitalInsert(venueFields.value);
    await repos.leadVenues.update(input.venueId, {
      nombreComercial,
      posQuantity: input.posQuantity,
      linkUrl: digital.linkUrl,
      onlineUrl: digital.onlineUrl,
      onlineModalidad: digital.onlineModalidad,
      direccion,
      referencia,
      distrito,
      provincia,
      departamento,
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
