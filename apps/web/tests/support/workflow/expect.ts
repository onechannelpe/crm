import type { TestRuntime } from "@tests/support/runtime/app";

export async function expectLeadMetadata(
  runtime: TestRuntime,
  input: { leadId: string; updatedBy: number; minUpdatedAt?: number },
): Promise<void> {
  const row = await runtime.ctx.db
    .selectFrom("workflow_leads")
    .select(["updated_by", "updated_at"])
    .where("id", "=", input.leadId)
    .executeTakeFirstOrThrow();

  if (row.updated_by !== input.updatedBy) {
    throw new Error(
      `expected updated_by=${input.updatedBy} got ${String(row.updated_by)}`,
    );
  }
  if (
    input.minUpdatedAt !== undefined &&
    row.updated_at <= input.minUpdatedAt
  ) {
    throw new Error(
      `expected updated_at > ${input.minUpdatedAt} got ${String(row.updated_at)}`,
    );
  }
}

export async function expectLeadAssignment(
  runtime: TestRuntime,
  input: { leadId: string; executiveId: number; updatedBy: number },
): Promise<void> {
  const row = await runtime.ctx.db
    .selectFrom("workflow_leads")
    .select(["executive_id", "updated_by"])
    .where("id", "=", input.leadId)
    .executeTakeFirstOrThrow();

  if (row.executive_id !== input.executiveId) {
    throw new Error(
      `expected executive_id=${input.executiveId} got ${String(row.executive_id)}`,
    );
  }
  if (row.updated_by !== input.updatedBy) {
    throw new Error(
      `expected updated_by=${input.updatedBy} got ${String(row.updated_by)}`,
    );
  }
}

export async function expectLeadStatus(
  runtime: TestRuntime,
  input: { leadId: string; updatedBy: number; status: string },
): Promise<void> {
  const row = await runtime.ctx.db
    .selectFrom("workflow_leads")
    .select(["updated_by", "status"])
    .where("id", "=", input.leadId)
    .executeTakeFirstOrThrow();

  if (row.updated_by !== input.updatedBy) {
    throw new Error(
      `expected updated_by=${input.updatedBy} got ${String(row.updated_by)}`,
    );
  }
  if (row.status !== input.status) {
    throw new Error(
      `expected status=${input.status} got ${String(row.status)}`,
    );
  }
}
