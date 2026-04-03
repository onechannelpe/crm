import { db } from "~/lib/db/db";

import type { DatabaseExecutor } from "../../shared/db-executor";
import type { LeadInteractionDeps } from "../application/deps/lead-interactions";
import type {
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
import { createLeadsRepo } from "./leads-repo";
import { createQuotationRepo } from "./quotation-repo";
import { createSaleRepo } from "./sale-repo";
import { createSourcingPolicyRepo } from "./sourcing-policy-repo";
import { createPipelineUsersRepo } from "./users-repo";

export function createRegisterLeadDeps(
  executor: DatabaseExecutor,
): RegisterLeadDeps {
  return {
    leads: createLeadsRepo(executor),
    leadAssignments: createAssignmentRepo(executor),
    leadHistory: createHistoryRepo(executor),
    users: createPipelineUsersRepo(executor),
  };
}

export function createReassignLeadDeps(
  executor: DatabaseExecutor,
): RegisterLeadDeps {
  return createRegisterLeadDeps(executor);
}

export function createLeadInteractionDeps(
  executor: DatabaseExecutor,
): LeadInteractionDeps {
  return {
    leads: createLeadsRepo(executor),
    leadHistory: createHistoryRepo(executor),
  };
}

export function createReviewLeadDeps(
  executor: DatabaseExecutor,
): ReviewLeadDeps {
  return {
    leads: createLeadsRepo(executor),
    leadHistory: createHistoryRepo(executor),
  };
}

export function createCompleteCommercialInputDeps(
  executor: DatabaseExecutor,
): CompleteCommercialInputDeps {
  return {
    leads: createLeadsRepo(executor),
    leadCommercialInputs: createCommercialInputRepo(executor),
    leadHistory: createHistoryRepo(executor),
  };
}

export function createQuotationDeps(
  executor: DatabaseExecutor,
): CreateQuotationDeps {
  return {
    leads: createLeadsRepo(executor),
    leadHistory: createHistoryRepo(executor),
    leadQuotations: createQuotationRepo(executor),
  };
}

export function createApproveForSaleDeps(
  executor: DatabaseExecutor,
): ApproveForSaleDeps {
  return {
    leads: createLeadsRepo(executor),
    leadHistory: createHistoryRepo(executor),
  };
}

export function createSaleDeps(executor: DatabaseExecutor): CreateSaleDeps {
  return {
    leads: createLeadsRepo(executor),
    leadHistory: createHistoryRepo(executor),
    leadSales: createSaleRepo(executor),
  };
}

export function createLeadListDeps(
  executor: DatabaseExecutor = db,
): LeadListDeps {
  return {
    leads: createLeadsRepo(executor),
  };
}

export function createLeadDetailDeps(
  executor: DatabaseExecutor = db,
): LeadDetailDeps {
  return {
    leads: createLeadsRepo(executor),
    leadCommercialInputs: createCommercialInputRepo(executor),
    leadHistory: createHistoryRepo(executor),
    leadQuotations: createQuotationRepo(executor),
    leadSales: createSaleRepo(executor),
  };
}

export function createSaleQueryDeps(
  executor: DatabaseExecutor = db,
): SaleQueryDeps {
  return {
    leadSales: createSaleRepo(executor),
  };
}

export function createSourcingPolicyDeps(
  executor: DatabaseExecutor = db,
): SourcingPolicyDeps {
  return {
    sourcingPolicies: createSourcingPolicyRepo(executor),
  };
}

export function createPipelineEngineGateway() {
  return createEngineGateway();
}
