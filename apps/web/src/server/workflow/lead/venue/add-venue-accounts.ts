import type { AddVenueAccountsInput } from "~/contracts/workflow/inputs";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/actor";

import { addVenueAccounts } from "../../lead/domain/decide";
import { runLeadTransaction } from "../write/transition";
import { buildVenueAccounts } from "./domain";

export async function addVenueAccountsCommand(
  input: AddVenueAccountsInput & {
    actor: WorkflowActor;
  },
  ports: {
    executor: DatabaseExecutor;
    now: number;
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

    return Ok({ leadId: state.id });
  });
}
