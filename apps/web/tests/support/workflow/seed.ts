import { randomUUIDv7 } from "bun";

import {
  SETTLEMENT_BANKS,
  type SettlementBank,
} from "~/contracts/workflow/vocabulary";

import type { TestRuntime } from "../runtime/app";

type OrganizationSeed = {
  key: string;
  id?: string;
  ruc?: string;
  legalName?: string | null;
  giroNegocio?: string | null;
  createdAt?: number;
};

export type SeededOrganizationRef = {
  id: string;
  ruc: string;
  legalName: string | null;
};

export type LeadCommercialSeed = {
  currentProvider?: string;
  currentDebitRate?: number;
  currentCreditRate?: number;
  gpv?: number;
  ticket?: number;
  settlementBank?: SettlementBank;
  posCount?: number;
};

type LeadSeed = {
  id: string;
  organizationId?: string;
  organization?: SeededOrganizationRef;
  executiveId: number;
  stage: "QUALIFYING" | "DISQUALIFIED" | "PRICING" | "SETUP" | "LIVE";
  status: "DISPONIBLE" | "SIN RESULTADO" | "CARTERIZADO" | "STOCK" | null;
  priority: "P1" | "P2" | "SIN RESULTADO" | null;
  createdBy?: number;
  updatedBy?: number | null;
  createdAt?: number;
  updatedAt?: number;
  commercial?: LeadCommercialSeed;
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
  createdAt?: number;
};

export async function seedOrganization(
  runtime: TestRuntime,
  input: OrganizationSeed,
): Promise<SeededOrganizationRef> {
  const createdAt = input.createdAt ?? runtime.now.get();
  const id = input.id ?? randomUUIDv7();
  const key = input.key?.trim();
  if (!key) {
    throw new Error("missing_seed_organization_key");
  }
  const ruc = input.ruc ?? buildDefaultRuc(key);
  const legalName =
    input.legalName === undefined ? `Org ${key}` : input.legalName;
  await runtime.ctx.db
    .insertInto("organizations")
    .values({
      id,
      ruc,
      legal_name: legalName,
      giro_negocio: input.giroNegocio ?? null,
      created_at: createdAt,
    })
    .execute();

  return { id, ruc, legalName };
}

export async function seedLead(runtime: TestRuntime, input: LeadSeed) {
  const createdAt = input.createdAt ?? runtime.now.get();
  const updatedAt = input.updatedAt ?? createdAt;
  const organizationId = resolveLeadOrganizationId(input);
  const commercial = resolveLeadCommercialSeed(input.commercial);
  await runtime.ctx.db
    .insertInto("workflow_leads")
    .values({
      id: input.id,
      organization_id: organizationId,
      executive_id: input.executiveId,
      stage: input.stage,
      status: input.status,
      priority: input.priority,
      created_by: input.createdBy ?? 1,
      updated_by: input.updatedBy ?? null,
      created_at: createdAt,
      updated_at: updatedAt,
      current_provider: commercial.currentProvider,
      current_debit_rate: commercial.currentDebitRate,
      current_credit_rate: commercial.currentCreditRate,
      gpv: commercial.gpv,
      ticket: commercial.ticket,
      settlement_bank: commercial.settlementBank,
      pos_count: commercial.posCount,
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
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 131 + key.charCodeAt(index)) % 1_000_000_000;
  }
  const digits = String(hash).padStart(9, "0");
  return `20${digits}`;
}

function resolveLeadCommercialSeed(input: LeadCommercialSeed | undefined) {
  return {
    currentProvider: input?.currentProvider ?? "Niubiz",
    currentDebitRate: input?.currentDebitRate ?? 3.5,
    currentCreditRate: input?.currentCreditRate ?? 4,
    gpv: input?.gpv ?? 50_000,
    ticket: input?.ticket ?? 120,
    settlementBank: input?.settlementBank ?? SETTLEMENT_BANKS[0],
    posCount: input?.posCount ?? 2,
  };
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
