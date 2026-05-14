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
  SaveDigitalPolicyCommandInput,
  StartSetupExecutionInput,
  UpdateSourcingPolicyInput,
} from "~/server/workflow/types";

import { createLeadStateRepo } from "../infrastructure/lead-state-repo";
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
import { saveDigitalPolicyCommand } from "./commands/save-digital-policy";
import { startSetupExecutionCommand } from "./commands/start-setup-execution";
import { updateSourcingPolicy } from "./commands/update-sourcing-policy";

export function createWorkflowCommandBus(
  executor: DatabaseExecutor,
  repos: WorkflowRepos,
) {
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
          leadStates,
          users: repos.users,
          enrichmentQueue,
          executor,
        },
      ),

    reviewLead: (input: ReviewLeadCommandInput) =>
      reviewLeadCommand(input, { executor }),

    reassignLead: (input: ReassignLeadCommandInput) =>
      reassignLeadCommand(input, { executor }),

    addLeadNote: (input: AddLeadNoteCommandInput) =>
      addLeadNoteCommand(input, { executor }),

    logLeadCall: (input: LogLeadCallCommandInput) =>
      logLeadCallCommand(input, { executor }),

    approveForSale: (input: ApproveForSaleInput) =>
      approveForSaleCommand(input, { executor }),

    startSetupExecution: (input: StartSetupExecutionInput) =>
      startSetupExecutionCommand(input, {
        executor,
      }),

    createQuotation: (input: CreateQuotationCommandInput) =>
      createQuotationCommand(input, {
        executor,
      }),

    saveCommercialScope: (input: SaveCommercialScopeCommandInput) =>
      saveCommercialScopeCommand(input, {
        executor,
      }),

    saveDigitalPolicy: (input: SaveDigitalPolicyCommandInput) =>
      saveDigitalPolicyCommand(input, {
        executor,
      }),

    requestQuotation: (input: RequestQuotationInput) =>
      requestQuotationCommand(input, {
        executor,
      }),

    recordRepLegal: (input: RecordRepLegalCommandInput) =>
      recordRepLegalCommand(input, {
        executor,
      }),

    createVenue: (input: CreateVenueCommandInput) =>
      createVenueCommand(input, {
        executor,
      }),

    addVenueAccounts: (input: AddVenueAccountsCommandInput) =>
      addVenueAccountsCommand(input, {
        executor,
      }),

    requestRateNegotiation: (input: RequestRateNegotiationCommandInput) =>
      requestRateNegotiationCommand(input, { executor }),

    applyImportedReview: (input: ApplyImportedReviewInput) =>
      applyImportedReviewCommand(input, { executor }),

    requestSunatRefresh: (input: RequestSunatRefreshInput) =>
      requestSunatRefresh(input, {
        leads: repos.leads,
        enrichmentQueue,
      }),

    addToFavorites: (input: AddLeadToFavoritesInput) =>
      addToFavoritesCommand(input, { executor }),

    removeFromFavorites: (input: RemoveLeadFromFavoritesInput) =>
      removeFromFavoritesCommand(input, { executor }),

    updateSourcingPolicy: (input: UpdateSourcingPolicyInput) =>
      updateSourcingPolicy(input, { sourcingPolicies: repos.sourcingPolicies }),
  };
}
