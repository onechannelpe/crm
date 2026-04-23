import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import type { LeadReadRepository } from "../../ports/lead-read-repository";
import { prepareLeadCommand } from "../command-kernel/prepare-lead-command";
import type { RemoveLeadFromFavoritesInput } from "../contracts/command-inputs";
import type { LeadCommandResult } from "../contracts/command-results";
import type { LeadFavoriteRepository } from "../ports/lead-favorite-repository";
import type { LeadClock } from "../services/lead-clock";

type RemoveFromFavoritesCommandDeps = {
  leadReader: LeadReadRepository;
  leadFavorites: LeadFavoriteRepository;
  clock: LeadClock;
};

export async function removeFromFavoritesCommand(
  deps: RemoveFromFavoritesCommandDeps,
  input: RemoveLeadFromFavoritesInput,
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

  await deps.leadFavorites.removeForUser({
    leadId: input.leadId,
    userId: input.actor.userId,
  });

  return Ok({ leadId: input.leadId });
}
