import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import type { OrganizationId, UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

export interface AssignOrganizationOwnerInput {
  organizationId: OrganizationId;
  executiveId: UserId;
  assignedBy: UserId;
  at: Date;
  reason?: string | null;
}

export async function assignOrganizationOwner(
  db: DatabaseExecutor,
  input: AssignOrganizationOwnerInput,
): Promise<Result<void, DomainError>> {
  if (db.isTransaction) {
    return assignInTransaction(db, input);
  }

  return db.transaction().execute((trx) => assignInTransaction(trx, input));
}

async function assignInTransaction(
  tx: DatabaseExecutor,
  input: AssignOrganizationOwnerInput,
): Promise<Result<void, DomainError>> {
  const organization = await tx
    .selectFrom("organizations")
    .select("id")
    .where("id", "=", input.organizationId)
    .forUpdate()
    .executeTakeFirst();

  if (!organization) {
    return Err(fail("lead_organization_not_found"));
  }

  const current = await tx
    .selectFrom("organization_owner_assignments")
    .select(["id", "executive_id", "valid_from"])
    .where("organization_id", "=", input.organizationId)
    .where("valid_until", "is", null)
    .forUpdate()
    .executeTakeFirst();

  if (current?.executive_id === input.executiveId) {
    return Ok(undefined);
  }
  if (current && input.at <= current.valid_from) {
    return Err(fail("organization_assignment_time_invalid"));
  }

  if (current) {
    await tx
      .updateTable("organization_owner_assignments")
      .set({ valid_until: input.at })
      .where("id", "=", current.id)
      .execute();
  }

  await tx
    .insertInto("organization_owner_assignments")
    .values({
      organization_id: input.organizationId,
      executive_id: input.executiveId,
      valid_from: input.at,
      valid_until: null,
      assigned_by: input.assignedBy,
      reason: input.reason ?? null,
      created_at: input.at,
    })
    .execute();

  return Ok(undefined);
}
