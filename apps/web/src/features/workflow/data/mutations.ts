import { action, json } from "@solidjs/router";

import { requestRateNegotiation } from "~/actions/workflow/commands/negotiation";
import { requestSaleApproval } from "~/actions/workflow/commands/quotations";
import { requestQuotationCreation } from "~/actions/workflow/commands/quotations";
import {
  requestAddLeadToFavorites,
  requestLeadCreation,
  requestLeadReassignment,
  requestLeadReview,
  requestQuotation,
  requestRecordRepLegal,
  requestRemoveLeadFromFavorites,
  requestSaveCommercialScope,
  requestSaveDigitalPolicy,
  requestStartSetupExecution,
} from "~/actions/workflow/commands/records";
import {
  requestVenueAccountsAddition,
  requestVenueCreation,
} from "~/actions/workflow/commands/sales";
import type {
  AddVenueAccountsInput,
  CreateLeadInput,
  CreateQuotationInput,
  CreateVenueInput,
  LeadReviewInput,
  ReassignLeadInput,
  RecordRepLegalInput,
  RequestQuotationInput,
  RequestRateNegotiationInput,
  SaveCommercialScopeInput,
  SaveDigitalPolicyInput,
} from "~/contracts/workflow/inputs";

import { leadDetailQuery, leadListQuery } from "./queries";

export const createLeadMutation = action(async (input: CreateLeadInput) => {
  const result = await requestLeadCreation(input);
  return json(result, { revalidate: leadListQuery.key });
}, "workflow.createLead");

export const approveForSaleMutation = action(
  async (input: { leadId: string }) => {
    await requestSaleApproval({ leadId: input.leadId });
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "workflow.approveForSale",
);

export const reviewLeadMutation = action(async (input: LeadReviewInput) => {
  await requestLeadReview(input);
  return json(
    {},
    { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
  );
}, "workflow.reviewLead");

export const saveCommercialScopeMutation = action(
  async (input: SaveCommercialScopeInput) => {
    await requestSaveCommercialScope(input);
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "workflow.saveCommercialScope",
);

export const requestQuotationMutation = action(
  async (input: RequestQuotationInput) => {
    await requestQuotation(input);
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "workflow.requestQuotation",
);

export const saveDigitalPolicyMutation = action(
  async (input: SaveDigitalPolicyInput) => {
    await requestSaveDigitalPolicy(input);
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "workflow.saveDigitalPolicy",
);

export const startSetupExecutionMutation = action(
  async (input: { leadId: string }) => {
    await requestStartSetupExecution(input);
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "workflow.startSetupExecution",
);

export const recordRepLegalMutation = action(
  async (input: RecordRepLegalInput) => {
    await requestRecordRepLegal(input);
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "workflow.recordRepLegal",
);

export const createQuotationMutation = action(
  async (input: CreateQuotationInput) => {
    await requestQuotationCreation(input);
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "workflow.createQuotation",
);

export const createVenueMutation = action(async (input: CreateVenueInput) => {
  await requestVenueCreation(input);
  return json(
    {},
    { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
  );
}, "workflow.createVenue");

export const addVenueAccountsMutation = action(
  async (input: AddVenueAccountsInput) => {
    await requestVenueAccountsAddition(input);
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "workflow.addVenueAccounts",
);

export const requestRateNegotiationMutation = action(
  async (input: RequestRateNegotiationInput) => {
    const result = await requestRateNegotiation(input);
    if (!result.ok) {
      throw result.error;
    }
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "workflow.requestRateNegotiation",
);

export const reassignLeadMutation = action(async (input: ReassignLeadInput) => {
  await requestLeadReassignment(input);
  return json(
    {},
    {
      revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key],
    },
  );
}, "workflow.reassignLead");

export const addLeadToFavoritesMutation = action(
  async (input: { leadId: string }) => {
    await requestAddLeadToFavorites(input);
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "workflow.addLeadToFavorites",
);

export const removeLeadFromFavoritesMutation = action(
  async (input: { leadId: string }) => {
    await requestRemoveLeadFromFavorites(input);
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "workflow.removeLeadFromFavorites",
);
