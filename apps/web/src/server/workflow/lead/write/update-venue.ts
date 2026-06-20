import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import {
  parseVenueDigitalFields,
  toVenueDigitalInsert,
} from "~/server/workflow/lead/domain/digital-policy";
import type { UpdateVenueCommandInput } from "~/server/workflow/types";

import { updateVenue } from "../../lead/domain/decide";
import { runLeadTransaction } from "./transition";

export async function updateVenueCommand(
  input: UpdateVenueCommandInput,
  ports: { executor: DatabaseExecutor; now: number },
): Promise<Result<{ leadId: string }, DomainError>> {
  return runLeadTransaction(ports, async (ctx) => {
    const state = await ctx.repos.leadStates.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const venue = await ctx.repos.leadVenues.findById(input.venueId);
    if (!venue.ok) return venue;
    if (!venue.value || venue.value.leadId !== input.leadId) {
      return Err(fail("venue_not_found"));
    }

    const digitalPolicy = await ctx.repos.digitalPolicies.findByLeadId(
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

    const transition = updateVenue(state, {
      actor: input.actor,
      venueId: input.venueId,
      tradeName: input.tradeName,
      now: ctx.now,
    });
    if (!transition.ok) return transition;

    const digital = toVenueDigitalInsert(venueFields.value);
    await ctx.repos.leadVenues.update(input.venueId, {
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

    const committed = await ctx.commit(transition.value);
    if (!committed.ok) return committed;

    return Ok({ leadId: state.id });
  });
}
