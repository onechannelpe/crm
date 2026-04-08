import { db } from "~/lib/db/db";

import type { DatabaseExecutor } from "../../shared/db-executor";
import type { LeadInteractionDeps } from "../application/deps/lead-interactions";
import type {
  LeadBootstrapPreviewDeps,
  LeadDetailDeps,
  LeadListDeps,
  SaleQueryDeps,
} from "../application/deps/lead-queries";
import type {
  ApproveForSaleDeps,
  CreateQuotationDeps,
} from "../application/deps/quotations";
import type { RegisterLeadDeps } from "../application/deps/register-lead";
import type { ReviewLeadDeps } from "../application/deps/review-lead";
import type {
  CompleteCommercialInputDeps,
  CreateSaleDeps,
} from "../application/deps/sales";
import type { SourcingPolicyDeps } from "../application/deps/sourcing-policy";
import { createAssignmentRepo } from "./assignment-repo";
import { createCommercialInputRepo } from "./commercial-input-repo";
import { createEngineGateway } from "./engine-gateway";
import { createHistoryRepo } from "./history-repo";
import { createLeadRepo } from "./lead-repo";
import { createQuotationRepo } from "./quotation-repo";
import { createSaleRepo } from "./sale-repo";
import { createSourceStatusRepo } from "./source-status-repo";
import { createSourcingPolicyRepo } from "./sourcing-policy-repo";
import { createPipelineUsersRepo } from "./users-repo";

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

export function createPipelineDeps(
  executor: DatabaseExecutor = db,
): PipelineDeps {
  const leads = createLeadRepo(executor);
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
    leadList: { leads },
    leadDetail: {
      leads,
      leadCommercialInputs,
      leadHistory,
      leadQuotations,
      leadSales,
      sourceStatuses,
    },
    leadBootstrapPreview: { leads, engineGateway },
    saleQueries: { leadSales },
    sourcingPolicy: { sourcingPolicies },
  };
}
