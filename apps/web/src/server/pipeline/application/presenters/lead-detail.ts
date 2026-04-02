import type { Role } from "~/lib/auth/access/rbac";

import type { LeadHistoryEntry } from "../../domain/history";
import type { Lead } from "../../domain/lead";
import { canRevealFullTimeline } from "../policies/access";
import {
  resolveAvailableActions,
  type LeadAction,
} from "../policies/action-availability";
import type { LeadCommercialInput, LeadQuotation, LeadSale } from "../ports";
import { presentTimeline, type TimelineItem } from "./timeline";

export type LeadDetailSource = {
  actorUserId: number;
  actorRole: Role;
  lead: Lead;
  commercialInput: LeadCommercialInput | undefined;
  quotations: LeadQuotation[];
  sale: LeadSale | undefined;
  history: LeadHistoryEntry[];
};

export type LeadDetailOutput = {
  lead: LeadDetailSource["lead"];
  commercialInput: LeadDetailSource["commercialInput"];
  quotations: LeadDetailSource["quotations"];
  sale: LeadDetailSource["sale"];
  timeline: TimelineItem[];
  availableActions: LeadAction[];
};

export function presentLeadDetail(source: LeadDetailSource): LeadDetailOutput {
  return {
    lead: source.lead,
    commercialInput: source.commercialInput,
    quotations: source.quotations,
    sale: source.sale,
    timeline: presentTimeline(
      source.history,
      canRevealFullTimeline(source.actorRole),
    ),
    availableActions: resolveAvailableActions({
      actorUserId: source.actorUserId,
      actorRole: source.actorRole,
      executiveId: source.lead.executiveId,
      stage: source.lead.stage,
    }),
  };
}
