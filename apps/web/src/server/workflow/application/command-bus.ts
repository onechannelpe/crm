import { createSearchEnrichmentRepo } from "~/server/client-search/repository";
import { createEnrichmentCommand } from "~/server/client-search/request";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type {
  AddLeadNoteCommandInput,
  AddLeadToFavoritesInput,
  AddVenueAccountsCommandInput,
  ApplyImportedReviewInput,
  ApproveForSaleInput,
  CreateQuotationCommandInput,
  CreateVenueCommandInput,
  LogLeadCallCommandInput,
  ReassignLeadCommandInput,
  RecordRepLegalCommandInput,
  RegisterLeadInput,
  RemoveLeadFromFavoritesInput,
  RequestQuotationInput,
  RequestRateNegotiationCommandInput,
  RequestSunatRefreshInput,
  ReviewLeadCommandInput,
  SaveCommercialScopeCommandInput,
  UpdateSourcingPolicyInput,
} from "~/server/workflow/types";

import { createLeadStateRepo } from "../infrastructure/lead-state-repo";
import { createLeadUow } from "../infrastructure/uow";
import type { WorkflowRepos } from "../infrastructure/workflow-repos";
import { addLeadNoteCommand } from "./commands/add-note";
import { addToFavoritesCommand } from "./commands/add-to-favorites";
import { addVenueAccountsCommand } from "./commands/add-venue-accounts";
import { applyImportedReviewCommand } from "./commands/apply-imported-review";
import { approveForSaleCommand } from "./commands/approve-for-sale";
import { createQuotationCommand } from "./commands/create-quotation";
import { createVenueCommand } from "./commands/create-venue";
import { logLeadCallCommand } from "./commands/log-call";
import { reassignLeadCommand } from "./commands/reassign-lead";
import { recordRepLegalCommand } from "./commands/record-rep-legal";
import { registerLead } from "./commands/register-lead";
import { removeFromFavoritesCommand } from "./commands/remove-from-favorites";
import { requestQuotationCommand } from "./commands/request-quotation";
import { requestRateNegotiationCommand } from "./commands/request-rate-negotiation";
import { requestSunatRefresh } from "./commands/request-sunat-refresh";
import { reviewLeadCommand } from "./commands/review-lead";
import { saveCommercialScopeCommand } from "./commands/save-commercial-scope";
import { updateSourcingPolicy } from "./commands/update-sourcing-policy";

export function createWorkflowCommandBus(
  executor: DatabaseExecutor,
  repos: WorkflowRepos,
) {
  const uow = createLeadUow(executor);
  const leadStates = createLeadStateRepo(executor);

  const enrichmentCommand = createEnrichmentCommand(
    createSearchEnrichmentRepo(executor),
  );
  const enrichmentQueue = {
    async enqueueRucVerification(
      ruc: string,
      requestedByUserId: number,
    ): Promise<void> {
      await enrichmentCommand.enqueueRequest("ruc", ruc, requestedByUserId);
    },
  };

  return {
    registerLead: (input: RegisterLeadInput) =>
      registerLead(
        {
          actorUserId: input.actor.userId,
          actorRole: input.actor.role,
          executiveId: input.executiveId,
          ruc: input.ruc,
        },
        {
          leads: repos.leads,
          leadAssignments: repos.leadAssignments,
          leadHistory: repos.leadHistory,
          leadStates,
          party: repos.party,
          users: repos.users,
          uow,
          enrichmentQueue,
        },
      ),

    reviewLead: (input: ReviewLeadCommandInput) =>
      reviewLeadCommand(input, { leads: leadStates, uow }),

    reassignLead: (input: ReassignLeadCommandInput) =>
      reassignLeadCommand(input, {
        leads: leadStates,
        uow,
        users: repos.users,
      }),

    addLeadNote: (input: AddLeadNoteCommandInput) =>
      addLeadNoteCommand(input, { leads: leadStates, uow }),

    logLeadCall: (input: LogLeadCallCommandInput) =>
      logLeadCallCommand(input, { leads: leadStates, uow }),

    approveForSale: (input: ApproveForSaleInput) =>
      approveForSaleCommand(input, { leads: leadStates, uow }),

    createQuotation: (input: CreateQuotationCommandInput) =>
      createQuotationCommand(input, {
        leads: leadStates,
        uow,
        leadQuotations: repos.leadQuotations,
      }),

    saveCommercialScope: (input: SaveCommercialScopeCommandInput) =>
      saveCommercialScopeCommand(input, {
        leads: leadStates,
        uow,
        leadProfiles: repos.leadProfiles,
        leadVenues: repos.leadVenues,
        party: repos.party,
      }),

    requestQuotation: (input: RequestQuotationInput) =>
      requestQuotationCommand(input, {
        leads: leadStates,
        uow,
        leadProfiles: repos.leadProfiles,
        party: repos.party,
      }),

    recordRepLegal: (input: RecordRepLegalCommandInput) =>
      recordRepLegalCommand(input, {
        leads: leadStates,
        uow,
        party: repos.party,
      }),

    createVenue: (input: CreateVenueCommandInput) =>
      createVenueCommand(input, {
        leads: leadStates,
        uow,
        leadProfiles: repos.leadProfiles,
        leadVenues: repos.leadVenues,
      }),

    addVenueAccounts: (input: AddVenueAccountsCommandInput) =>
      addVenueAccountsCommand(input, {
        leads: leadStates,
        uow,
        leadVenues: repos.leadVenues,
      }),

    requestRateNegotiation: (input: RequestRateNegotiationCommandInput) =>
      requestRateNegotiationCommand(input, {
        leads: leadStates,
        uow,
        negotiationRequests: repos.leadNegotiationRequests,
      }),

    applyImportedReview: (input: ApplyImportedReviewInput) =>
      applyImportedReviewCommand(input, { leads: leadStates, uow }),

    requestSunatRefresh: (input: RequestSunatRefreshInput) =>
      requestSunatRefresh(input, {
        leads: repos.leads,
        enrichmentQueue,
      }),

    addToFavorites: (input: AddLeadToFavoritesInput) =>
      addToFavoritesCommand(input, {
        leads: leadStates,
        leadFavorites: repos.leadFavorites,
      }),

    removeFromFavorites: (input: RemoveLeadFromFavoritesInput) =>
      removeFromFavoritesCommand(input, {
        leads: leadStates,
        leadFavorites: repos.leadFavorites,
      }),

    updateSourcingPolicy: (input: UpdateSourcingPolicyInput) =>
      updateSourcingPolicy(input, { sourcingPolicies: repos.sourcingPolicies }),
  };
}
