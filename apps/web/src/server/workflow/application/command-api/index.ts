import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

import type { LeadReadRepository } from "../../ports/lead-read-repository";
import type { LeadUserScopeRepository } from "../../ports/lead-user-scope-repository";
import type {
  AddLeadToFavoritesInput,
  AddLeadNoteInput,
  ApplyImportedReviewInput,
  ApproveForSaleInput,
  CompleteCommercialInputInput,
  CreateQuotationInput,
  CreateSaleInput,
  CreateSaleVenueInput,
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
  LeadSaleResult,
} from "../contracts/command-results";
import type { RegisterLeadDeps } from "../deps/register-lead";
import type { WorkflowAuditService } from "../ports/audit-service";
import type { LeadCommercialInputRepository } from "../ports/commercial-input-repository";
import type { WorkflowEngineGateway } from "../ports/engine-gateway";
import type { LeadEnrichmentQueue } from "../ports/enrichment-queue";
import type { LeadFavoriteRepository } from "../ports/lead-favorite-repository";
import type { LeadMutationUow } from "../ports/lead-mutation-uow";
import type { NegotiationRequestRepository } from "../ports/negotiation-request-repository";
import type { WorkflowNotificationCenter } from "../ports/notification-center";
import type { LeadQuotationRepository } from "../ports/quotation-repository";
import type {
  LeadSaleRepository,
  LeadSaleVenueRepository,
} from "../ports/sale-repository";
import type { LeadClock } from "../services/lead-clock";
import { addLeadNoteCommand } from "./add-note";
import { addToFavoritesCommand } from "./add-to-favorites";
import { applyImportedReviewCommand } from "./apply-imported-review";
import { approveForSaleCommand } from "./approve-for-sale";
import { completeCommercialInputCommand } from "./complete-commercial-input";
import { createQuotationCommand } from "./create-quotation";
import { createSaleCommand } from "./create-sale";
import { createSaleVenueCommand } from "./create-sale-venue";
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
  notificationCenter: WorkflowNotificationCenter;
  clock: LeadClock;
  registerLead: RegisterLeadDeps;
  auditService: WorkflowAuditService;
  engineGateway: WorkflowEngineGateway;
  leadEnrichmentQueue: LeadEnrichmentQueue;
  leadQuotations: LeadQuotationRepository;
  leadCommercialInputs: LeadCommercialInputRepository;
  leadSales: LeadSaleRepository;
  leadSaleVenues: LeadSaleVenueRepository;
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
  completeCommercialInput(
    input: CompleteCommercialInputInput,
  ): Promise<Result<LeadCommandResult, DomainError>>;
  createSale(
    input: CreateSaleInput,
  ): Promise<Result<LeadSaleResult, DomainError>>;
  createSaleVenue(
    input: CreateSaleVenueInput,
  ): Promise<Result<LeadSaleResult, DomainError>>;
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
          notificationCenter: deps.notificationCenter,
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
    completeCommercialInput: (input) =>
      completeCommercialInputCommand(
        {
          leadReader: deps.leadReader,
          mutationUow: deps.mutationUow,
          leadCommercialInputs: deps.leadCommercialInputs,
          notificationCenter: deps.notificationCenter,
          clock: deps.clock,
        },
        input,
      ),
    createSale: (input) =>
      createSaleCommand(
        {
          leadReader: deps.leadReader,
          mutationUow: deps.mutationUow,
          leadSales: deps.leadSales,
          clock: deps.clock,
        },
        input,
      ),
    createSaleVenue: (input) =>
      createSaleVenueCommand(
        {
          leadReader: deps.leadReader,
          mutationUow: deps.mutationUow,
          leadSales: deps.leadSales,
          leadSaleVenues: deps.leadSaleVenues,
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
