import type { TestRuntime } from "./runtime/create-test-runtime";

type OrganizationSeed = {
  id?: number;
  ruc: string;
  name: string;
  createdAt?: number;
};

type LeadSeed = {
  id: string;
  organizationId: number;
  executiveId: number;
  stage:
    | "PENDING_EXTERNAL_REVIEW"
    | "REJECTED_BY_STATUS"
    | "NEEDS_EXECUTIVE_INPUT"
    | "READY_FOR_QUOTATION"
    | "QUOTED"
    | "READY_FOR_SALE"
    | "CONVERTED";
  status: "DISPONIBLE" | "SIN RESULTADO" | "CARTERIZADO" | "STOCK" | null;
  prioridad: "P1" | "P2" | "SIN RESULTADO" | null;
  createdBy?: number;
  updatedBy?: number | null;
  createdAt?: number;
  updatedAt?: number;
};

type UserSeed = {
  id: number;
  username: string;
  email: string;
  names: string;
  firstSurname: string;
  secondSurname: string;
  role: "admin" | "executive";
  branchId?: number;
  phoneE164?: string;
  createdAt?: number;
};

export async function seedOrganization(
  runtime: TestRuntime,
  input: OrganizationSeed,
): Promise<number> {
  const createdAt = input.createdAt ?? runtime.now.get();
  await runtime.ctx.db
    .insertInto("organizations")
    .values({
      id: input.id,
      ruc: input.ruc,
      name: input.name,
      created_at: createdAt,
    })
    .execute();

  if (input.id !== undefined) {
    return input.id;
  }

  const created = await runtime.ctx.db
    .selectFrom("organizations")
    .select("id")
    .where("ruc", "=", input.ruc)
    .executeTakeFirstOrThrow();
  return created.id;
}

export async function seedLead(runtime: TestRuntime, input: LeadSeed) {
  const createdAt = input.createdAt ?? runtime.now.get();
  const updatedAt = input.updatedAt ?? createdAt;
  await runtime.ctx.db
    .insertInto("workflow_leads")
    .values({
      id: input.id,
      organization_id: input.organizationId,
      executive_id: input.executiveId,
      stage: input.stage,
      status: input.status,
      prioridad: input.prioridad,
      created_by: input.createdBy ?? 1,
      updated_by: input.updatedBy ?? null,
      created_at: createdAt,
      updated_at: updatedAt,
    })
    .execute();
}

export async function seedUser(runtime: TestRuntime, input: UserSeed) {
  const createdAt = input.createdAt ?? runtime.now.get();
  await runtime.ctx.db
    .insertInto("users")
    .values({
      id: input.id,
      branch_id: input.branchId ?? 1,
      team_id: null,
      username: input.username,
      email: input.email,
      password_hash: "hash",
      names: input.names,
      first_surname: input.firstSurname,
      second_surname: input.secondSurname,
      phone_e164: input.phoneE164 ?? "+51990000000",
      onboarding_completed_at: createdAt,
      role: input.role,
      is_active: 1,
      created_at: createdAt,
    })
    .execute();
}

export async function seedImportJob(
  runtime: TestRuntime,
  input: { id: string },
) {
  const now = runtime.now.get();
  await runtime.ctx.db
    .insertInto("workflow_integration_jobs")
    .values({
      id: input.id,
      type: "import_status",
      status: "PROCESSING",
      requested_by_user_id: 5,
      file_path: "inline",
      error_message: null,
      rows_total: null,
      rows_applied: null,
      rows_failed: null,
      results_json: null,
      lease_owner: "test-worker",
      lease_until: now + 30_000,
      attempt_count: 1,
      max_attempts: 3,
      available_at: null,
      created_at: now,
      completed_at: null,
    })
    .execute();
}
