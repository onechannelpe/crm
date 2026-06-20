import { randomUUIDv7 } from "bun";

import type { CreateVenueInput } from "~/contracts/workflow/inputs";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/actor";
import {
  parseVenueDigitalFields,
  toVenueDigitalInsert,
} from "~/server/workflow/lead/digital-policy/domain";

import { createVenue } from "../../lead/domain/decide";
import { runLeadTransaction } from "../write/transition";

export async function createVenueCommand(
  input: CreateVenueInput & {
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

    const savedDigitalPolicy = await ctx.repos.digitalPolicies.findByLeadId(
      input.leadId,
    );

    const parsedVenueFields = parseVenueDigitalFields(
      {
        linkScope: savedDigitalPolicy?.linkScope ?? "none",
        onlineScope: savedDigitalPolicy?.onlineScope ?? "none",
      },
      input.digitalConfig,
    );

    if (!parsedVenueFields.ok) {
      return parsedVenueFields;
    }

    const venueId = randomUUIDv7();

    const transition = createVenue(state, {
      actor: input.actor,
      venueId,
      tradeName: input.tradeName,
      now: ctx.now,
    });

    if (!transition.ok) {
      return transition;
    }

    const digital = toVenueDigitalInsert(parsedVenueFields.value);

    await ctx.tx
      .insertInto("workflow_lead_venues")
      .values({
        id: venueId,
        lead_id: input.leadId,
        trade_name: input.tradeName,
        pos_quantity: input.posQuantity,
        link_url: digital.linkUrl,
        online_url: digital.onlineUrl,
        online_collection_mode: digital.onlineCollectionMode,
        address: input.address,
        address_reference: input.addressReference,
        district: input.district,
        province: input.province,
        department: input.department,
        created_at: ctx.now,
        created_by: input.actor.userId,
      })
      .executeTakeFirstOrThrow();

    const committed = await ctx.commit(transition.value);

    if (!committed.ok) {
      return committed;
    }

    return Ok({ leadId: state.id });
  });
}
