import { db } from "~/lib/db/client";
import { createRepositories } from "~/server/shared/registry";
import { createQuotaService } from "~/server/quota/service";
import { createLeadAssignmentService } from "~/server/leads/service";
import { createSalesWorkflowService } from "~/server/sales/service";

const repos = createRepositories(db);

export const quotaService = createQuotaService(repos);
export const leadService = createLeadAssignmentService(repos);
export const salesService = createSalesWorkflowService(repos);

export { repos };
