import type { Transaction } from "kysely";

import { fail, type DomainError } from "~/domain/errors";
import type { OrganizationId, UserId } from "~/domain/ids";
import type { Database } from "~/server/platform/database/types";
import { Err, Ok, type Result } from "~/shared/result";

export interface AssignOrganizationOwnerInput {
  organizationId: OrganizationId;
  executiveId: UserId;
  assignedBy: UserId;
  assignedAt: Date;
  reason?: string | null;
}

export async function assignOrganizationOwnerInTransaction(
  tx: Transaction<Database>,
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
  if (current && input.assignedAt <= current.valid_from) {
    return Err(fail("organization_assignment_time_invalid"));
  }

  if (current) {
    await tx
      .updateTable("organization_owner_assignments")
      .set({ valid_until: input.assignedAt })
      .where("id", "=", current.id)
      .execute();
  }

  await tx
    .insertInto("organization_owner_assignments")
    .values({
      organization_id: input.organizationId,
      executive_id: input.executiveId,
      valid_from: input.assignedAt,
      valid_until: null,
      assigned_by: input.assignedBy,
      reason: input.reason ?? null,
      created_at: input.assignedAt,
    })
    .execute();

  return Ok(undefined);
}
