import type { Role } from "~/lib/auth/access/rbac";
import type { WorkflowEngineGateway } from "~/server/workflow/infrastructure/ports/gateways";
import type { WorkflowRepos } from "~/server/workflow/infrastructure/workflow-repos";
import { getLeadBootstrapPreview } from "~/server/workflow/lead/read/queries/get-lead-bootstrap-preview";
import { getLeadDetail } from "~/server/workflow/lead/read/queries/get-lead-detail";
import { listAssignableExecutives } from "~/server/workflow/lead/read/queries/list-assignable-executives";
import { listLeads } from "~/server/workflow/lead/read/queries/list-leads";
import { getRateProposalPolicy } from "~/server/workflow/policy/read/get-rate-proposal-policy";
import { getSourcingPolicy } from "~/server/workflow/policy/read/get-sourcing-policy";
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
          digitalPolicies: repos.digitalPolicies,
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
    getRateProposalPolicy: (input: { actorRole: Role; branchId: number }) =>
      getRateProposalPolicy(
        { rateProposalPolicies: repos.rateProposalPolicies },
        input,
      ),
  };
}
