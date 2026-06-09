import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { AddVenueAccountsCommandInput } from "~/server/workflow/types";

import { addVenueAccounts } from "../../domain/lead/commands";
import { buildVenueAccounts } from "../../domain/venue/accounts";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";

export async function addVenueAccountsCommand(
  input: AddVenueAccountsCommandInput,
  ports: { executor: DatabaseExecutor },
): Promise<Result<{ leadId: string }, DomainError>> {
  const accounts = buildVenueAccounts(input);
  if (!accounts.ok) return accounts;

  return ports.executor.transaction().execute(async (tx) => {
    const repos = createWorkflowRepos(tx);
    const leads = createLeadStateRepo(tx);
    const uow = createLeadUow(tx);

    const state = await leads.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const venueResult = await repos.leadVenues.findById(input.venueId);
    if (!venueResult.ok) return venueResult;
    if (!venueResult.value || venueResult.value.leadId !== input.leadId) {
      return Err(fail("venue_not_found"));
    }
    if (venueResult.value.solesAccount) {
      return Err(fail("accounts_already_added"));
    }

    const now = Date.now();
    const [totalVenues, venuesWithAccounts] = await Promise.all([
      repos.leadVenues.countByLeadId(input.leadId),
      repos.leadVenues.countWithAccounts(input.leadId),
    ]);
    const shouldTransitionToLive =
      totalVenues > 0 && venuesWithAccounts + 1 === totalVenues;

    const transition = addVenueAccounts(state, {
      actor: input.actor,
      venueId: input.venueId,
      shouldTransitionToLive,
      now,
    });
    if (!transition.ok) return transition;

    await repos.leadVenues.addAccounts(input.venueId, accounts.value, now);

    const committed = await uow.commit({
      next: transition.value.next,
      events: transition.value.events,
      idempotencyKey: randomUUIDv7(),
    });
    if (!committed.ok) return committed;

    return Ok({ leadId: state.id });
  });
}
