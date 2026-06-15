import type { Role } from "~/lib/auth/access/rbac";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { LeadDetailView } from "~/server/workflow/types";

import {
  authorizeLeadAction,
  canRevealFullTimeline,
  resolveAvailableActions,
} from "../../domain/lead/policy";
import { isReservationActive } from "../../domain/lead/reservation";
import { presentLeadDetail } from "../presenters/lead-detail";
import {
  loadLeadDetailSections,
  type LeadDetailQueryDeps,
} from "./load-lead-detail-sections";

export async function getLeadDetail(
  deps: LeadDetailQueryDeps,
  input: {
    actorUserId: number;
    actorRole: Role;
    leadId: string;
  },
): Promise<Result<LeadDetailView, DomainError>> {
  const loaded = await loadLeadDetailSections(deps, {
    leadId: input.leadId,
    actorUserId: input.actorUserId,
  });
  if (!loaded.ok) {
    return loaded;
  }
  const { lead } = loaded.value;

  const canAccess = authorizeLeadAction(
    "view",
    { userId: input.actorUserId, role: input.actorRole },
    lead,
  );
  if (!canAccess.ok) return canAccess;

  const userMap = new Map(loaded.value.userRows.map((u) => [u.id, u.fullName]));
  const executiveName = userMap.get(lead.executiveId) ?? "Desconocido";
  const createdByName = userMap.get(lead.createdBy) ?? "Desconocido";
  const updatedByName = lead.updatedBy
    ? (userMap.get(lead.updatedBy) ?? null)
    : null;

  const latestProposal = loaded.value.rateProposals.at(-1);
  const now = Date.now();
  const canRevealTimeline = canRevealFullTimeline(input.actorRole);
  const availableActions = resolveAvailableActions(
    { userId: input.actorUserId, role: input.actorRole },
    lead,
    {
      hasActivePendingProposal:
        latestProposal?.outcome === "pending" && isReservationActive(lead, now),
      rateRevisionCount: loaded.value.rateRevisionRows.length,
    },
  );

  return Ok(
    presentLeadDetail({
      lead,
      isFavorite: loaded.value.isFavorite,
      executiveName,
      createdByName,
      updatedByName,
      profile: loaded.value.profile,
      rateProposals: loaded.value.rateProposals,
      venues: loaded.value.venues,
      rateRevisions: loaded.value.rateRevisions,
      history: loaded.value.history,
      canRevealFullTimeline: canRevealTimeline,
      availableActions,
      sourceStatus: loaded.value.sourceStatus,
      organization: loaded.value.organization,
      legalRepresentative: loaded.value.legalRepresentative,
    }),
  );
}
