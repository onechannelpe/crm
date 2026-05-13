import { createSearchEnrichmentRepo } from "~/server/client-search/repository";
import { createEnrichmentCommand } from "~/server/client-search/request";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { requestSunatRefresh } from "~/server/workflow/application/commands/request-sunat-refresh";
import type { WorkflowEngineGateway } from "~/server/workflow/application/ports/engine-gateway";
import type { LeadEnrichmentQueue } from "~/server/workflow/application/ports/enrichment-queue";
import { createWorkflowQueryApi } from "~/server/workflow/application/query-api";
import { systemLeadClock } from "~/server/workflow/application/services/lead-clock";
import { updateSourcingPolicy } from "~/server/workflow/application/settings/update-sourcing-policy";
import { addLeadNoteCommand } from "~/server/workflow/application/use-cases/add-note";
import { addToFavoritesCommand } from "~/server/workflow/application/use-cases/add-to-favorites";
import { addVenueAccountsCommand } from "~/server/workflow/application/use-cases/add-venue-accounts";
import { applyImportedReviewCommand } from "~/server/workflow/application/use-cases/apply-imported-review";
import { approveForSaleCommand } from "~/server/workflow/application/use-cases/approve-for-sale";
import { createQuotationCommand } from "~/server/workflow/application/use-cases/create-quotation";
import { createVenueCommand } from "~/server/workflow/application/use-cases/create-venue";
import { logLeadCallCommand } from "~/server/workflow/application/use-cases/log-call";
import { reassignLeadCommand } from "~/server/workflow/application/use-cases/reassign-lead";
import { recordRepLegalCommand } from "~/server/workflow/application/use-cases/record-rep-legal";
import { registerLeadCommand } from "~/server/workflow/application/use-cases/register-lead";
import { removeFromFavoritesCommand } from "~/server/workflow/application/use-cases/remove-from-favorites";
import { requestQuotationCommand } from "~/server/workflow/application/use-cases/request-quotation";
import { requestRateNegotiationCommand } from "~/server/workflow/application/use-cases/request-rate-negotiation";
import { reviewLeadCommand } from "~/server/workflow/application/use-cases/review-lead";
import { saveCommercialScopeCommand } from "~/server/workflow/application/use-cases/save-commercial-scope";
import {
  createWorkflowAuditLogRepo,
  createWorkflowAuditService,
  createWorkflowAuditLogsRepo,
} from "~/server/workflow/infrastructure/audit-log";
import { createLeadMutationUow } from "~/server/workflow/infrastructure/repos/lead-mutation-uow";
import { createLeadReadRepository } from "~/server/workflow/infrastructure/repos/lead-read-repo";
import { createLeadUserScopeRepository } from "~/server/workflow/infrastructure/repos/lead-user-scope-repo";
import { createWorkflowRepos } from "~/server/workflow/infrastructure/workflow-repos";
import { createSunatEnrichmentWritebackQueue } from "~/server/workflow/queue/sunat-enrichment-writeback-queue";

import type { ServerInfra } from "./infra";

function composeWorkflowIntentHandlersRuntime(
  executor: DatabaseExecutor,
  engineGateway: WorkflowEngineGateway,
) {
  const repos = createWorkflowRepos(executor);
  const auditService = createWorkflowAuditService({
    auditLogs: createWorkflowAuditLogRepo(
      createWorkflowAuditLogsRepo(executor),
    ),
  });
  const enrichmentCommand = createEnrichmentCommand(
    createSearchEnrichmentRepo(executor),
  );
  const leadEnrichmentQueue: LeadEnrichmentQueue = {
    async enqueueRucVerification(ruc, requestedByUserId) {
      await enrichmentCommand.enqueueRequest("ruc", ruc, requestedByUserId);
    },
  };

  const baseDeps = {
    leadReader: createLeadReadRepository(repos.leads),
    leadRepo: repos.leads,
    leadFavorites: repos.leadFavorites,
    mutationUow: createLeadMutationUow(executor),
    users: createLeadUserScopeRepository(repos.users),
    clock: systemLeadClock,
    registerLead: {
      leads: repos.leads,
      leadAssignments: repos.leadAssignments,
      leadHistory: repos.leadHistory,
      users: repos.users,
      party: repos.party,
    },
    auditService,
    engineGateway,
    leadEnrichmentQueue,
    leadQuotations: repos.leadQuotations,
    leadProfiles: repos.leadProfiles,
    party: repos.party,
    leadVenues: repos.leadVenues,
    negotiationRequests: repos.leadNegotiationRequests,
    sourcingPolicies: repos.sourcingPolicies,
  };

  return {
    registerLead: (input: Parameters<typeof registerLeadCommand>[1]) =>
      registerLeadCommand(baseDeps, input),
    addToFavorites: (input: Parameters<typeof addToFavoritesCommand>[1]) =>
      addToFavoritesCommand(
        {
          leadReader: baseDeps.leadReader,
          leadFavorites: baseDeps.leadFavorites,
          clock: baseDeps.clock,
        },
        input,
      ),
    removeFromFavorites: (
      input: Parameters<typeof removeFromFavoritesCommand>[1],
    ) =>
      removeFromFavoritesCommand(
        {
          leadReader: baseDeps.leadReader,
          leadFavorites: baseDeps.leadFavorites,
          clock: baseDeps.clock,
        },
        input,
      ),
    reassignLead: (input: Parameters<typeof reassignLeadCommand>[1]) =>
      reassignLeadCommand(baseDeps, input),
    reviewLead: (input: Parameters<typeof reviewLeadCommand>[1]) =>
      reviewLeadCommand(baseDeps, input),
    addLeadNote: (input: Parameters<typeof addLeadNoteCommand>[1]) =>
      addLeadNoteCommand(baseDeps, input),
    logLeadCall: (input: Parameters<typeof logLeadCallCommand>[1]) =>
      logLeadCallCommand(baseDeps, input),
    applyImportedReview: (
      input: Parameters<typeof applyImportedReviewCommand>[1],
    ) =>
      applyImportedReviewCommand(
        {
          leadReader: baseDeps.leadReader,
          mutationUow: baseDeps.mutationUow,
          clock: baseDeps.clock,
        },
        input,
      ),
    approveForSale: (input: Parameters<typeof approveForSaleCommand>[1]) =>
      approveForSaleCommand(
        {
          leadReader: baseDeps.leadReader,
          mutationUow: baseDeps.mutationUow,
          clock: baseDeps.clock,
        },
        input,
      ),
    createQuotation: (input: Parameters<typeof createQuotationCommand>[1]) =>
      createQuotationCommand(
        {
          leadReader: baseDeps.leadReader,
          mutationUow: baseDeps.mutationUow,
          leadQuotations: baseDeps.leadQuotations,
          clock: baseDeps.clock,
        },
        input,
      ),
    saveCommercialScope: (
      input: Parameters<typeof saveCommercialScopeCommand>[1],
    ) =>
      saveCommercialScopeCommand(
        {
          leadReader: baseDeps.leadReader,
          mutationUow: baseDeps.mutationUow,
          leadProfiles: baseDeps.leadProfiles,
          leadVenues: baseDeps.leadVenues,
          party: baseDeps.party,
          clock: baseDeps.clock,
        },
        input,
      ),
    requestQuotation: (input: Parameters<typeof requestQuotationCommand>[1]) =>
      requestQuotationCommand(
        {
          leadReader: baseDeps.leadReader,
          mutationUow: baseDeps.mutationUow,
          leadProfiles: baseDeps.leadProfiles,
          party: baseDeps.party,
          clock: baseDeps.clock,
        },
        input,
      ),
    recordRepLegal: (input: Parameters<typeof recordRepLegalCommand>[1]) =>
      recordRepLegalCommand(
        {
          leadReader: baseDeps.leadReader,
          mutationUow: baseDeps.mutationUow,
          party: baseDeps.party,
          clock: baseDeps.clock,
        },
        input,
      ),
    createVenue: (input: Parameters<typeof createVenueCommand>[1]) =>
      createVenueCommand(
        {
          leadReader: baseDeps.leadReader,
          mutationUow: baseDeps.mutationUow,
          leadProfiles: baseDeps.leadProfiles,
          leadVenues: baseDeps.leadVenues,
          clock: baseDeps.clock,
        },
        input,
      ),
    addVenueAccounts: (input: Parameters<typeof addVenueAccountsCommand>[1]) =>
      addVenueAccountsCommand(
        {
          leadReader: baseDeps.leadReader,
          mutationUow: baseDeps.mutationUow,
          leadVenues: baseDeps.leadVenues,
          clock: baseDeps.clock,
        },
        input,
      ),
    requestRateNegotiation: (
      input: Parameters<typeof requestRateNegotiationCommand>[1],
    ) =>
      requestRateNegotiationCommand(
        {
          leadReader: baseDeps.leadReader,
          mutationUow: baseDeps.mutationUow,
          negotiationRequests: baseDeps.negotiationRequests,
          clock: baseDeps.clock,
        },
        input,
      ),
    requestSunatRefresh: (input: {
      actorUserId: number;
      actorRole: Parameters<typeof requestSunatRefresh>[0]["actorRole"];
      leadId: string;
    }) =>
      requestSunatRefresh({
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        leadId: input.leadId,
        leadRepo: baseDeps.leadRepo,
        enrichmentQueue: baseDeps.leadEnrichmentQueue,
        auditService: baseDeps.auditService,
      }),
    updateSourcingPolicy: (input: {
      actorUserId: number;
      actorRole: Parameters<typeof updateSourcingPolicy>[1]["actorRole"];
      branchId: number;
      engineAssignmentEnabled: boolean;
    }) =>
      updateSourcingPolicy(
        { sourcingPolicies: baseDeps.sourcingPolicies },
        input,
      ),
  };
}

export function createWorkflowRuntime(
  infra: ServerInfra,
  engineGateway: WorkflowEngineGateway,
) {
  const repos = createWorkflowRepos(infra.db);

  const queryApi = createWorkflowQueryApi({
    leadDetail: {
      leads: repos.leads,
      leadFavorites: repos.leadFavorites,
      leadProfiles: repos.leadProfiles,
      leadHistory: repos.leadHistory,
      leadQuotations: repos.leadQuotations,
      leadVenues: repos.leadVenues,
      leadNegotiationRequests: repos.leadNegotiationRequests,
      negotiationFiles: repos.negotiationFiles,
      sourceStatuses: repos.sourceStatuses,
      users: repos.users,
      party: repos.party,
    },
    assignableExecutives: {
      leads: repos.leads,
      users: repos.users,
    },
  });

  return {
    repos,
    engineGateway,
    useCases: composeWorkflowIntentHandlersRuntime(infra.db, engineGateway),
    queryApi,
    createSunatEnrichmentWritebackQueue: (workerId: string) =>
      createSunatEnrichmentWritebackQueue(workerId, {
        executor: infra.db,
      }),
  };
}
