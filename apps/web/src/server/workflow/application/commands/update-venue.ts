import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { UpdateVenueCommandInput } from "~/server/workflow/types";

import { updateVenue } from "../../domain/lead/commands";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";
import {
  parseVenueDigitalFields,
  toVenueDigitalInsert,
} from "../services/digital-product-policy";

export async function updateVenueCommand(
  input: UpdateVenueCommandInput,
  ports: { executor: DatabaseExecutor; now: number },
): Promise<Result<{ leadId: string }, DomainError>> {
  return ports.executor.transaction().execute(async (tx) => {
    const repos = createWorkflowRepos(tx);
    const leads = createLeadStateRepo(tx);
    const uow = createLeadUow(tx);

    const state = await leads.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const venue = await repos.leadVenues.findById(input.venueId);
    if (!venue.ok) return venue;
    if (!venue.value || venue.value.leadId !== input.leadId) {
      return Err(fail("venue_not_found"));
    }

    const digitalPolicy = await repos.digitalPolicies.findByLeadId(
      input.leadId,
    );
    const venueFields = parseVenueDigitalFields(
      {
        linkScope: digitalPolicy?.linkScope ?? "none",
        onlineScope: digitalPolicy?.onlineScope ?? "none",
      },
      input.digitalConfig,
    );
    if (!venueFields.ok) return venueFields;

    const now = ports.now;
    const transition = updateVenue(state, {
      actor: input.actor,
      venueId: input.venueId,
      tradeName: input.tradeName,
      now,
    });
    if (!transition.ok) return transition;

    const digital = toVenueDigitalInsert(venueFields.value);
    await repos.leadVenues.update(input.venueId, {
      tradeName: input.tradeName,
      posQuantity: input.posQuantity,
      linkUrl: digital.linkUrl,
      onlineUrl: digital.onlineUrl,
      onlineCollectionMode: digital.onlineCollectionMode,
      address: input.address,
      addressReference: input.addressReference,
      district: input.district,
      province: input.province,
      department: input.department,
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
