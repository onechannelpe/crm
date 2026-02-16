import { db } from "~/lib/db/db";
import { createLeadAssignmentService } from "~/server/leads/service";
import { createQuotaService } from "~/server/quota/service";
import { createSalesWorkflowService } from "~/server/sales/service";
import { createRepositories } from "~/server/shared/registry";

const repos = createRepositories(db);

export const quotaService = createQuotaService(repos);
export const leadService = createLeadAssignmentService(repos);
export const salesService = createSalesWorkflowService(repos);

export { repos };
