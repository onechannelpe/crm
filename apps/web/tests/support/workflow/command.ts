import type { Transaction } from "kysely";

import type { Database } from "~/lib/db/types";
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
import { updateSourcingPolicy } from "~/server/workflow/application/commands/update-sourcing-policy";
import type { LeadEnrichmentQueue } from "~/server/workflow/application/ports/gateways";
import { createLeadStateRepo } from "~/server/workflow/infrastructure/lead-state-repo";
import { createLeadUow } from "~/server/workflow/infrastructure/uow";
import { createWorkflowRepos } from "~/server/workflow/infrastructure/workflow-repos";
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

import type { TestRuntime } from "../runtime/app";

const NO_OP_ENRICHMENT_QUEUE: LeadEnrichmentQueue = {
  enqueueRucVerification: async () => {},
};

export type TestCommandOverrides = {
  leadEnrichmentQueue?: LeadEnrichmentQueue;
};

function buildCommandApi(
  executor: Transaction<Database>,
  overrides?: TestCommandOverrides,
) {
  const repos = createWorkflowRepos(executor);
  const uow = createLeadUow(executor);
  const leadStates = createLeadStateRepo(executor);
  const enrichmentQueue =
    overrides?.leadEnrichmentQueue ?? NO_OP_ENRICHMENT_QUEUE;

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
          uow,
          enrichmentQueue,
          executor,
        },
      ),

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

    reassignLead: (input: ReassignLeadCommandInput) =>
      reassignLeadCommand(input, {
        leads: leadStates,
        uow,
        users: repos.users,
      }),

    reviewLead: (input: ReviewLeadCommandInput) =>
      reviewLeadCommand(input, { leads: leadStates, uow }),

    addLeadNote: (input: AddLeadNoteCommandInput) =>
      addLeadNoteCommand(input, { leads: leadStates, uow }),

    logLeadCall: (input: LogLeadCallCommandInput) =>
      logLeadCallCommand(input, { leads: leadStates, uow }),

    applyImportedReview: (input: ApplyImportedReviewInput) =>
      applyImportedReviewCommand(input, { leads: leadStates, uow }),

    approveForSale: (input: ApproveForSaleInput) =>
      approveForSaleCommand(input, { leads: leadStates, uow }),

    createQuotation: (input: CreateQuotationCommandInput) =>
      createQuotationCommand(input, {
        executor,
      }),

    saveCommercialScope: (input: SaveCommercialScopeCommandInput) =>
      saveCommercialScopeCommand(input, {
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
      requestRateNegotiationCommand(input, {
        leads: leadStates,
        uow,
        negotiationRequests: repos.leadNegotiationRequests,
      }),

    requestSunatRefresh: (input: RequestSunatRefreshInput) =>
      requestSunatRefresh(input, {
        leads: repos.leads,
        enrichmentQueue,
      }),

    updateSourcingPolicy: (input: UpdateSourcingPolicyInput) =>
      updateSourcingPolicy(input, {
        sourcingPolicies: repos.sourcingPolicies,
      }),
  };
}

export function runTestWorkflowCommand<T>(
  runtime: TestRuntime,
  operation: (commandApi: ReturnType<typeof buildCommandApi>) => Promise<T>,
  overrides?: TestCommandOverrides,
): Promise<T> {
  return runtime.ctx.db
    .transaction()
    .execute((trx) => operation(buildCommandApi(trx, overrides)));
}
