import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type {
  AssignableExecutivesDeps,
  LeadBootstrapPreviewDeps,
  LeadDetailDeps,
  LeadListDeps,
} from "~/server/workflow/application/deps/lead-queries";
import type { RegisterLeadDeps } from "~/server/workflow/application/deps/register-lead";
import type { SourcingPolicyDeps } from "~/server/workflow/application/deps/sourcing-policy";
import { createAssignmentRepo } from "~/server/workflow/infrastructure/assignment-repo";
import { createCommercialInputRepo } from "~/server/workflow/infrastructure/commercial-input-repo";
import { createHistoryRepo } from "~/server/workflow/infrastructure/history-repo";
import { createLeadFavoriteRepo } from "~/server/workflow/infrastructure/lead-favorite-repo";
import { createLeadQueries } from "~/server/workflow/infrastructure/lead-queries";
import { createLeadRepo } from "~/server/workflow/infrastructure/lead-repo";
import { createQuotationRepo } from "~/server/workflow/infrastructure/quotation-repo";
import { createSaleRepo } from "~/server/workflow/infrastructure/sale-repo";
import { createSourceStatusRepo } from "~/server/workflow/infrastructure/source-status-repo";
import { createSourcingPolicyRepo } from "~/server/workflow/infrastructure/sourcing-policy-repo";
import { createWorkflowUsersRepo } from "~/server/workflow/infrastructure/users-repo";

export type WorkflowDeps = {
  registerLead: RegisterLeadDeps;
  leadMutations: RegisterLeadDeps;
  leadList: LeadListDeps;
  leadDetail: LeadDetailDeps;
  leadBootstrapPreview: LeadBootstrapPreviewDeps;
  assignableExecutives: AssignableExecutivesDeps;
  sourcingPolicy: SourcingPolicyDeps;
};

export function createWorkflowFeatureDeps(
  executor: DatabaseExecutor,
): WorkflowDeps {
  const leads = createLeadRepo(executor);
  const leadQueries = createLeadQueries(executor);
  const leadFavorites = createLeadFavoriteRepo(executor);
  const leadAssignments = createAssignmentRepo(executor);
  const leadCommercialInputs = createCommercialInputRepo(executor);
  const leadHistory = createHistoryRepo(executor);
  const leadQuotations = createQuotationRepo(executor);
  const leadSales = createSaleRepo(executor);
  const sourceStatuses = createSourceStatusRepo(executor);
  const sourcingPolicies = createSourcingPolicyRepo(executor);
  const users = createWorkflowUsersRepo(executor);

  return {
    registerLead: { leads, leadAssignments, leadHistory, users },
    leadMutations: { leads, leadAssignments, leadHistory, users },
    leadList: { leads: leadQueries },
    leadDetail: {
      leads,
      leadFavorites,
      leadCommercialInputs,
      leadHistory,
      leadQuotations,
      leadSales,
      sourceStatuses,
      users,
    },
    leadBootstrapPreview: { leads },
    assignableExecutives: { leads, users },
    sourcingPolicy: { sourcingPolicies },
  };
}
