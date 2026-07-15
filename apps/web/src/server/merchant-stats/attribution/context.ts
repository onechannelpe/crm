import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type {
  BranchId,
  OrganizationId,
  UserId,
  WorkflowLeadId,
} from "~/server/shared/ids";

import type { SourceRow } from "../intake/types";
import type { SaleEvidence } from "./ladder";

interface LeadRef {
  leadId: WorkflowLeadId;
  executiveId: UserId;
  createdAt: string;
}

export interface AttributionContext {
  // num_serie -> the lead that fulfilled that exact device.
  leadBySerial: Map<string, LeadRef>;
  orgByRuc: Map<string, OrganizationId>;
  leadByOrg: Map<string, LeadRef>;
  branchByUser: Map<string, BranchId | null>;
}

// Resolves every lookup the ladder needs in batch queries rather than per row.
export async function loadAttributionContext(
  db: DatabaseExecutor,
  rows: readonly SourceRow[],
): Promise<AttributionContext> {
  const rucs = unique(rows.map((row) => row.ruc));
  const serials = unique(
    rows.flatMap((row) => (row.serialNumber ? [row.serialNumber] : [])),
  );

  const [orgByRuc, leadBySerial] = await Promise.all([
    loadOrgsByRuc(db, rucs),
    loadLeadsBySerial(db, serials),
  ]);

  const leadByOrg = await loadLeadsByOrg(db, [...orgByRuc.values()]);

  // Scoped to the executives the evidence actually named. The only users that
  // can win a verdict are the ones holding one of the leads above, so there is
  // no reason to read the users table to answer "which branch".
  const executiveIds = unique([
    ...[...leadBySerial.values()].map((lead) => lead.executiveId),
    ...[...leadByOrg.values()].map((lead) => lead.executiveId),
  ]);
  const branchByUser = await loadBranchByUser(db, executiveIds);

  return { leadBySerial, orgByRuc, leadByOrg, branchByUser };
}

// What the CRM knows about one device, in the shape the ladder reads.
export function saleEvidenceOf(
  ctx: AttributionContext,
  row: SourceRow,
): SaleEvidence {
  const serialLead = row.serialNumber
    ? ctx.leadBySerial.get(row.serialNumber)
    : undefined;
  const org = ctx.orgByRuc.get(row.ruc);
  const rucLead = org ? ctx.leadByOrg.get(org) : undefined;

  return {
    soldAt: row.soldAt,
    culqiUserName: row.culqiUserName,
    serial: serialLead
      ? { userId: serialLead.executiveId, leadId: serialLead.leadId }
      : null,
    rucLead: rucLead
      ? {
          userId: rucLead.executiveId,
          leadId: rucLead.leadId,
          createdAt: rucLead.createdAt,
        }
      : null,
  };
}

export function branchOfUser(
  ctx: AttributionContext,
  userId: UserId,
): BranchId | null {
  return ctx.branchByUser.get(userId) ?? null;
}

async function loadOrgsByRuc(
  db: DatabaseExecutor,
  rucs: readonly string[],
): Promise<Map<string, OrganizationId>> {
  const byRuc = new Map<string, OrganizationId>();
  if (rucs.length === 0) return byRuc;

  const orgs = await db
    .selectFrom("organizations")
    .select(["id", "ruc"])
    .where("ruc", "in", rucs)
    .execute();
  for (const org of orgs) byRuc.set(org.ruc, org.id);
  return byRuc;
}

// The serial rung. AWAITING_SERIALS makes this column mandatory before a
// fulfillment order can advance, so every CRM-fulfilled POS device has one.
async function loadLeadsBySerial(
  db: DatabaseExecutor,
  serials: readonly string[],
): Promise<Map<string, LeadRef>> {
  const bySerial = new Map<string, LeadRef>();
  if (serials.length === 0) return bySerial;

  const units = await db
    .selectFrom("lead_fulfillment_units as unit")
    .innerJoin("lead_fulfillment_orders as ord", "ord.id", "unit.order_id")
    .innerJoin("workflow_leads as lead", "lead.id", "ord.lead_id")
    .select([
      "unit.serial_number",
      "lead.id as lead_id",
      "lead.executive_id",
      "lead.created_at",
    ])
    .where("unit.serial_number", "in", serials)
    .where("lead.deleted_at", "is", null)
    .execute();

  for (const unit of units) {
    if (!unit.serial_number) continue;
    bySerial.set(unit.serial_number, {
      leadId: unit.lead_id,
      executiveId: unit.executive_id,
      createdAt: unit.created_at.toISOString(),
    });
  }
  return bySerial;
}

// idx_workflow_leads_organization is UNIQUE over exactly this predicate, so at
// most one row per organization comes back and the map cannot silently drop a
// competing lead.
async function loadLeadsByOrg(
  db: DatabaseExecutor,
  orgIds: readonly OrganizationId[],
): Promise<Map<string, LeadRef>> {
  const byOrg = new Map<string, LeadRef>();
  if (orgIds.length === 0) return byOrg;

  const leads = await db
    .selectFrom("workflow_leads")
    .select(["id", "organization_id", "executive_id", "created_at"])
    .where("organization_id", "in", orgIds)
    .where("deleted_at", "is", null)
    .where("stage", "!=", "EXPIRED")
    .execute();

  for (const lead of leads) {
    byOrg.set(lead.organization_id, {
      leadId: lead.id,
      executiveId: lead.executive_id,
      createdAt: lead.created_at.toISOString(),
    });
  }
  return byOrg;
}

async function loadBranchByUser(
  db: DatabaseExecutor,
  userIds: readonly UserId[],
): Promise<Map<string, BranchId | null>> {
  const byUser = new Map<string, BranchId | null>();
  if (userIds.length === 0) return byUser;

  const users = await db
    .selectFrom("users")
    .select(["id", "branch_id"])
    .where("id", "in", userIds)
    .execute();
  for (const user of users) byUser.set(user.id, user.branch_id);
  return byUser;
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
