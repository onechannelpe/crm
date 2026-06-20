import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { AddVenueAccountsCommandInput } from "~/server/workflow/types";

import { buildVenueAccounts } from "../../domain/venue/accounts";
import { addVenueAccounts } from "../../lead/domain/decide";
import { runLeadTransaction } from "./transition";

export async function addVenueAccountsCommand(
  input: AddVenueAccountsCommandInput,
  ports: { executor: DatabaseExecutor; now: number },
): Promise<Result<{ leadId: string }, DomainError>> {
  const accounts = buildVenueAccounts(input);
  if (!accounts.ok) return accounts;

  return runLeadTransaction(ports, async (ctx) => {
    const state = await ctx.repos.leadStates.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const venueResult = await ctx.repos.leadVenues.findById(input.venueId);
    if (!venueResult.ok) return venueResult;
    if (!venueResult.value || venueResult.value.leadId !== input.leadId) {
      return Err(fail("venue_not_found"));
    }
    if (venueResult.value.solesAccount) {
      return Err(fail("accounts_already_added"));
    }

    const [totalVenues, venuesWithAccounts] = await Promise.all([
      ctx.repos.leadVenues.countByLeadId(input.leadId),
      ctx.repos.leadVenues.countWithAccounts(input.leadId),
    ]);
    const shouldTransitionToLive =
      totalVenues > 0 && venuesWithAccounts + 1 === totalVenues;

    const transition = addVenueAccounts(state, {
      actor: input.actor,
      venueId: input.venueId,
      shouldTransitionToLive,
      now: ctx.now,
    });
    if (!transition.ok) return transition;

    await ctx.repos.leadVenues.addAccounts(
      input.venueId,
      accounts.value,
      ctx.now,
    );

    const committed = await ctx.commit(transition.value);
    if (!committed.ok) return committed;

    return Ok({ leadId: state.id });
  });
}
