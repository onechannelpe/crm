import type { Role } from "~/lib/auth/access/rbac";
import { createSearchEnrichmentRepo } from "~/server/client-search/repository";
import { createEnrichmentCommand } from "~/server/client-search/request";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { registerLead } from "~/server/workflow/application/commands/register-lead";
import { requestSunatRefresh } from "~/server/workflow/application/commands/request-sunat-refresh";
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
} from "~/server/workflow/application/contracts/command-inputs";
import type {
  GetLeadDetailInput,
  ListAssignableExecutivesInput,
} from "~/server/workflow/application/contracts/query-inputs";
import type { RegisterLeadDeps } from "~/server/workflow/application/deps/register-lead";
import type { WorkflowEngineGateway } from "~/server/workflow/application/ports/engine-gateway";
import type { LeadEnrichmentQueue } from "~/server/workflow/application/ports/enrichment-queue";
import { getLeadBootstrapPreview } from "~/server/workflow/application/queries/get-lead-bootstrap-preview";
import { getLeadDetail } from "~/server/workflow/application/queries/get-lead-detail";
import { getSourcingPolicy } from "~/server/workflow/application/queries/get-sourcing-policy";
import { listAssignableExecutives } from "~/server/workflow/application/queries/list-assignable-executives";
import { listLeads } from "~/server/workflow/application/queries/list-leads";
import { systemLeadClock } from "~/server/workflow/application/services/lead-clock";
import { updateSourcingPolicy } from "~/server/workflow/application/settings/update-sourcing-policy";
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
import { removeFromFavoritesCommand } from "~/server/workflow/application/commands/remove-from-favorites";
import { requestQuotationCommand } from "~/server/workflow/application/commands/request-quotation";
import { requestRateNegotiationCommand } from "~/server/workflow/application/commands/request-rate-negotiation";
import { reviewLeadCommand } from "~/server/workflow/application/commands/review-lead";
import { saveCommercialScopeCommand } from "~/server/workflow/application/commands/save-commercial-scope";
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

type WorkflowCommandDeps = {
  leadReader: ReturnType<typeof createLeadReadRepository>;
  leadRepo: ReturnType<typeof createWorkflowRepos>["leads"];
  leadFavorites: ReturnType<typeof createWorkflowRepos>["leadFavorites"];
  mutationUow: ReturnType<typeof createLeadMutationUow>;
  users: ReturnType<typeof createLeadUserScopeRepository>;
  clock: typeof systemLeadClock;
  registerLead: RegisterLeadDeps;
  auditService: ReturnType<typeof createWorkflowAuditService>;
  engineGateway: WorkflowEngineGateway;
  leadEnrichmentQueue: LeadEnrichmentQueue;
  leadQuotations: ReturnType<typeof createWorkflowRepos>["leadQuotations"];
  leadProfiles: ReturnType<typeof createWorkflowRepos>["leadProfiles"];
  party: ReturnType<typeof createWorkflowRepos>["party"];
  leadVenues: ReturnType<typeof createWorkflowRepos>["leadVenues"];
  negotiationRequests: ReturnType<
    typeof createWorkflowRepos
  >["leadNegotiationRequests"];
  sourcingPolicies: ReturnType<typeof createWorkflowRepos>["sourcingPolicies"];
};

function createWorkflowCommandDeps(
  executor: DatabaseExecutor,
  engineGateway: WorkflowEngineGateway,
): WorkflowCommandDeps {
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

  return {
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
}

function createWorkflowCoreCommands(baseDeps: WorkflowCommandDeps) {
  return {
    registerLead: (input: RegisterLeadInput) =>
      registerLead({
        actorUserId: input.actor.userId,
        actorRole: input.actor.role,
        executiveId: input.executiveId,
        ruc: input.ruc,
        deps: baseDeps.registerLead,
        mutationUow: baseDeps.mutationUow,
        auditService: baseDeps.auditService,
        engineGateway: baseDeps.engineGateway,
        leadEnrichmentQueue: baseDeps.leadEnrichmentQueue,
      }),
    addToFavorites: (input: AddLeadToFavoritesInput) =>
      addToFavoritesCommand(
        {
          leadReader: baseDeps.leadReader,
          leadFavorites: baseDeps.leadFavorites,
          clock: baseDeps.clock,
        },
        input,
      ),
    removeFromFavorites: (input: RemoveLeadFromFavoritesInput) =>
      removeFromFavoritesCommand(
        {
          leadReader: baseDeps.leadReader,
          leadFavorites: baseDeps.leadFavorites,
          clock: baseDeps.clock,
        },
        input,
      ),
    reassignLead: (input: ReassignLeadInput) =>
      reassignLeadCommand(baseDeps, input),
    reviewLead: (input: ReviewLeadInput) => reviewLeadCommand(baseDeps, input),
  };
}

function createWorkflowInteractionCommands(baseDeps: WorkflowCommandDeps) {
  return {
    addLeadNote: (input: AddLeadNoteInput) =>
      addLeadNoteCommand(baseDeps, input),
    logLeadCall: (input: LogLeadCallInput) =>
      logLeadCallCommand(baseDeps, input),
    applyImportedReview: (input: ApplyImportedReviewInput) =>
      applyImportedReviewCommand(
        {
          leadReader: baseDeps.leadReader,
          mutationUow: baseDeps.mutationUow,
          clock: baseDeps.clock,
        },
        input,
      ),
  };
}

function createWorkflowSalesCommands(
  executor: DatabaseExecutor,
  baseDeps: WorkflowCommandDeps,
) {
  return {
    approveForSale: (input: ApproveForSaleInput) =>
      approveForSaleCommand(
        {
          leadReader: baseDeps.leadReader,
          mutationUow: baseDeps.mutationUow,
          clock: baseDeps.clock,
        },
        input,
      ),
    createQuotation: (input: CreateQuotationInput) =>
      createQuotationCommand(
        {
          leadReader: baseDeps.leadReader,
          mutationUow: baseDeps.mutationUow,
          leadQuotations: baseDeps.leadQuotations,
          clock: baseDeps.clock,
        },
        input,
      ),
    saveCommercialScope: (input: SaveCommercialScopeInput) =>
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
    requestQuotation: (input: RequestQuotationInput) =>
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
    recordRepLegal: (input: RecordRepLegalInput) =>
      executor.transaction().execute((tx) => {
        const txRepos = createWorkflowRepos(tx);
        return recordRepLegalCommand(
          {
            leadReader: createLeadReadRepository(txRepos.leads),
            mutationUow: createLeadMutationUow(tx),
            party: txRepos.party,
            clock: baseDeps.clock,
          },
          input,
        );
      }),
    createVenue: (input: CreateVenueInput) =>
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
    addVenueAccounts: (input: AddVenueAccountsInput) =>
      addVenueAccountsCommand(
        {
          leadReader: baseDeps.leadReader,
          mutationUow: baseDeps.mutationUow,
          leadVenues: baseDeps.leadVenues,
          clock: baseDeps.clock,
        },
        input,
      ),
    requestRateNegotiation: (input: RequestRateNegotiationInput) =>
      requestRateNegotiationCommand(
        {
          leadReader: baseDeps.leadReader,
          mutationUow: baseDeps.mutationUow,
          negotiationRequests: baseDeps.negotiationRequests,
          clock: baseDeps.clock,
        },
        input,
      ),
  };
}

function createWorkflowSettingsCommands(baseDeps: WorkflowCommandDeps) {
  return {
    requestSunatRefresh: (input: {
      actorUserId: number;
      actorRole: Role;
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
      actorRole: Role;
      branchId: number;
      engineAssignmentEnabled: boolean;
    }) =>
      updateSourcingPolicy(
        { sourcingPolicies: baseDeps.sourcingPolicies },
        input,
      ),
  };
}

function createWorkflowCommandsRuntime(
  executor: DatabaseExecutor,
  engineGateway: WorkflowEngineGateway,
) {
  const baseDeps = createWorkflowCommandDeps(executor, engineGateway);

  return {
    ...createWorkflowCoreCommands(baseDeps),
    ...createWorkflowInteractionCommands(baseDeps),
    ...createWorkflowSalesCommands(executor, baseDeps),
    ...createWorkflowSettingsCommands(baseDeps),
  };
}

function createWorkflowQueriesRuntime(
  repos: ReturnType<typeof createWorkflowRepos>,
  engineGateway: WorkflowEngineGateway,
) {
  return {
    getLeadDetail: (input: GetLeadDetailInput) =>
      getLeadDetail(
        {
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
        {
          actorUserId: input.actor.userId,
          actorRole: input.actor.role,
          leadId: input.leadId,
        },
      ),
    listAssignableExecutives: (input: ListAssignableExecutivesInput) =>
      listAssignableExecutives(
        {
          leads: repos.leads,
          users: repos.users,
        },
        {
          actorUserId: input.actor.userId,
          actorRole: input.actor.role,
          actorBranchId: input.actor.branchId,
          leadId: input.leadId,
          search: input.search,
          limit: input.limit,
        },
      ),
    listLeads: (input: {
      actorUserId: number;
      actorRole: Role;
      actorBranchId: number;
      filters: {
        stage?: string;
        status?: string;
        prioridad?: string;
        executiveId?: number;
        updatedSinceMs?: number;
        updatedUntilMs?: number;
        sortBy?: string;
        sortDirection?: string;
        limit?: number;
        offset?: number;
      };
    }) => listLeads({ leads: repos.leadQueries }, input),
    getLeadBootstrapPreview: (input: { ruc: string }) =>
      getLeadBootstrapPreview({ party: repos.party }, engineGateway, input),
    getSourcingPolicy: (input: { actorRole: Role; branchId: number }) =>
      getSourcingPolicy({ sourcingPolicies: repos.sourcingPolicies }, input),
  };
}

export function createWorkflowRuntime(
  infra: ServerInfra,
  engineGateway: WorkflowEngineGateway,
) {
  const repos = createWorkflowRepos(infra.db);

  return {
    repos,
    engineGateway,
    commands: createWorkflowCommandsRuntime(infra.db, engineGateway),
    queries: createWorkflowQueriesRuntime(repos, engineGateway),
    createSunatEnrichmentWritebackQueue: (workerId: string) =>
      createSunatEnrichmentWritebackQueue(workerId, {
        executor: infra.db,
      }),
  };
}
