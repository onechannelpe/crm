import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/types";

import { leadNotFound } from "../../domain/lead/lead-errors";
import { authorizeLeadAction } from "../../domain/lead/policy";
import type { LeadStateRepository } from "../../infrastructure/lead-state-repo";
import type { LeadFavoriteRepository } from "../ports/lead";

type Ports = {
  leads: LeadStateRepository;
  leadFavorites: LeadFavoriteRepository;
};

export async function addToFavoritesCommand(
  input: {
    actor: WorkflowActor;
    leadId: string;
  },
  ports: Ports,
): Promise<Result<{ leadId: string }, DomainError>> {
  const state = await ports.leads.findById(input.leadId);
  if (!state) return leadNotFound();

  const authz = authorizeLeadAction("view", input.actor, state);
  if (!authz.ok) return authz;

  await ports.leadFavorites.addForUser({
    leadId: input.leadId,
    userId: input.actor.userId,
    createdAt: Date.now(),
  });

  return Ok({ leadId: input.leadId });
}
