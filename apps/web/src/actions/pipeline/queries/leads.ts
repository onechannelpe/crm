"use server";

import { getLeadDetail } from "~/server/pipeline/application/queries/get-lead-detail";
import { listLeads } from "~/server/pipeline/application/queries/list-leads";
import type {
  LeadCommercialInputView,
  LeadDetailLeadView,
  LeadDetailView,
  LeadQuotationView,
  LeadSaleView,
  LeadTimelineItem,
} from "~/server/pipeline/application/queries/views/lead-detail-view";
import type {
  LeadListRowView,
  LeadListView,
} from "~/server/pipeline/application/queries/views/lead-list-view";
import { createPipelineQueryRuntime } from "~/server/pipeline/infrastructure/query-runtime";
import { runAction } from "~/server/shared/action-runtime";

import type {
  LeadAction,
  LeadDetailCommercialInput,
  LeadDetailLead,
  LeadDetailOutput,
  LeadDetailQuotation,
  LeadDetailSale,
  TimelineItem,
} from "../contracts/lead-detail";
import type { LeadListOutput, LeadListRow } from "../contracts/lead-list";

function mapLeadDetailLead(lead: LeadDetailLeadView): LeadDetailLead {
  const output: LeadDetailLead = lead;
  return output;
}

function mapLeadDetailCommercialInput(
  commercialInput: LeadCommercialInputView,
): LeadDetailCommercialInput {
  const output: LeadDetailCommercialInput = commercialInput;
  return output;
}

function mapLeadDetailQuotation(
  quotation: LeadQuotationView,
): LeadDetailQuotation {
  const output: LeadDetailQuotation = quotation;
  return output;
}

function mapLeadDetailSale(sale: LeadSaleView): LeadDetailSale {
  const output: LeadDetailSale = sale;
  return output;
}

function mapTimelineItem(item: LeadTimelineItem): TimelineItem {
  const output: TimelineItem = item;
  return output;
}

function mapLeadAction(action: LeadDetailView["availableActions"][number]) {
  const output: LeadAction = action;
  return output;
}

function mapLeadDetail(detail: LeadDetailView): LeadDetailOutput {
  return {
    lead: mapLeadDetailLead(detail.lead),
    commercialInput: detail.commercialInput
      ? mapLeadDetailCommercialInput(detail.commercialInput)
      : undefined,
    quotations: detail.quotations.map(mapLeadDetailQuotation),
    sale: detail.sale ? mapLeadDetailSale(detail.sale) : undefined,
    timeline: detail.timeline.map(mapTimelineItem),
    availableActions: detail.availableActions.map(mapLeadAction),
  };
}

function mapLeadListRow(row: LeadListRowView): LeadListRow {
  const output: LeadListRow = row;
  return output;
}

function mapLeadList(list: LeadListView): LeadListOutput {
  return {
    rows: list.rows.map(mapLeadListRow),
    totalCount: list.totalCount,
  };
}

export async function queryLeadList(filters: {
  stage?: string;
  status?: string;
  prioridad?: string;
  executiveId?: number;
  limit?: number;
  offset?: number;
}): Promise<LeadListOutput> {
  const result = await runAction({
    actionName: "pipeline.list_leads",
    requireAuth: true,
    input: filters,
    execute: (ctx) =>
      listLeads(createPipelineQueryRuntime().deps.leadList, {
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        filters,
      }),
  });

  return mapLeadList(result);
}

export async function queryLeadDetail(
  leadId: number,
): Promise<LeadDetailOutput> {
  const result = await runAction({
    actionName: "pipeline.get_lead_detail",
    requireAuth: true,
    input: { leadId },
    execute: (ctx) =>
      getLeadDetail(createPipelineQueryRuntime().deps.leadDetail, {
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        leadId,
      }),
  });

  return mapLeadDetail(result);
}
