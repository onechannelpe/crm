import type { UpdateVenueInput } from "~/contracts/workflow/inputs";
import { fail, type DomainError } from "~/domain/errors";
import type { WorkflowLeadId, WorkflowVenueId } from "~/domain/ids";
import type { WorkflowActor } from "~/server/workflow/actor";
import {
  parseVenueDigitalFields,
  toVenueDigitalInsert,
} from "~/server/workflow/lead/digital-policy/domain";
import type { WorkflowWriteContext } from "~/server/workflow/types";
import { Err, Ok, type Result } from "~/shared/result";

import { runLeadTransaction } from "../write/transition";
import { updateVenue } from "./domain";

export async function updateVenueCommand(
  input: Omit<UpdateVenueInput, "leadId" | "venueId"> & {
    actor: WorkflowActor;
    leadId: WorkflowLeadId;
    venueId: WorkflowVenueId;
  },
  scope: WorkflowWriteContext,
): Promise<Result<{ leadId: string }, DomainError>> {
  return runLeadTransaction(scope, async (ctx) => {
    const state = await ctx.repos.leads.findById(input.leadId);

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

    const venueEvents = updateVenue(state, {
      actor: input.actor,
      venueId: input.venueId,
      tradeName: input.tradeName,
      now: ctx.operationAt,
    });

    if (!venueEvents.ok) {
      return venueEvents;
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

    const appended = await ctx.appendFacts(venueEvents.value);

    if (!appended.ok) {
      return appended;
    }

    return Ok({ leadId: state.id });
  });
}
