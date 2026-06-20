import type { UpdateVenueInput } from "~/contracts/workflow/inputs";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/actor";
import {
  parseVenueDigitalFields,
  toVenueDigitalInsert,
} from "~/server/workflow/lead/digital-policy/domain";

import { updateVenue } from "../../lead/domain/decide";
import { runLeadTransaction } from "../write/transition";

export async function updateVenueCommand(
  input: UpdateVenueInput & {
    actor: WorkflowActor;
  },
  ports: {
    executor: DatabaseExecutor;
    now: number;
  },
): Promise<Result<{ leadId: string }, DomainError>> {
  return runLeadTransaction(ports, async (ctx) => {
    const state = await ctx.repos.leadStates.findById(input.leadId);

    if (!state) {
      return Err(fail("lead_not_found"));
    }

    const venue = await ctx.repos.leadVenues.findById(input.venueId);

    if (!venue.ok) {
      return venue;
    }

    if (!venue.value || venue.value.leadId !== input.leadId) {
      return Err(fail("venue_not_found"));
    }

    const digitalPolicy = await ctx.repos.digitalPolicies.findByLeadId(
      input.leadId,
    );

    const parsedVenueFields = parseVenueDigitalFields(
      {
        linkScope: digitalPolicy?.linkScope ?? "none",
        onlineScope: digitalPolicy?.onlineScope ?? "none",
      },
      input.digitalConfig,
    );

    if (!parsedVenueFields.ok) {
      return parsedVenueFields;
    }

    const transition = updateVenue(state, {
      actor: input.actor,
      venueId: input.venueId,
      tradeName: input.tradeName,
      now: ctx.now,
    });

    if (!transition.ok) {
      return transition;
    }

    const digital = toVenueDigitalInsert(parsedVenueFields.value);

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

    if (!committed.ok) {
      return committed;
    }

    return Ok({ leadId: state.id });
  });
}
