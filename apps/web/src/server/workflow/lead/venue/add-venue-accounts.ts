import type { AddVenueAccountsInput } from "~/contracts/workflow/inputs";
import { fail, type DomainError } from "~/domain/errors";
import type { WorkflowLeadId, WorkflowVenueId } from "~/domain/ids";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type { WorkflowActor } from "~/server/workflow/actor";
import { Err, Ok, type Result } from "~/shared/result";

import { addVenueAccounts } from "../../lead/domain/decide";
import { createHistoryEvent } from "../../lead/domain/history";
import { INITIAL_FULFILLMENT_STEP } from "../fulfillment/steps";
import { runLeadTransaction } from "../write/transition";
import { buildVenueAccounts } from "./domain";

export async function addVenueAccountsCommand(
  input: Omit<AddVenueAccountsInput, "leadId" | "venueId"> & {
    actor: WorkflowActor;
    leadId: WorkflowLeadId;
    venueId: WorkflowVenueId;
  },
  ports: {
    executor: DatabaseExecutor;
    now: Date;
  },
): Promise<Result<{ leadId: string }, DomainError>> {
  const parsedAccounts = buildVenueAccounts(input);

  if (!parsedAccounts.ok) {
    return parsedAccounts;
  }

  return runLeadTransaction(ports, async (ctx) => {
    const state = await ctx.repos.leads.findById(input.leadId);

    if (!state) {
      return Err(fail("lead_not_found"));
    }

    const venueLookup = await ctx.repos.leadVenues.findById(input.venueId);

    if (!venueLookup.ok) {
      return venueLookup;
    }

    const venue = venueLookup.value;

    if (!venue || venue.leadId !== input.leadId) {
      return Err(fail("venue_not_found"));
    }

    if (venue.solesAccount) {
      return Err(fail("accounts_already_added"));
    }

    const [totalVenues, fundedVenues] = await Promise.all([
      ctx.repos.leadVenues.countByLeadId(input.leadId),
      ctx.repos.leadVenues.countWithAccounts(input.leadId),
    ]);

    const transition = addVenueAccounts(state, {
      actor: input.actor,
      venueId: input.venueId,
      totalVenues,
      fundedVenues,
      now: ctx.now,
    });

    if (!transition.ok) {
      return transition;
    }

    await ctx.repos.leadVenues.addAccounts(
      input.venueId,
      parsedAccounts.value,
      ctx.now,
    );

    const committed = await ctx.commitTransition(transition.value);

    if (!committed.ok) {
      return committed;
    }

    if (transition.value.next.stage === "FULFILLMENT") {
      const orderId = await ctx.repos.fulfillment.createOrder({
        leadId: state.id,
        createdBy: input.actor.userId,
        currentStep: INITIAL_FULFILLMENT_STEP,
        now: ctx.now,
      });

      const started = await ctx.appendFacts([
        createHistoryEvent({
          leadId: state.id,
          eventType: "fulfillment_started",
          actorUserId: input.actor.userId,
          payload: { orderId, unitCount: 0 },
          occurredAt: ctx.now,
        }),
      ]);
      if (!started.ok) return started;
    }

    return Ok({ leadId: state.id });
  });
}
