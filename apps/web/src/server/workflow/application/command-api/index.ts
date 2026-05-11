import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

import type { LeadReadRepository } from "../../ports/lead-read-repository";
import type { LeadUserScopeRepository } from "../../ports/lead-user-scope-repository";
import type {
  AddLeadNoteInput,
  AddLeadToFavoritesInput,
  AddVenueAccountsInput,
  ApplyImportedReviewInput,
  ApproveForSaleInput,
  CompleteScopingInput,
  CreateQuotationInput,
  CreateVenueInput,
  LogLeadCallInput,
  ReassignLeadInput,
  RegisterLeadInput,
  RemoveLeadFromFavoritesInput,
  RequestRateNegotiationInput,
  ReviewLeadInput,
} from "../contracts/command-inputs";
import type {
  LeadCommandResult,
  LeadInteractionResult,
  LeadQuotationResult,
} from "../contracts/command-results";
import type { RegisterLeadDeps } from "../deps/register-lead";
import type { WorkflowAuditService } from "../ports/audit-service";
import type { WorkflowEngineGateway } from "../ports/engine-gateway";
import type { LeadEnrichmentQueue } from "../ports/enrichment-queue";
import type { LeadFavoriteRepository } from "../ports/lead-favorite-repository";
import type { LeadMutationUow } from "../ports/lead-mutation-uow";
import type { LeadProfileRepository } from "../ports/lead-profile-repository";
import type { NegotiationRequestRepository } from "../ports/negotiation-request-repository";
import type { PartyRepository } from "../ports/party-repository";
import type { LeadQuotationRepository } from "../ports/quotation-repository";
import type { LeadVenueRepository } from "../ports/sale-repository";
import type { LeadClock } from "../services/lead-clock";
import { addLeadNoteCommand } from "./add-note";
import { addToFavoritesCommand } from "./add-to-favorites";
import { addVenueAccountsCommand } from "./add-venue-accounts";
import { applyImportedReviewCommand } from "./apply-imported-review";
import { approveForSaleCommand } from "./approve-for-sale";
import { completeScopingCommand } from "./complete-scoping";
import { createQuotationCommand } from "./create-quotation";
import { createVenueCommand } from "./create-venue";
import { logLeadCallCommand } from "./log-call";
import { reassignLeadCommand } from "./reassign-lead";
import { registerLeadCommand } from "./register-lead";
import { removeFromFavoritesCommand } from "./remove-from-favorites";
import { requestRateNegotiationCommand } from "./request-rate-negotiation";
import { reviewLeadCommand } from "./review-lead";

export type WorkflowCommandApiDeps = {
  leadReader: LeadReadRepository;
  leadFavorites: LeadFavoriteRepository;
  mutationUow: LeadMutationUow;
  users: LeadUserScopeRepository;
  clock: LeadClock;
  registerLead: RegisterLeadDeps;
  auditService: WorkflowAuditService;
  engineGateway: WorkflowEngineGateway;
  leadEnrichmentQueue: LeadEnrichmentQueue;
  leadQuotations: LeadQuotationRepository;
  leadProfiles: LeadProfileRepository;
  party: PartyRepository;
  leadVenues: LeadVenueRepository;
  negotiationRequests: NegotiationRequestRepository;
};

export type WorkflowCommandApi = {
  registerLead(
    input: RegisterLeadInput,
  ): Promise<Result<LeadCommandResult, DomainError>>;
  addToFavorites(
    input: AddLeadToFavoritesInput,
  ): Promise<Result<LeadCommandResult, DomainError>>;
  removeFromFavorites(
    input: RemoveLeadFromFavoritesInput,
  ): Promise<Result<LeadCommandResult, DomainError>>;
  reassignLead(
    input: ReassignLeadInput,
  ): Promise<Result<LeadCommandResult, DomainError>>;
  reviewLead(
    input: ReviewLeadInput,
  ): Promise<Result<LeadCommandResult, DomainError>>;
  addLeadNote(
    input: AddLeadNoteInput,
  ): Promise<Result<LeadInteractionResult, DomainError>>;
  logLeadCall(
    input: LogLeadCallInput,
  ): Promise<Result<LeadInteractionResult, DomainError>>;
  applyImportedReview(
    input: ApplyImportedReviewInput,
  ): Promise<Result<{ applied: boolean; leadId: string }, DomainError>>;
  approveForSale(
    input: ApproveForSaleInput,
  ): Promise<Result<LeadCommandResult, DomainError>>;
  createQuotation(
    input: CreateQuotationInput,
  ): Promise<Result<LeadQuotationResult, DomainError>>;
  completeScoping(
    input: CompleteScopingInput,
  ): Promise<Result<LeadCommandResult, DomainError>>;
  createVenue(
    input: CreateVenueInput,
  ): Promise<Result<LeadCommandResult, DomainError>>;
  addVenueAccounts(
    input: AddVenueAccountsInput,
  ): Promise<Result<LeadCommandResult, DomainError>>;
  requestRateNegotiation(
    input: RequestRateNegotiationInput,
  ): Promise<Result<LeadCommandResult, DomainError>>;
};

export function createWorkflowCommandApi(
  deps: WorkflowCommandApiDeps,
): WorkflowCommandApi {
  return {
    registerLead: (input) => registerLeadCommand(deps, input),
    addToFavorites: (input) =>
      addToFavoritesCommand(
        {
          leadReader: deps.leadReader,
          leadFavorites: deps.leadFavorites,
          clock: deps.clock,
        },
        input,
      ),
    removeFromFavorites: (input) =>
      removeFromFavoritesCommand(
        {
          leadReader: deps.leadReader,
          leadFavorites: deps.leadFavorites,
          clock: deps.clock,
        },
        input,
      ),
    reassignLead: (input) => reassignLeadCommand(deps, input),
    reviewLead: (input) => reviewLeadCommand(deps, input),
    addLeadNote: (input) => addLeadNoteCommand(deps, input),
    logLeadCall: (input) => logLeadCallCommand(deps, input),
    applyImportedReview: (input) =>
      applyImportedReviewCommand(
        {
          leadReader: deps.leadReader,
          mutationUow: deps.mutationUow,
          clock: deps.clock,
        },
        input,
      ),
    approveForSale: (input) =>
      approveForSaleCommand(
        {
          leadReader: deps.leadReader,
          mutationUow: deps.mutationUow,
          clock: deps.clock,
        },
        input,
      ),
    createQuotation: (input) =>
      createQuotationCommand(
        {
          leadReader: deps.leadReader,
          mutationUow: deps.mutationUow,
          leadQuotations: deps.leadQuotations,
          clock: deps.clock,
        },
        input,
      ),
    completeScoping: (input) =>
      completeScopingCommand(
        {
          leadReader: deps.leadReader,
          mutationUow: deps.mutationUow,
          leadProfiles: deps.leadProfiles,
          party: deps.party,
          clock: deps.clock,
        },
        input,
      ),
    createVenue: (input) =>
      createVenueCommand(
        {
          leadReader: deps.leadReader,
          mutationUow: deps.mutationUow,
          leadProfiles: deps.leadProfiles,
          leadVenues: deps.leadVenues,
          clock: deps.clock,
        },
        input,
      ),
    addVenueAccounts: (input) =>
      addVenueAccountsCommand(
        {
          leadReader: deps.leadReader,
          mutationUow: deps.mutationUow,
          leadVenues: deps.leadVenues,
          clock: deps.clock,
        },
        input,
      ),
    requestRateNegotiation: (input) =>
      requestRateNegotiationCommand(
        {
          leadReader: deps.leadReader,
          mutationUow: deps.mutationUow,
          negotiationRequests: deps.negotiationRequests,
          clock: deps.clock,
        },
        input,
      ),
  };
}
