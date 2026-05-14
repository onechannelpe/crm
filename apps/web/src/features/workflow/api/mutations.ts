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
} from "~/actions/workflow/commands/sales";
import type { LeadIdInput } from "~/contracts/workflow";

export async function requestLeadCreationApi(
  input: Parameters<typeof requestLeadCreation>[0],
) {
  return requestLeadCreation(input);
}

export async function requestSaleApprovalApi(input: LeadIdInput) {
  return requestSaleApproval(input);
}

export async function requestLeadReviewApi(
  input: Parameters<typeof requestLeadReview>[0],
) {
  return requestLeadReview(input);
}

export async function requestSaveCommercialScopeApi(
  input: Parameters<typeof requestSaveCommercialScope>[0],
) {
  return requestSaveCommercialScope(input);
}

export async function requestQuotationApi(
  input: Parameters<typeof requestQuotation>[0],
) {
  return requestQuotation(input);
}

export async function requestSaveDigitalPolicyApi(
  input: Parameters<typeof requestSaveDigitalPolicy>[0],
) {
  return requestSaveDigitalPolicy(input);
}

export async function requestRecordRepLegalApi(
  input: Parameters<typeof requestRecordRepLegal>[0],
) {
  return requestRecordRepLegal(input);
}

export async function requestStartSetupExecutionApi(
  input: Parameters<typeof requestStartSetupExecution>[0],
) {
  return requestStartSetupExecution(input);
}

export async function requestQuotationCreationApi(
  input: Parameters<typeof requestQuotationCreation>[0],
) {
  return requestQuotationCreation(input);
}

export async function requestVenueCreationApi(
  input: Parameters<typeof requestVenueCreation>[0],
) {
  return requestVenueCreation(input);
}

export async function requestVenueAccountsAdditionApi(
  input: Parameters<typeof requestVenueAccountsAddition>[0],
) {
  return requestVenueAccountsAddition(input);
}

export async function requestRateNegotiationApi(
  input: Parameters<typeof requestRateNegotiation>[0],
) {
  return requestRateNegotiation(input);
}

export async function requestLeadReassignmentApi(
  input: Parameters<typeof requestLeadReassignment>[0],
) {
  return requestLeadReassignment(input);
}

export async function requestAddLeadToFavoritesApi(
  input: Parameters<typeof requestAddLeadToFavorites>[0],
) {
  return requestAddLeadToFavorites(input);
}

export async function requestRemoveLeadFromFavoritesApi(
  input: Parameters<typeof requestRemoveLeadFromFavorites>[0],
) {
  return requestRemoveLeadFromFavorites(input);
}
