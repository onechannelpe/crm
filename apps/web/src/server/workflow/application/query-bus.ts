import type { Role } from "~/lib/auth/access/rbac";
import type { WorkflowEngineGateway } from "~/server/workflow/application/ports/gateways";
import { getLeadBootstrapPreview } from "~/server/workflow/application/queries/get-lead-bootstrap-preview";
import { getLeadDetail } from "~/server/workflow/application/queries/get-lead-detail";
import { getSourcingPolicy } from "~/server/workflow/application/queries/get-sourcing-policy";
import { listAssignableExecutives } from "~/server/workflow/application/queries/list-assignable-executives";
import { listLeads } from "~/server/workflow/application/queries/list-leads";
import type { WorkflowRepos } from "~/server/workflow/infrastructure/workflow-repos";
import type {
  ListAssignableExecutivesInput,
  ListLeadsInput,
  WorkflowActor,
} from "~/server/workflow/types";

export function createWorkflowQueryBus(
  repos: WorkflowRepos,
  engineGateway: WorkflowEngineGateway,
) {
  return {
    getLeadDetail: (input: { actor: WorkflowActor; leadId: string }) =>
      getLeadDetail(
        {
          leads: repos.leads,
          leadFavorites: repos.leadFavorites,
          leadProfiles: repos.leadProfiles,
          leadHistory: repos.leadHistory,
          rateProposals: repos.rateProposals,
          leadVenues: repos.leadVenues,
          rateRevisions: repos.rateRevisions,
          rateRevisionFiles: repos.rateRevisionFiles,
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
