import type { Role } from "~/lib/auth/access/rbac";

import { parseHistoryEntry } from "../../domain/history";
import type { createPipelineQueryDeps } from "../../infrastructure/deps";
import { canRevealFullTimeline } from "../policies/access";
import {
  resolveAvailableActions,
  type LeadAction,
} from "../policies/action-availability";
import { presentTimeline, type TimelineItem } from "./timeline";

type QueryDeps = ReturnType<typeof createPipelineQueryDeps>;

export type LeadDetailSource = {
  actorRole: Role;
  lead: NonNullable<Awaited<ReturnType<QueryDeps["leads"]["findById"]>>>;
  commercialInput: Awaited<
    ReturnType<QueryDeps["leadCommercialInputs"]["findByLeadId"]>
  >;
  quotations: Awaited<ReturnType<QueryDeps["leadQuotations"]["listByLeadId"]>>;
  sale: Awaited<ReturnType<QueryDeps["leadSales"]["findByLeadId"]>>;
  history: Awaited<ReturnType<QueryDeps["leadHistory"]["listByLeadId"]>>;
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
      source.history.map((entry) => parseHistoryEntry(entry)),
      canRevealFullTimeline(source.actorRole),
    ),
    availableActions: resolveAvailableActions({
      actorRole: source.actorRole,
      stage: source.lead.stage,
    }),
  };
}
