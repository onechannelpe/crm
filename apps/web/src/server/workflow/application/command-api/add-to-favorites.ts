import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import type { LeadReadRepository } from "../../ports/lead-read-repository";
import { prepareLeadCommand } from "../command-kernel/prepare-lead-command";
import type { AddLeadToFavoritesInput } from "../contracts/command-inputs";
import type { LeadCommandResult } from "../contracts/command-results";
import type { LeadFavoriteRepository } from "../ports/lead-favorite-repository";
import type { LeadClock } from "../services/lead-clock";

type AddToFavoritesCommandDeps = {
  leadReader: LeadReadRepository;
  leadFavorites: LeadFavoriteRepository;
  clock: LeadClock;
};

export async function addToFavoritesCommand(
  deps: AddToFavoritesCommandDeps,
  input: AddLeadToFavoritesInput,
): Promise<Result<LeadCommandResult, DomainError>> {
  const prepared = await prepareLeadCommand({
    leadReader: deps.leadReader,
    clock: deps.clock,
    actor: input.actor,
    leadId: input.leadId,
    operation: "view_detail",
  });
  if (!prepared.ok) {
    return prepared;
  }

  await deps.leadFavorites.addForUser({
    leadId: input.leadId,
    userId: input.actor.userId,
    createdAt: prepared.value.now,
  });

  return Ok({ leadId: input.leadId });
}
