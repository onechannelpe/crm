import type {
  FulfillmentQueueRowView,
  FulfillmentQueueView,
} from "~/contracts/workflow/views";
import type { FulfillmentStep } from "~/contracts/workflow/vocabulary";
import { hasPermission, type Role } from "~/lib/auth/access/rbac";
import { shortName } from "~/lib/users/display-name";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { forbidden, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import {
  backOfficeQueueSteps,
  pendingOwnerForStep,
  supervisorQueueSteps,
} from "~/server/workflow/lead/fulfillment/steps";

// Back office sees everything pending an internal action; supervisor sees only
// the transactions-report step they own. Both are scoped to their branch.
function queueStepsForRole(role: Role): FulfillmentStep[] | null {
  if (hasPermission(role, "fulfillment:manage")) return backOfficeQueueSteps();
  if (hasPermission(role, "fulfillment:report:upload")) {
    return supervisorQueueSteps();
  }
  return null;
}

export async function listFulfillmentQueue(
  db: DatabaseExecutor,
  input: { actorRole: Role; actorBranchId: number },
): Promise<Result<FulfillmentQueueView, DomainError>> {
  const steps = queueStepsForRole(input.actorRole);
  if (steps === null) return Err(forbidden());
  if (steps.length === 0) return Ok({ rows: [] });

  const rows = await db
    .selectFrom("lead_fulfillment_orders as order")
    .innerJoin("workflow_leads as lead", "lead.id", "order.lead_id")
    .innerJoin("organizations as org", "org.id", "lead.organization_id")
    .innerJoin("users as executive", "executive.id", "lead.executive_id")
    .select([
      "order.lead_id as leadId",
      "order.current_step as currentStep",
      "order.product_kind as productKind",
      "order.updated_at as waitingSince",
      "org.ruc as ruc",
      "org.legal_name as legalName",
      "executive.names as names",
      "executive.first_surname as firstSurname",
      "executive.second_surname as secondSurname",
    ])
    .where("lead.stage", "=", "FULFILLMENT")
    .where("lead.deleted_at", "is", null)
    .where("executive.branch_id", "=", input.actorBranchId)
    .where("order.current_step", "in", steps)
    .orderBy("order.updated_at", "asc")
    .execute();

  return Ok({
    rows: rows.map(
      (row): FulfillmentQueueRowView => ({
        leadId: row.leadId,
        ruc: row.ruc,
        legalName: row.legalName,
        executiveName: shortName({
          names: row.names,
          first_surname: row.firstSurname,
          second_surname: row.secondSurname,
        }),
        productKind: row.productKind,
        currentStep: row.currentStep,
        pendingOwner: pendingOwnerForStep(row.currentStep),
        waitingSince: row.waitingSince,
      }),
    ),
  });
}
