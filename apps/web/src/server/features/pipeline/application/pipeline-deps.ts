import type { LeadInteractionDeps } from "~/server/pipeline/application/deps/lead-interactions";
import type {
  LeadBootstrapPreviewDeps,
  LeadDetailDeps,
  LeadListDeps,
  SaleQueryDeps,
} from "~/server/pipeline/application/deps/lead-queries";
import type {
  ApproveForSaleDeps,
  CreateQuotationDeps,
} from "~/server/pipeline/application/deps/quotations";
import type { RegisterLeadDeps } from "~/server/pipeline/application/deps/register-lead";
import type { ReviewLeadDeps } from "~/server/pipeline/application/deps/review-lead";
import type {
  CompleteCommercialInputDeps,
  CreateSaleDeps,
} from "~/server/pipeline/application/deps/sales";
import type { SourcingPolicyDeps } from "~/server/pipeline/application/deps/sourcing-policy";
import { createAssignmentRepo } from "~/server/pipeline/infrastructure/assignment-repo";
import { createCommercialInputRepo } from "~/server/pipeline/infrastructure/commercial-input-repo";
import { createEngineGateway } from "~/server/pipeline/infrastructure/engine-gateway";
import { createHistoryRepo } from "~/server/pipeline/infrastructure/history-repo";
import { createLeadQueries } from "~/server/pipeline/infrastructure/lead-queries";
import { createLeadRepo } from "~/server/pipeline/infrastructure/lead-repo";
import { createQuotationRepo } from "~/server/pipeline/infrastructure/quotation-repo";
import { createSaleRepo } from "~/server/pipeline/infrastructure/sale-repo";
import { createSourceStatusRepo } from "~/server/pipeline/infrastructure/source-status-repo";
import { createSourcingPolicyRepo } from "~/server/pipeline/infrastructure/sourcing-policy-repo";
import { createPipelineUsersRepo } from "~/server/pipeline/infrastructure/users-repo";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export type PipelineDeps = {
  registerLead: RegisterLeadDeps;
  reassignLead: RegisterLeadDeps;
  leadInteractions: LeadInteractionDeps;
  reviewLead: ReviewLeadDeps;
  completeCommercialInput: CompleteCommercialInputDeps;
  createQuotation: CreateQuotationDeps;
  approveForSale: ApproveForSaleDeps;
  createSale: CreateSaleDeps;
  leadList: LeadListDeps;
  leadDetail: LeadDetailDeps;
  leadBootstrapPreview: LeadBootstrapPreviewDeps;
  saleQueries: SaleQueryDeps;
  sourcingPolicy: SourcingPolicyDeps;
};

export function createPipelineFeatureDeps(
  executor: DatabaseExecutor,
): PipelineDeps {
  const leads = createLeadRepo(executor);
  const leadQueries = createLeadQueries(executor);
  const leadAssignments = createAssignmentRepo(executor);
  const leadCommercialInputs = createCommercialInputRepo(executor);
  const leadHistory = createHistoryRepo(executor);
  const leadQuotations = createQuotationRepo(executor);
  const leadSales = createSaleRepo(executor);
  const sourceStatuses = createSourceStatusRepo(executor);
  const sourcingPolicies = createSourcingPolicyRepo(executor);
  const users = createPipelineUsersRepo(executor);
  const engineGateway = createEngineGateway();

  return {
    registerLead: { leads, leadAssignments, leadHistory, users },
    reassignLead: { leads, leadAssignments, leadHistory, users },
    leadInteractions: { leads, leadHistory },
    reviewLead: { leads, leadHistory },
    completeCommercialInput: {
      leads,
      leadCommercialInputs,
      leadHistory,
    },
    createQuotation: { leads, leadHistory, leadQuotations },
    approveForSale: { leads, leadHistory },
    createSale: { leads, leadHistory, leadSales },
    leadList: { leads: leadQueries },
    leadDetail: {
      leads,
      leadCommercialInputs,
      leadHistory,
      leadQuotations,
      leadSales,
      sourceStatuses,
      users,
    },
    leadBootstrapPreview: { leads, engineGateway },
    saleQueries: { leadSales },
    sourcingPolicy: { sourcingPolicies },
  };
}
