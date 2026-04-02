import type { Role } from "~/lib/auth/access/rbac";

import { canRevealFullTimeline } from "../policies/access";
import {
  resolveAvailableActions,
  type LeadAction,
} from "../policies/action-availability";
import type { PipelineQueryDeps } from "../ports";
import { presentTimeline, type TimelineItem } from "./timeline";

export type LeadDetailSource = {
  actorUserId: number;
  actorRole: Role;
  lead: NonNullable<
    Awaited<ReturnType<PipelineQueryDeps["leads"]["findById"]>>
  >;
  commercialInput: Awaited<
    ReturnType<PipelineQueryDeps["leadCommercialInputs"]["findByLeadId"]>
  >;
  quotations: Awaited<
    ReturnType<PipelineQueryDeps["leadQuotations"]["listByLeadId"]>
  >;
  sale: Awaited<ReturnType<PipelineQueryDeps["leadSales"]["findByLeadId"]>>;
  history: Awaited<
    ReturnType<PipelineQueryDeps["leadHistory"]["listByLeadId"]>
  >;
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
