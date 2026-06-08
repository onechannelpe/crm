import { action } from "@solidjs/router";

import { requestRateNegotiation } from "~/actions/workflow/commands/negotiation";
import {
  requestQuotationCreation,
  requestSaleApproval,
} from "~/actions/workflow/commands/quotations";
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
  requestVenueUpdate,
} from "~/actions/workflow/commands/sales";
import type {
  AddVenueAccountsInput,
  CreateLeadInput,
  CreateQuotationInput,
  CreateVenueInput,
  ReassignLeadInput,
  RecordRepLegalInput,
  RequestQuotationInput,
  RequestRateNegotiationInput,
  ReviewLeadInput,
  SaveCommercialScopeInput,
  SaveDigitalPolicyInput,
  UpdateVenueInput,
} from "~/contracts/workflow/inputs";

export const createLeadMutation = action(
  (input: CreateLeadInput) => requestLeadCreation(input),
  "workflow.createLead",
);

export const approveForSaleMutation = action(
  (input: { leadId: string }) => requestSaleApproval(input),
  "workflow.approveForSale",
);

export const reviewLeadMutation = action(
  (input: ReviewLeadInput) => requestLeadReview(input),
  "workflow.reviewLead",
);

export const saveCommercialScopeMutation = action(
  (input: SaveCommercialScopeInput) => requestSaveCommercialScope(input),
  "workflow.saveCommercialScope",
);

export const requestQuotationMutation = action(
  (input: RequestQuotationInput) => requestQuotation(input),
  "workflow.requestQuotation",
);

export const saveDigitalPolicyMutation = action(
  (input: SaveDigitalPolicyInput) => requestSaveDigitalPolicy(input),
  "workflow.saveDigitalPolicy",
);

export const startSetupExecutionMutation = action(
  (input: { leadId: string }) => requestStartSetupExecution(input),
  "workflow.startSetupExecution",
);

export const recordRepLegalMutation = action(
  (input: RecordRepLegalInput) => requestRecordRepLegal(input),
  "workflow.recordRepLegal",
);

export const createQuotationMutation = action(
  (input: CreateQuotationInput) => requestQuotationCreation(input),
  "workflow.createQuotation",
);

export const createVenueMutation = action(
  (input: CreateVenueInput) => requestVenueCreation(input),
  "workflow.createVenue",
);

export const updateVenueMutation = action(
  (input: UpdateVenueInput) => requestVenueUpdate(input),
  "workflow.updateVenue",
);

export const addVenueAccountsMutation = action(
  (input: AddVenueAccountsInput) => requestVenueAccountsAddition(input),
  "workflow.addVenueAccounts",
);

export const requestRateNegotiationMutation = action(
  (input: RequestRateNegotiationInput) => requestRateNegotiation(input),
  "workflow.requestRateNegotiation",
);

export const reassignLeadMutation = action(
  (input: ReassignLeadInput) => requestLeadReassignment(input),
  "workflow.reassignLead",
);

export const addLeadToFavoritesMutation = action(
  (input: { leadId: string }) => requestAddLeadToFavorites(input),
  "workflow.addLeadToFavorites",
);

export const removeLeadFromFavoritesMutation = action(
  (input: { leadId: string }) => requestRemoveLeadFromFavorites(input),
  "workflow.removeLeadFromFavorites",
);
