import type { Kysely } from "kysely";

import type { Database } from "../../../types";
import type { CompiledLead } from "../compiler";
import type { OrganizationsByRuc } from "./organizations";

export async function persistWorkflowLeadsAndAssignments(
  db: Kysely<Database>,
  now: number,
  day: number,
  orgIdByRuc: OrganizationsByRuc,
  leads: readonly CompiledLead[],
): Promise<void> {
  await db
    .insertInto("workflow_leads")
    .values(leads.map((lead) => leadRow(lead, now, day, orgIdByRuc)))
    .execute();

  await db
    .insertInto("workflow_lead_assignments")
    .values(
      leads.map((lead) => ({
        id: lead.assignmentId,
        lead_id: lead.leadId,
        executive_id: lead.spec.executiveId,
        assigned_by: lead.spec.createdBy,
        is_active: true,
        assigned_at: new Date(now - lead.spec.createdOffsetDays * day),
      })),
    )
    .execute();
}

function leadRow(
  lead: CompiledLead,
  now: number,
  day: number,
  orgIdByRuc: OrganizationsByRuc,
) {
  const { spec } = lead;
  const organizationId = orgIdByRuc.get(spec.org.ruc);
  if (!organizationId) {
    throw new Error(`missing_seed_organization_id:${spec.org.ruc}`);
  }
  return {
    id: lead.leadId,
    organization_id: organizationId,
    executive_id: spec.executiveId,
    stage: lead.projection.stage,
    status: lead.projection.status,
    priority: lead.projection.priority,
    created_by: spec.createdBy,
    updated_by: spec.updatedBy,
    created_at: new Date(now - spec.createdOffsetDays * day),
    updated_at: new Date(now - lead.projection.updatedOffsetDays * day),
    reservation_expires_at:
      spec.reservationOffsetDays === undefined
        ? null
        : new Date(now + spec.reservationOffsetDays * day),
    current_provider: spec.current.provider,
    current_debit_rate: spec.current.debitRate,
    current_credit_rate: spec.current.creditRate,
    gpv: spec.current.gpv,
    ticket: spec.current.ticket,
    settlement_bank: spec.current.settlementBank,
    pos_count: spec.current.posCount,
  };
}
