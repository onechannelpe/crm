import { action } from "@solidjs/router";

import {
  chooseFulfillmentProduct,
  recordFulfillmentSerial,
  registerFulfillmentPaymentLink,
  registerFulfillmentSale,
  rejectFulfillmentStep,
  uploadFulfillmentDocument,
  uploadFulfillmentPaymentProof,
  validateFulfillmentPayment,
} from "~/actions/workflow/commands/fulfillment";
import { addLeadNote } from "~/actions/workflow/commands/interactions";
import {
  requestRateAcceptance,
  requestRateProposal,
  requestLeadClosure,
  requestRateProposalEdit,
  requestRateRevision,
} from "~/actions/workflow/commands/rate";
import {
  requestAddLeadToFavorites,
  requestEditCommercialScope,
  requestLeadCreation,
  requestLeadDeletion,
  requestLeadReassignment,
  requestLeadReview,
  requestQuotationRestart,
  requestRecordRepLegal,
  requestRemoveLeadFromFavorites,
  requestSaveDigitalPolicy,
} from "~/actions/workflow/commands/records";
import {
  requestVenueAccountsAddition,
  requestVenueCreation,
  requestVenueUpdate,
} from "~/actions/workflow/commands/sales";
import type {
  AcceptRateInput,
  AddLeadNoteInput,
  AddVenueAccountsInput,
  ChooseFulfillmentProductInput,
  CloseLeadInput,
  CreateLeadInput,
  CreateVenueInput,
  EditCommercialScopeInput,
  EditRateProposalInput,
  ProposeRateInput,
  ReassignLeadInput,
  RecordRepLegalInput,
  RecordUnitSerialInput,
  RegisterUnitPaymentLinkInput,
  RegisterUnitSaleInput,
  RejectFulfillmentStepInput,
  RequestRateRevisionInput,
  RestartQuotationInput,
  ReviewLeadInput,
  SaveDigitalPolicyInput,
  UpdateVenueInput,
} from "~/contracts/workflow/inputs";

export const createLeadMutation = action(
  (input: CreateLeadInput) => requestLeadCreation(input),
  "workflow.createLead",
);

export const addNoteMutation = action(
  (input: AddLeadNoteInput) => addLeadNote(input),
  "workflow.addNote",
);

export const proposeRateMutation = action(
  (input: ProposeRateInput) => requestRateProposal(input),
  "workflow.proposeRate",
);

export const editRateProposalMutation = action(
  (input: EditRateProposalInput) => requestRateProposalEdit(input),
  "workflow.editRateProposal",
);

export const acceptRateMutation = action(
  (input: AcceptRateInput) => requestRateAcceptance(input),
  "workflow.acceptRate",
);

export const requestRateRevisionMutation = action(
  (input: RequestRateRevisionInput) => requestRateRevision(input),
  "workflow.requestRateRevision",
);

export const closeLeadMutation = action(
  (input: CloseLeadInput) => requestLeadClosure(input),
  "workflow.closeLead",
);

export const saveDigitalPolicyMutation = action(
  (input: SaveDigitalPolicyInput) => requestSaveDigitalPolicy(input),
  "workflow.saveDigitalPolicy",
);

export const recordRepLegalMutation = action(
  (input: RecordRepLegalInput) => requestRecordRepLegal(input),
  "workflow.recordRepLegal",
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

export const reassignLeadMutation = action(
  (input: ReassignLeadInput) => requestLeadReassignment(input),
  "workflow.reassignLead",
);

export const reviewLeadMutation = action(
  (input: ReviewLeadInput) => requestLeadReview(input),
  "workflow.reviewLead",
);

export const restartQuotationMutation = action(
  (input: RestartQuotationInput) => requestQuotationRestart(input),
  "workflow.restartQuotation",
);

export const editCommercialScopeMutation = action(
  (input: EditCommercialScopeInput) => requestEditCommercialScope(input),
  "workflow.editCommercialScope",
);

export const addLeadToFavoritesMutation = action(
  (input: { leadId: string }) => requestAddLeadToFavorites(input),
  "workflow.addLeadToFavorites",
);

export const removeLeadFromFavoritesMutation = action(
  (input: { leadId: string }) => requestRemoveLeadFromFavorites(input),
  "workflow.removeLeadFromFavorites",
);

export const deleteLeadMutation = action(
  (input: { leadId: string }) => requestLeadDeletion(input),
  "workflow.deleteLead",
);

export const chooseFulfillmentProductMutation = action(
  (input: ChooseFulfillmentProductInput) => chooseFulfillmentProduct(input),
  "workflow.chooseFulfillmentProduct",
);

export const uploadFulfillmentDocumentMutation = action(
  (formData: FormData) => uploadFulfillmentDocument(formData),
  "workflow.uploadFulfillmentDocument",
);

export const recordFulfillmentSerialMutation = action(
  (input: RecordUnitSerialInput) => recordFulfillmentSerial(input),
  "workflow.recordFulfillmentSerial",
);

export const registerFulfillmentPaymentLinkMutation = action(
  (input: RegisterUnitPaymentLinkInput) =>
    registerFulfillmentPaymentLink(input),
  "workflow.registerFulfillmentPaymentLink",
);

export const uploadFulfillmentPaymentProofMutation = action(
  (formData: FormData) => uploadFulfillmentPaymentProof(formData),
  "workflow.uploadFulfillmentPaymentProof",
);

export const validateFulfillmentPaymentMutation = action(
  (input: { leadId: string }) => validateFulfillmentPayment(input),
  "workflow.validateFulfillmentPayment",
);

export const registerFulfillmentSaleMutation = action(
  (input: RegisterUnitSaleInput) => registerFulfillmentSale(input),
  "workflow.registerFulfillmentSale",
);

export const rejectFulfillmentStepMutation = action(
  (input: RejectFulfillmentStepInput) => rejectFulfillmentStep(input),
  "workflow.rejectFulfillmentStep",
);
