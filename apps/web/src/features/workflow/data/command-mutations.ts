import { action } from "@solidjs/router";

import {
  requestRateAcceptance,
  requestRateProposal,
  requestRateProposalEdit,
  requestRateRevision,
} from "~/actions/workflow/commands/rate";
import {
  requestAddLeadToFavorites,
  requestEditCommercialScope,
  requestLeadCreation,
  requestLeadDeletion,
  requestLeadReassignment,
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
  AddVenueAccountsInput,
  CreateLeadInput,
  CreateVenueInput,
  EditCommercialScopeInput,
  EditRateProposalInput,
  ProposeRateInput,
  ReassignLeadInput,
  RecordRepLegalInput,
  RequestRateRevisionInput,
  SaveDigitalPolicyInput,
  UpdateVenueInput,
} from "~/contracts/workflow/inputs";

export const createLeadMutation = action(
  (input: CreateLeadInput) => requestLeadCreation(input),
  "workflow.createLead",
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

export const editCommercialScopeMutation = action(
  (input: EditCommercialScopeInput) => requestEditCommercialScope(input),
  "workflow.editCommercialScope",
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
