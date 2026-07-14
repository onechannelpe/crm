import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type {
  BranchId,
  OrganizationId,
  UserId,
  WorkflowLeadId,
} from "~/server/shared/ids";

import type { MappedGpvRow } from "../intake/contracts";

export interface RowMatch {
  organizationId: OrganizationId | null;
  leadId: WorkflowLeadId | null;
  executiveId: UserId | null;
  branchId: BranchId | null;
}

export interface MatchContext {
  orgByRuc: Map<string, OrganizationId>;
  leadByOrg: Map<string, { leadId: WorkflowLeadId; executiveId: UserId }>;
  branchByExec: Map<string, BranchId>;
  userByName: Map<string, UserId>;
  branchByName: Map<string, BranchId>;
}

// Resolves every lookup the import needs in a handful of batch queries rather
// than per row: RUC -> organization, organization -> active lead (the partial
// unique index guarantees at most one), lead executive -> branch, and the
// name-keyed maps used to attach the file's real seller / zone to CRM records.
export async function loadMatchContext(
  db: DatabaseExecutor,
  rows: readonly MappedGpvRow[],
): Promise<MatchContext> {
  const rucs = unique(rows.map((row) => row.ruc));

  const orgByRuc = new Map<string, OrganizationId>();
  if (rucs.length > 0) {
    const orgs = await db
      .selectFrom("organizations")
      .select(["id", "ruc"])
      .where("ruc", "in", rucs)
      .execute();
    for (const org of orgs) orgByRuc.set(org.ruc, org.id);
  }

  const orgIds = [...orgByRuc.values()];
  const leadByOrg = new Map<
    string,
    { leadId: WorkflowLeadId; executiveId: UserId }
  >();
  if (orgIds.length > 0) {
    const leads = await db
      .selectFrom("workflow_leads")
      .select(["id", "organization_id", "executive_id"])
      .where("organization_id", "in", orgIds)
      .where("deleted_at", "is", null)
      .where("stage", "!=", "EXPIRED")
      .execute();
    for (const lead of leads) {
      leadByOrg.set(lead.organization_id, {
        leadId: lead.id,
        executiveId: lead.executive_id,
      });
    }
  }

  const execIds = unique([...leadByOrg.values()].map((l) => l.executiveId));
  const branchByExec = new Map<string, BranchId>();
  const userByName = new Map<string, UserId>();
  const users = await db
    .selectFrom("users")
    .select(["id", "branch_id", "names", "first_surname", "second_surname"])
    .execute();
  for (const user of users) {
    if (execIds.includes(user.id)) branchByExec.set(user.id, user.branch_id);
    for (const key of nameKeys(user)) {
      // First writer wins so an exact "names + surname" match is not clobbered
      // by a looser one from another user.
      if (!userByName.has(key)) userByName.set(key, user.id);
    }
  }

  const branchByName = new Map<string, BranchId>();
  const branches = await db
    .selectFrom("branches")
    .select(["id", "name"])
    .execute();
  for (const branch of branches) {
    branchByName.set(normalizeName(branch.name), branch.id);
  }

  return { orgByRuc, leadByOrg, branchByExec, userByName, branchByName };
}

export function resolveRowMatch(
  ctx: MatchContext,
  row: MappedGpvRow,
): RowMatch {
  const organizationId = ctx.orgByRuc.get(row.ruc) ?? null;
  const lead = organizationId ? ctx.leadByOrg.get(organizationId) : undefined;
  const executiveId = lead?.executiveId ?? null;
  const branchId = executiveId
    ? (ctx.branchByExec.get(executiveId) ?? null)
    : null;
  return {
    organizationId,
    leadId: lead?.leadId ?? null,
    executiveId,
    branchId,
  };
}

// Free-text "VENDEDOR R" like "PAOLA LOZANO" -> a CRM user, best effort. The
// attach grid lets the business team correct any miss.
export function matchSellerUser(
  ctx: MatchContext,
  realSellerName: string | null,
): UserId | null {
  if (!realSellerName) return null;
  return ctx.userByName.get(normalizeName(realSellerName)) ?? null;
}

export function matchBranch(
  ctx: MatchContext,
  zonal: string | null,
): BranchId | null {
  if (!zonal) return null;
  return ctx.branchByName.get(normalizeName(zonal)) ?? null;
}

function nameKeys(user: {
  names: string;
  first_surname: string;
  second_surname: string;
}): string[] {
  const full = normalizeName(
    `${user.names} ${user.first_surname} ${user.second_surname}`,
  );
  const short = normalizeName(`${user.names} ${user.first_surname}`);
  return short === full ? [short] : [short, full];
}

export function normalizeName(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
