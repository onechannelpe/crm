import type { Role } from "~/lib/auth/access/rbac";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { LeadDetailView } from "~/server/workflow/types";

import { canRevealFullTimeline, requireLeadAccess } from "../policies/access";
import { resolveAvailableActions } from "../policies/action-availability";
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

  const canAccessLead = requireLeadAccess({
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    executiveId: lead.executiveId,
  });
  if (!canAccessLead.ok) {
    return canAccessLead;
  }

  const userMap = new Map(loaded.value.userRows.map((u) => [u.id, u.fullName]));
  const executiveName = userMap.get(lead.executiveId) ?? "Desconocido";
  const createdByName = userMap.get(lead.createdBy) ?? "Desconocido";
  const updatedByName = lead.updatedBy
    ? (userMap.get(lead.updatedBy) ?? null)
    : null;

  const canRevealTimeline = canRevealFullTimeline(input.actorRole);
  const availableActions = resolveAvailableActions({
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    lead,
    negotiationRequestCount: loaded.value.negotiationRequestRows.length,
  });

  return Ok(
    presentLeadDetail({
      lead,
      isFavorite: loaded.value.isFavorite,
      executiveName,
      createdByName,
      updatedByName,
      profile: loaded.value.profile,
      quotations: loaded.value.quotations,
      venues: loaded.value.venues,
      negotiationRequests: loaded.value.negotiationRequests,
      history: loaded.value.history,
      canRevealFullTimeline: canRevealTimeline,
      availableActions,
      sourceStatus: loaded.value.sourceStatus,
      organization: loaded.value.organization,
      legalRepresentative: loaded.value.legalRepresentative,
    }),
  );
}
