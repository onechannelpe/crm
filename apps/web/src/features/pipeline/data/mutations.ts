import { action, json } from "@solidjs/router";

import {
  requestLeadCommercialInputCompletion,
  requestLeadCreation,
  requestLeadReassignment,
  requestLeadReview,
} from "~/actions/pipeline/commands/leads";
import { requestSaleApproval } from "~/actions/pipeline/commands/quotations";

import {
  assignableExecutivesQuery,
  leadDetailQuery,
  leadListQuery,
} from "./queries";

type CreateLeadInput = {
  ruc: string;
  executiveId?: number;
};

export const createLeadMutation = action(async (input: CreateLeadInput) => {
  const result = await requestLeadCreation(input);
  return json(result, { revalidate: leadListQuery.key });
}, "pipeline.createLead");

export const approveForSaleMutation = action(
  async (input: { leadId: number }) => {
    await requestSaleApproval(input.leadId);
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "pipeline.approveForSale",
);

export const reviewLeadMutation = action(
  async (input: {
    leadId: number;
    status: string;
    prioridad: string;
    reason: string;
  }) => {
    await requestLeadReview(input);
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "pipeline.reviewLead",
);

export const completeCommercialInputMutation = action(
  async (input: {
    leadId: number;
    proveedorActual: string;
    tasaActual: number;
    gpv: number;
    ticket: number;
    abono: number;
    cantidadPos: number;
  }) => {
    await requestLeadCommercialInputCompletion(input);
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "pipeline.completeCommercialInput",
);

export const reassignLeadMutation = action(
  async (input: { leadId: number; newExecutiveId: number }) => {
    await requestLeadReassignment(input);
    return json(
      {},
      {
        revalidate: [
          leadDetailQuery.keyFor(input.leadId),
          leadListQuery.key,
          assignableExecutivesQuery.keyFor(input.leadId),
        ],
      },
    );
  },
  "pipeline.reassignLead",
);
