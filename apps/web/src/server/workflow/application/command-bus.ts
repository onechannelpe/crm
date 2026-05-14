import { addLeadNoteCommand } from "~/server/workflow/application/commands/add-note";
import { addToFavoritesCommand } from "~/server/workflow/application/commands/add-to-favorites";
import { addVenueAccountsCommand } from "~/server/workflow/application/commands/add-venue-accounts";
import { applyImportedReviewCommand } from "~/server/workflow/application/commands/apply-imported-review";
import { approveForSaleCommand } from "~/server/workflow/application/commands/approve-for-sale";
import { createQuotationCommand } from "~/server/workflow/application/commands/create-quotation";
import { createVenueCommand } from "~/server/workflow/application/commands/create-venue";
import { logLeadCallCommand } from "~/server/workflow/application/commands/log-call";
import { reassignLeadCommand } from "~/server/workflow/application/commands/reassign-lead";
import { recordRepLegalCommand } from "~/server/workflow/application/commands/record-rep-legal";
import { registerLead } from "~/server/workflow/application/commands/register-lead";
import { removeFromFavoritesCommand } from "~/server/workflow/application/commands/remove-from-favorites";
import { requestQuotationCommand } from "~/server/workflow/application/commands/request-quotation";
import { requestRateNegotiationCommand } from "~/server/workflow/application/commands/request-rate-negotiation";
import { requestSunatRefresh } from "~/server/workflow/application/commands/request-sunat-refresh";
import { reviewLeadCommand } from "~/server/workflow/application/commands/review-lead";
import { saveCommercialScopeCommand } from "~/server/workflow/application/commands/save-commercial-scope";
import { updateSourcingPolicy } from "~/server/workflow/application/settings/update-sourcing-policy";
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

import type { WorkflowCommandDeps } from "./command-deps";

export function createWorkflowCommandBus(deps: WorkflowCommandDeps) {
  return {
    registerLead: (input: RegisterLeadInput) =>
      registerLead({
        actorUserId: input.actor.userId,
        actorRole: input.actor.role,
        executiveId: input.executiveId,
        ruc: input.ruc,
        deps: deps.registerLead,
        mutationUow: deps.mutationUow,
        auditService: deps.auditService,
        engineGateway: deps.engineGateway,
        leadEnrichmentQueue: deps.leadEnrichmentQueue,
      }),
    addToFavorites: (input: AddLeadToFavoritesInput) =>
      addToFavoritesCommand(
        {
          leadReader: deps.repos.leads,
          leadFavorites: deps.repos.leadFavorites,
          clock: deps.clock,
        },
        input,
      ),
    removeFromFavorites: (input: RemoveLeadFromFavoritesInput) =>
      removeFromFavoritesCommand(
        {
          leadReader: deps.repos.leads,
          leadFavorites: deps.repos.leadFavorites,
          clock: deps.clock,
        },
        input,
      ),
    reassignLead: (input: ReassignLeadCommandInput) =>
      reassignLeadCommand(
        {
          leadReader: deps.repos.leads,
          mutationUow: deps.mutationUow,
          users: deps.repos.users,
          clock: deps.clock,
        },
        input,
      ),
    reviewLead: (input: ReviewLeadCommandInput) =>
      reviewLeadCommand(
        {
          leadReader: deps.repos.leads,
          mutationUow: deps.mutationUow,
          clock: deps.clock,
        },
        input,
      ),
    addLeadNote: (input: AddLeadNoteCommandInput) =>
      addLeadNoteCommand(
        {
          leadReader: deps.repos.leads,
          mutationUow: deps.mutationUow,
          clock: deps.clock,
        },
        input,
      ),
    logLeadCall: (input: LogLeadCallCommandInput) =>
      logLeadCallCommand(
        {
          leadReader: deps.repos.leads,
          mutationUow: deps.mutationUow,
          clock: deps.clock,
        },
        input,
      ),
    applyImportedReview: (input: ApplyImportedReviewInput) =>
      applyImportedReviewCommand(
        {
          leadReader: deps.repos.leads,
          mutationUow: deps.mutationUow,
          clock: deps.clock,
        },
        input,
      ),
    approveForSale: (input: ApproveForSaleInput) =>
      approveForSaleCommand(
        {
          leadReader: deps.repos.leads,
          mutationUow: deps.mutationUow,
          clock: deps.clock,
        },
        input,
      ),
    createQuotation: (input: CreateQuotationCommandInput) =>
      createQuotationCommand(
        {
          leadReader: deps.repos.leads,
          mutationUow: deps.mutationUow,
          leadQuotations: deps.repos.leadQuotations,
          clock: deps.clock,
        },
        input,
      ),
    saveCommercialScope: (input: SaveCommercialScopeCommandInput) =>
      saveCommercialScopeCommand(
        {
          leadReader: deps.repos.leads,
          mutationUow: deps.mutationUow,
          leadProfiles: deps.repos.leadProfiles,
          leadVenues: deps.repos.leadVenues,
          party: deps.repos.party,
          clock: deps.clock,
        },
        input,
      ),
    requestQuotation: (input: RequestQuotationInput) =>
      requestQuotationCommand(
        {
          leadReader: deps.repos.leads,
          mutationUow: deps.mutationUow,
          leadProfiles: deps.repos.leadProfiles,
          party: deps.repos.party,
          clock: deps.clock,
        },
        input,
      ),
    recordRepLegal: (input: RecordRepLegalCommandInput) =>
      recordRepLegalCommand(
        {
          leadReader: deps.repos.leads,
          mutationUow: deps.mutationUow,
          party: deps.repos.party,
          clock: deps.clock,
        },
        input,
      ),
    createVenue: (input: CreateVenueCommandInput) =>
      createVenueCommand(
        {
          leadReader: deps.repos.leads,
          mutationUow: deps.mutationUow,
          leadProfiles: deps.repos.leadProfiles,
          leadVenues: deps.repos.leadVenues,
          clock: deps.clock,
        },
        input,
      ),
    addVenueAccounts: (input: AddVenueAccountsCommandInput) =>
      addVenueAccountsCommand(
        {
          leadReader: deps.repos.leads,
          mutationUow: deps.mutationUow,
          leadVenues: deps.repos.leadVenues,
          clock: deps.clock,
        },
        input,
      ),
    requestRateNegotiation: (input: RequestRateNegotiationCommandInput) =>
      requestRateNegotiationCommand(
        {
          leadReader: deps.repos.leads,
          mutationUow: deps.mutationUow,
          negotiationRequests: deps.repos.leadNegotiationRequests,
          clock: deps.clock,
        },
        input,
      ),
    requestSunatRefresh: (input: RequestSunatRefreshInput) =>
      requestSunatRefresh({
        actor: input.actor,
        leadId: input.leadId,
        leadRepo: deps.repos.leads,
        enrichmentQueue: deps.leadEnrichmentQueue,
        auditService: deps.auditService,
      }),
    updateSourcingPolicy: (input: UpdateSourcingPolicyInput) =>
      updateSourcingPolicy(
        { sourcingPolicies: deps.repos.sourcingPolicies },
        input,
      ),
  };
}
