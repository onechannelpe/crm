import { action } from "@solidjs/router";

import { requestRateNegotiation } from "~/actions/workflow/commands/negotiation";
import type { RequestRateNegotiationInput } from "~/actions/workflow/commands/negotiation";
import { requestSaleApproval } from "~/actions/workflow/commands/quotations";
import { requestQuotationCreation } from "~/actions/workflow/commands/quotations";
import type { CreateQuotationInput } from "~/actions/workflow/commands/quotations";
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
import type {
  CreateLeadInput,
  LeadReviewInput,
  ReassignLeadInput,
  RecordRepLegalInput,
  RequestQuotationInput,
  SaveCommercialScopeInput,
  SaveDigitalPolicyInput,
} from "~/actions/workflow/commands/records";
import {
  requestVenueAccountsAddition,
  requestVenueCreation,
  requestVenueUpdate,
} from "~/actions/workflow/commands/sales";
import type {
  AddVenueAccountsInput,
  CreateVenueInput,
  UpdateVenueInput,
} from "~/actions/workflow/commands/sales";

export const createLeadMutation = action(async (input: CreateLeadInput) => {
  return requestLeadCreation(input);
}, "workflow.createLead");

export const approveForSaleMutation = action(
  async (input: { leadId: string }) =>
    requestSaleApproval({ leadId: input.leadId }),
  "workflow.approveForSale",
);

export const reviewLeadMutation = action(async (input: LeadReviewInput) => {
  return requestLeadReview(input);
}, "workflow.reviewLead");

export const saveCommercialScopeMutation = action(
  async (input: SaveCommercialScopeInput) => requestSaveCommercialScope(input),
  "workflow.saveCommercialScope",
);

export const requestQuotationMutation = action(
  async (input: RequestQuotationInput) => requestQuotation(input),
  "workflow.requestQuotation",
);

export const saveDigitalPolicyMutation = action(
  async (input: SaveDigitalPolicyInput) => requestSaveDigitalPolicy(input),
  "workflow.saveDigitalPolicy",
);

export const startSetupExecutionMutation = action(
  async (input: { leadId: string }) => requestStartSetupExecution(input),
  "workflow.startSetupExecution",
);

export const recordRepLegalMutation = action(
  async (input: RecordRepLegalInput) => requestRecordRepLegal(input),
  "workflow.recordRepLegal",
);

export const createQuotationMutation = action(
  async (input: CreateQuotationInput) => requestQuotationCreation(input),
  "workflow.createQuotation",
);

export const createVenueMutation = action(
  async (input: CreateVenueInput) => requestVenueCreation(input),
  "workflow.createVenue",
);

export const updateVenueMutation = action(
  async (input: UpdateVenueInput) => requestVenueUpdate(input),
  "workflow.updateVenue",
);

export const addVenueAccountsMutation = action(
  async (input: AddVenueAccountsInput) => requestVenueAccountsAddition(input),
  "workflow.addVenueAccounts",
);

export const requestRateNegotiationMutation = action(
  async (input: RequestRateNegotiationInput) => requestRateNegotiation(input),
  "workflow.requestRateNegotiation",
);

export const reassignLeadMutation = action(
  async (input: ReassignLeadInput) => requestLeadReassignment(input),
  "workflow.reassignLead",
);

export const addLeadToFavoritesMutation = action(
  async (input: { leadId: string }) => requestAddLeadToFavorites(input),
  "workflow.addLeadToFavorites",
);

export const removeLeadFromFavoritesMutation = action(
  async (input: { leadId: string }) => requestRemoveLeadFromFavorites(input),
  "workflow.removeLeadFromFavorites",
);
