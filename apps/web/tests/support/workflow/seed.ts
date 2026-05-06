import { randomUUIDv7 } from "bun";

import type { TestRuntime } from "../runtime/app";

type OrganizationSeed = {
  key: string;
  id?: string;
  ruc?: string;
  name?: string;
  createdAt?: number;
};

export type SeededOrganizationRef = {
  id: string;
  ruc: string;
  name: string;
};

type LeadSeed = {
  id: string;
  organizationId?: string;
  organization?: SeededOrganizationRef;
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

type LeadScenarioSeed = {
  organization: OrganizationSeed;
  lead: Omit<LeadSeed, "organization" | "organizationId">;
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
): Promise<SeededOrganizationRef> {
  const createdAt = input.createdAt ?? runtime.now.get();
  const id = input.id ?? randomUUIDv7();
  const key = input.key.trim();
  if (!key) {
    throw new Error("missing_seed_organization_ruc");
  }
  const ruc = input.ruc ?? buildDefaultRuc(key);
  const name = input.name ?? buildDefaultOrganizationName(key);
  await runtime.ctx.db
    .insertInto("organizations")
    .values({
      id,
      ruc,
      name,
      created_at: createdAt,
    })
    .execute();

  return { id, ruc, name };
}

export async function seedLead(runtime: TestRuntime, input: LeadSeed) {
  const createdAt = input.createdAt ?? runtime.now.get();
  const updatedAt = input.updatedAt ?? createdAt;
  const organizationId = resolveLeadOrganizationId(input);
  await runtime.ctx.db
    .insertInto("workflow_leads")
    .values({
      id: input.id,
      organization_id: organizationId,
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

export async function seedLeadScenario(
  runtime: TestRuntime,
  input: LeadScenarioSeed,
): Promise<{ organization: SeededOrganizationRef; leadId: string }> {
  const organization = await seedOrganization(runtime, input.organization);
  await seedLead(runtime, {
    ...input.lead,
    organization,
  });
  return { organization, leadId: input.lead.id };
}

function resolveLeadOrganizationId(input: LeadSeed): string {
  if (input.organization) {
    return input.organization.id;
  }
  if (input.organizationId) {
    return input.organizationId;
  }
  throw new Error("missing_seed_lead_organization");
}

function buildDefaultRuc(key: string): string {
  if (!key) {
    throw new Error("missing_seed_organization_ruc");
  }
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 131 + key.charCodeAt(index)) % 1_000_000_000;
  }
  const digits = String(hash).padStart(9, "0");
  return `20${digits}`;
}

function buildDefaultOrganizationName(key: string): string {
  if (!key) {
    throw new Error("missing_seed_organization_ruc");
  }
  return `Org ${key}`;
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
