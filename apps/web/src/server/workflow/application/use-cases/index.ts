import type { Role } from "~/lib/auth/access/rbac";
import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

import { requestSunatRefresh } from "../commands/request-sunat-refresh";
import type {
  AddLeadNoteInput,
  AddLeadToFavoritesInput,
  AddVenueAccountsInput,
  ApplyImportedReviewInput,
  ApproveForSaleInput,
  CreateQuotationInput,
  CreateVenueInput,
  LogLeadCallInput,
  ReassignLeadInput,
  RecordRepLegalInput,
  RegisterLeadInput,
  RemoveLeadFromFavoritesInput,
  RequestQuotationInput,
  RequestRateNegotiationInput,
  ReviewLeadInput,
  SaveCommercialScopeInput,
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
import type { LeadReadRepository } from "../ports/lead-read-repository";
import type { LeadRepository } from "../ports/lead-repository";
import type { LeadUserScopeRepository } from "../ports/lead-user-scope-repository";
import type { NegotiationRequestRepository } from "../ports/negotiation-request-repository";
import type { PartyRepository } from "../ports/party-repository";
import type { LeadQuotationRepository } from "../ports/quotation-repository";
import type { LeadVenueRepository } from "../ports/sale-repository";
import type { LeadSourcingPolicyRepository } from "../ports/sourcing-policy-repository";
import type { LeadClock } from "../services/lead-clock";
import { updateSourcingPolicy } from "../settings/update-sourcing-policy";
import { addLeadNoteCommand } from "./add-note";
import { addToFavoritesCommand } from "./add-to-favorites";
import { addVenueAccountsCommand } from "./add-venue-accounts";
import { applyImportedReviewCommand } from "./apply-imported-review";
import { approveForSaleCommand } from "./approve-for-sale";
import { createQuotationCommand } from "./create-quotation";
import { createVenueCommand } from "./create-venue";
import { logLeadCallCommand } from "./log-call";
import { reassignLeadCommand } from "./reassign-lead";
import { recordRepLegalCommand } from "./record-rep-legal";
import { registerLeadCommand } from "./register-lead";
import { removeFromFavoritesCommand } from "./remove-from-favorites";
import { requestQuotationCommand } from "./request-quotation";
import { requestRateNegotiationCommand } from "./request-rate-negotiation";
import { reviewLeadCommand } from "./review-lead";
import { saveCommercialScopeCommand } from "./save-commercial-scope";

export type WorkflowUseCaseDeps = {
  leadReader: LeadReadRepository;
  leadRepo: LeadRepository;
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
  sourcingPolicies: LeadSourcingPolicyRepository;
};

export type WorkflowUseCases = {
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
  saveCommercialScope(
    input: SaveCommercialScopeInput,
  ): Promise<Result<LeadCommandResult, DomainError>>;
  requestQuotation(
    input: RequestQuotationInput,
  ): Promise<Result<LeadCommandResult, DomainError>>;
  recordRepLegal(
    input: RecordRepLegalInput,
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
  requestSunatRefresh(input: {
    actorUserId: number;
    actorRole: Role;
    leadId: string;
  }): Promise<Result<void, DomainError>>;
  updateSourcingPolicy(input: {
    actorUserId: number;
    actorRole: Role;
    branchId: number;
    engineAssignmentEnabled: boolean;
  }): Promise<
    Result<
      {
        branchId: number;
        engineAssignmentEnabled: boolean;
      },
      DomainError
    >
  >;
};

export function createWorkflowUseCases(
  deps: WorkflowUseCaseDeps,
): WorkflowUseCases {
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
    saveCommercialScope: (input) =>
      saveCommercialScopeCommand(
        {
          leadReader: deps.leadReader,
          mutationUow: deps.mutationUow,
          leadProfiles: deps.leadProfiles,
          leadVenues: deps.leadVenues,
          party: deps.party,
          clock: deps.clock,
        },
        input,
      ),
    requestQuotation: (input) =>
      requestQuotationCommand(
        {
          leadReader: deps.leadReader,
          mutationUow: deps.mutationUow,
          leadProfiles: deps.leadProfiles,
          party: deps.party,
          clock: deps.clock,
        },
        input,
      ),
    recordRepLegal: (input) =>
      recordRepLegalCommand(
        {
          leadReader: deps.leadReader,
          mutationUow: deps.mutationUow,
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
    requestSunatRefresh: (input) =>
      requestSunatRefresh({
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        leadId: input.leadId,
        leadRepo: deps.leadRepo,
        enrichmentQueue: deps.leadEnrichmentQueue,
        auditService: deps.auditService,
      }),
    updateSourcingPolicy: (input) =>
      updateSourcingPolicy({ sourcingPolicies: deps.sourcingPolicies }, input),
  };
}
