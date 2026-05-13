import type { Role } from "~/lib/auth/access/rbac";
import { createSearchEnrichmentRepo } from "~/server/client-search/repository";
import { createEnrichmentCommand } from "~/server/client-search/request";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
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
  ListLeadsInput,
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
import {
  createWorkflowAuditLogRepo,
  createWorkflowAuditService,
  createWorkflowAuditLogsRepo,
} from "~/server/workflow/infrastructure/audit-log";
import { createLeadMutationUow } from "~/server/workflow/infrastructure/repos/lead-mutation-uow";
import { createWorkflowRepos, type WorkflowRepos } from "~/server/workflow/infrastructure/workflow-repos";
import { createSunatEnrichmentWritebackQueue } from "~/server/workflow/queue/sunat-enrichment-writeback-queue";

type WorkflowCommandDeps = {
  repos: WorkflowRepos;
  mutationUow: ReturnType<typeof createLeadMutationUow>;
  clock: typeof systemLeadClock;
  registerLead: RegisterLeadDeps;
  auditService: ReturnType<typeof createWorkflowAuditService>;
  engineGateway: WorkflowEngineGateway;
  leadEnrichmentQueue: LeadEnrichmentQueue;
};

function createWorkflowCommandDeps(
  executor: DatabaseExecutor,
  repos: WorkflowRepos,
  engineGateway: WorkflowEngineGateway,
): WorkflowCommandDeps {
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
    repos,
    mutationUow: createLeadMutationUow(executor),
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
  };
}

function createWorkflowCommands(
  deps: WorkflowCommandDeps,
  executor: DatabaseExecutor,
) {
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
    reassignLead: (input: ReassignLeadInput) =>
      reassignLeadCommand(
        {
          leadReader: deps.repos.leads,
          mutationUow: deps.mutationUow,
          users: {
            findUserById: (id) => deps.repos.users.findById(id),
            isExecutiveAssignable: (scope, executiveId) =>
              deps.repos.users.isExecutiveAssignable(scope, executiveId),
            listAssignableExecutives: (scope, options) =>
              deps.repos.users.listAssignableExecutives(scope, options),
          },
          clock: deps.clock,
        },
        input,
      ),
    reviewLead: (input: ReviewLeadInput) =>
      reviewLeadCommand(
        {
          leadReader: deps.repos.leads,
          mutationUow: deps.mutationUow,
          clock: deps.clock,
        },
        input,
      ),
    addLeadNote: (input: AddLeadNoteInput) =>
      addLeadNoteCommand(
        {
          leadReader: deps.repos.leads,
          mutationUow: deps.mutationUow,
          clock: deps.clock,
        },
        input,
      ),
    logLeadCall: (input: LogLeadCallInput) =>
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
    createQuotation: (input: CreateQuotationInput) =>
      createQuotationCommand(
        {
          leadReader: deps.repos.leads,
          mutationUow: deps.mutationUow,
          leadQuotations: deps.repos.leadQuotations,
          clock: deps.clock,
        },
        input,
      ),
    saveCommercialScope: (input: SaveCommercialScopeInput) =>
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
    recordRepLegal: (input: RecordRepLegalInput) =>
      executor.transaction().execute((tx) => {
        const txRepos = createWorkflowRepos(tx);
        return recordRepLegalCommand(
          {
            leadReader: txRepos.leads,
            mutationUow: createLeadMutationUow(tx),
            party: txRepos.party,
            clock: deps.clock,
          },
          input,
        );
      }),
    createVenue: (input: CreateVenueInput) =>
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
    addVenueAccounts: (input: AddVenueAccountsInput) =>
      addVenueAccountsCommand(
        {
          leadReader: deps.repos.leads,
          mutationUow: deps.mutationUow,
          leadVenues: deps.repos.leadVenues,
          clock: deps.clock,
        },
        input,
      ),
    requestRateNegotiation: (input: RequestRateNegotiationInput) =>
      requestRateNegotiationCommand(
        {
          leadReader: deps.repos.leads,
          mutationUow: deps.mutationUow,
          negotiationRequests: deps.repos.leadNegotiationRequests,
          clock: deps.clock,
        },
        input,
      ),
    requestSunatRefresh: (input: {
      actor: { userId: number; role: Role; branchId: number };
      leadId: string;
    }) =>
      requestSunatRefresh({
        actor: input.actor,
        leadId: input.leadId,
        leadRepo: deps.repos.leads,
        enrichmentQueue: deps.leadEnrichmentQueue,
        auditService: deps.auditService,
      }),
    updateSourcingPolicy: (input: {
      actor: { userId: number; role: Role; branchId: number };
      branchId: number;
      engineAssignmentEnabled: boolean;
    }) =>
      updateSourcingPolicy(
        { sourcingPolicies: deps.repos.sourcingPolicies },
        input,
      ),
  };
}

function createWorkflowQueries(
  repos: WorkflowRepos,
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
    listLeads: (input: ListLeadsInput) =>
      listLeads(
        { leads: repos.leadQueries },
        {
          actorUserId: input.actor.userId,
          actorRole: input.actor.role,
          actorBranchId: input.actor.branchId,
          filters: input.filters,
        },
      ),
    getLeadBootstrapPreview: (input: { ruc: string }) =>
      getLeadBootstrapPreview({ party: repos.party }, engineGateway, input),
    getSourcingPolicy: (input: { actorRole: Role; branchId: number }) =>
      getSourcingPolicy({ sourcingPolicies: repos.sourcingPolicies }, input),
  };
}

export function createWorkflowApp(input: {
  executor: DatabaseExecutor;
  engineGateway: WorkflowEngineGateway;
}) {
  const repos = createWorkflowRepos(input.executor);
  const commandDeps = createWorkflowCommandDeps(
    input.executor,
    repos,
    input.engineGateway,
  );

  return {
    repos,
    engineGateway: input.engineGateway,
    commands: createWorkflowCommands(commandDeps, input.executor),
    queries: createWorkflowQueries(repos, input.engineGateway),
    createSunatEnrichmentWritebackQueue: (workerId: string) =>
      createSunatEnrichmentWritebackQueue(workerId, {
        executor: input.executor,
      }),
  };
}
