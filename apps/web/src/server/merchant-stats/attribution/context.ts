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
  leadBySerial: Map<string, LeadRef>;
  orgByRuc: Map<string, OrganizationId>;
  leadByOrg: Map<string, LeadRef>;
  branchByUser: Map<string, BranchId | null>;
}

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
  const executiveIds = unique([
    ...[...leadBySerial.values()].map((lead) => lead.executiveId),
    ...[...leadByOrg.values()].map((lead) => lead.executiveId),
  ]);
  const branchByUser = await loadBranchByUser(db, executiveIds);

  return {
    leadBySerial,
    orgByRuc,
    leadByOrg,
    branchByUser,
  };
}

export function saleEvidenceOf(
  ctx: AttributionContext,
  row: SourceRow,
): SaleEvidence {
  const serialLead = row.serialNumber
    ? ctx.leadBySerial.get(row.serialNumber)
    : undefined;

  const organizationId = ctx.orgByRuc.get(row.ruc);
  const rucLead = organizationId
    ? ctx.leadByOrg.get(organizationId)
    : undefined;

  return {
    soldAt: row.soldAt,
    culqiUserName: row.culqiUserName,
    serial: serialLead
      ? {
          userId: serialLead.executiveId,
          leadId: serialLead.leadId,
        }
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
  const orgByRuc = new Map<string, OrganizationId>();

  if (rucs.length === 0) {
    return orgByRuc;
  }

  const organizations = await db
    .selectFrom("organizations")
    .select(["id", "ruc"])
    .where("ruc", "in", rucs)
    .execute();

  for (const organization of organizations) {
    orgByRuc.set(organization.ruc, organization.id);
  }

  return orgByRuc;
}

async function loadLeadsBySerial(
  db: DatabaseExecutor,
  serials: readonly string[],
): Promise<Map<string, LeadRef>> {
  const leadBySerial = new Map<string, LeadRef>();

  if (serials.length === 0) {
    return leadBySerial;
  }

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
    if (!unit.serial_number) {
      continue;
    }

    leadBySerial.set(unit.serial_number, {
      leadId: unit.lead_id,
      executiveId: unit.executive_id,
      createdAt: unit.created_at.toISOString(),
    });
  }

  return leadBySerial;
}

async function loadLeadsByOrg(
  db: DatabaseExecutor,
  organizationIds: readonly OrganizationId[],
): Promise<Map<OrganizationId, LeadRef>> {
  const leadByOrg = new Map<OrganizationId, LeadRef>();

  if (organizationIds.length === 0) {
    return leadByOrg;
  }

  const leads = await db
    .selectFrom("workflow_leads")
    .select(["id", "organization_id", "executive_id", "created_at"])
    .where("organization_id", "in", organizationIds)
    .where("deleted_at", "is", null)
    .where("stage", "!=", "EXPIRED")
    .execute();

  for (const lead of leads) {
    leadByOrg.set(lead.organization_id, {
      leadId: lead.id,
      executiveId: lead.executive_id,
      createdAt: lead.created_at.toISOString(),
    });
  }

  return leadByOrg;
}

async function loadBranchByUser(
  db: DatabaseExecutor,
  userIds: readonly UserId[],
): Promise<Map<UserId, BranchId | null>> {
  const branchByUser = new Map<UserId, BranchId | null>();

  if (userIds.length === 0) {
    return branchByUser;
  }

  const users = await db
    .selectFrom("users")
    .select(["id", "branch_id"])
    .where("id", "in", userIds)
    .execute();

  for (const user of users) {
    branchByUser.set(user.id, user.branch_id);
  }

  return branchByUser;
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
