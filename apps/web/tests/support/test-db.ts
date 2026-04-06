import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

import type { Kysely } from "kysely";

import type { SessionData } from "../../src/lib/auth/access/session";
import { createDb } from "../../src/lib/db/client";
import { computeHash, writeStoredHash } from "../../src/lib/db/migration-hash";
import { SCHEMA_MODULES, SEED_MODULES } from "../../src/lib/db/schema";
import type { Database } from "../../src/lib/db/types";
import { confirmRecord } from "../../src/server/sales-records/application/commands/confirm-record";
import { createDraft } from "../../src/server/sales-records/application/commands/create-draft";
import { registerAttempt } from "../../src/server/sales-records/application/commands/register-attempt";
import { rejectRecord } from "../../src/server/sales-records/application/commands/reject-record";
import type { SalesRecordRateLimitedMutationDeps } from "../../src/server/sales-records/application/commands/shared";
import { submitRecord } from "../../src/server/sales-records/application/commands/submit-draft";
import type {
  CreateSalesRecordDraftInput,
  RegisterSalesRecordAttemptInput,
  UpdateSalesRecordDraftInput,
} from "../../src/server/sales-records/application/commands/types/draft-input";
import { updateDraft } from "../../src/server/sales-records/application/commands/update-draft";
import { createActionRateLimitsRepo } from "../../src/server/security/repos-action-rate-limits";
import type { AppContext } from "../../src/server/shared/action-runtime";
import type { DomainError } from "../../src/server/shared/domain-error";
import type { Result } from "../../src/server/shared/result";
import {
  createTestRepositories,
  type TestRepositories,
} from "./test-repositories";

const ARTIFACT_DIR = join(process.cwd(), ".vitest-db");

type TestSalesRecordCreateDraftInput = CreateSalesRecordDraftInput & {
  executiveUserId: number;
  branchId: number;
};

type TestSalesRecordCommands = {
  createDraft(
    input: TestSalesRecordCreateDraftInput,
  ): Promise<Result<number, DomainError>>;
  submit(
    recordId: number,
    executiveUserId: number,
  ): Promise<Result<void, DomainError>>;
  confirm(
    recordId: number,
    reviewerUserId: number,
    reviewerBranchId: number,
    bypassBranchScope: boolean,
  ): Promise<Result<void, DomainError>>;
  reject(
    recordId: number,
    reviewerUserId: number,
    reviewerBranchId: number,
    bypassBranchScope: boolean,
    reason: string,
  ): Promise<Result<void, DomainError>>;
  updateDraft(
    recordId: number,
    executiveUserId: number,
    input: UpdateSalesRecordDraftInput,
    correctionNotes?: string | null,
  ): Promise<Result<void, DomainError>>;
  registerAttempt(
    recordId: number,
    reviewerUserId: number,
    reviewerBranchId: number,
    bypassBranchScope: boolean,
    outcome: RegisterSalesRecordAttemptInput["outcome"],
    notes: string | null,
    nextAttemptAt: number | null,
  ): Promise<Result<void, DomainError>>;
};

function createTestAppContext(input: {
  userId: number;
  role: SessionData["role"];
  branchId: number;
}): AppContext {
  return {
    actor: {
      sessionId: `test-session-${input.userId}`,
      userId: input.userId,
      role: input.role,
      branchId: input.branchId,
      onboardingCompleted: true,
      sessionClass: "app",
      primaryAuthMethod: "password",
      strongAuthMethod: null,
      strongAuthAt: null,
    },
    requestId: "test-request",
    traceId: "test-trace",
    ipAddress: "127.0.0.1",
    userAgent: null,
    publicOrigin: "http://localhost",
    now: Date.now,
  };
}

function createTestSalesRecordCommands(
  deps: SalesRecordRateLimitedMutationDeps,
): TestSalesRecordCommands {
  return {
    async createDraft(input) {
      const result = await createDraft(
        createTestAppContext({
          userId: input.executiveUserId,
          role: "executive",
          branchId: input.branchId,
        }),
        deps,
        input,
      );
      if (!result.ok) {
        return result;
      }
      return { ok: true, value: result.value.id };
    },

    async submit(recordId, executiveUserId) {
      const result = await submitRecord(
        createTestAppContext({
          userId: executiveUserId,
          role: "executive",
          branchId: 1,
        }),
        deps,
        { recordId },
      );
      if (!result.ok) {
        return result;
      }
      return { ok: true, value: undefined };
    },

    async confirm(
      recordId,
      reviewerUserId,
      reviewerBranchId,
      bypassBranchScope,
    ) {
      const result = await confirmRecord(
        createTestAppContext({
          userId: reviewerUserId,
          role: bypassBranchScope ? "superuser" : "back_office",
          branchId: reviewerBranchId,
        }),
        deps,
        { recordId },
      );
      if (!result.ok) {
        return result;
      }
      return { ok: true, value: undefined };
    },

    async reject(
      recordId,
      reviewerUserId,
      reviewerBranchId,
      bypassBranchScope,
      reason,
    ) {
      const result = await rejectRecord(
        createTestAppContext({
          userId: reviewerUserId,
          role: bypassBranchScope ? "superuser" : "back_office",
          branchId: reviewerBranchId,
        }),
        deps,
        { recordId, reason },
      );
      if (!result.ok) {
        return result;
      }
      return { ok: true, value: undefined };
    },

    async updateDraft(
      recordId,
      executiveUserId,
      input,
      correctionNotes = null,
    ) {
      const result = await updateDraft(
        createTestAppContext({
          userId: executiveUserId,
          role: "executive",
          branchId: 1,
        }),
        deps,
        { recordId, draft: input, correctionNotes },
      );
      if (!result.ok) {
        return result;
      }
      return { ok: true, value: undefined };
    },

    async registerAttempt(
      recordId,
      reviewerUserId,
      reviewerBranchId,
      bypassBranchScope,
      outcome,
      notes,
      nextAttemptAt,
    ) {
      const result = await registerAttempt(
        createTestAppContext({
          userId: reviewerUserId,
          role: bypassBranchScope ? "superuser" : "back_office",
          branchId: reviewerBranchId,
        }),
        deps,
        { recordId, outcome, notes, nextAttemptAt },
      );
      if (!result.ok) {
        return result;
      }
      return { ok: true, value: undefined };
    },
  };
}

async function seedTemplate(db: Kysely<Database>) {
  const now = Date.now();

  await db
    .insertInto("branches")
    .values([
      { id: 1, name: "Lima", created_at: now },
      { id: 2, name: "Norte", created_at: now },
    ])
    .execute();

  await db
    .insertInto("users")
    .values([
      {
        id: 1,
        branch_id: 1,
        team_id: null,
        username: "exec.one",
        email: "exec1@test.local",
        password_hash: "hash",
        names: "Exec",
        first_surname: "One",
        second_surname: "Alpha",
        phone_e164: "+51990000001",
        onboarding_completed_at: now,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        id: 2,
        branch_id: 1,
        team_id: null,
        username: "back.one",
        email: "back1@test.local",
        password_hash: "hash",
        names: "Back",
        first_surname: "One",
        second_surname: "Alpha",
        phone_e164: "+51990000002",
        onboarding_completed_at: now,
        role: "back_office",
        is_active: 1,
        created_at: now,
      },
      {
        id: 3,
        branch_id: 2,
        team_id: null,
        username: "exec.two",
        email: "exec2@test.local",
        password_hash: "hash",
        names: "Exec",
        first_surname: "Two",
        second_surname: "Beta",
        phone_e164: "+51990000003",
        onboarding_completed_at: now,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        id: 4,
        branch_id: 2,
        team_id: null,
        username: "back.two",
        email: "back2@test.local",
        password_hash: "hash",
        names: "Back",
        first_surname: "Two",
        second_surname: "Beta",
        phone_e164: "+51990000004",
        onboarding_completed_at: now,
        role: "back_office",
        is_active: 1,
        created_at: now,
      },
      {
        id: 5,
        branch_id: 2,
        team_id: null,
        username: "super.user",
        email: "super@test.local",
        password_hash: "hash",
        names: "Super",
        first_surname: "User",
        second_surname: "Gamma",
        phone_e164: "+51990000005",
        onboarding_completed_at: now,
        role: "superuser",
        is_active: 1,
        created_at: now,
      },
    ])
    .execute();

  await db
    .insertInto("organizations")
    .values([
      {
        id: 1,
        ruc: "20100000001",
        name: "Org Lima",
        created_at: now,
        locked_branch_id: null,
        locked_at: null,
        locked_by_user_id: null,
      },
      {
        id: 2,
        ruc: "20100000002",
        name: "Org Norte",
        created_at: now,
        locked_branch_id: null,
        locked_at: null,
        locked_by_user_id: null,
      },
    ])
    .execute();

  await db
    .insertInto("contacts")
    .values([
      {
        id: 1,
        organization_id: 1,
        dni: "70000001",
        name: "Contacto Lima",
        phone_primary: "+51999999111",
        phone_secondary: null,
        last_contacted_at: null,
        last_contacted_by_user_id: null,
        cooldown_until: null,
        created_at: now,
      },
      {
        id: 2,
        organization_id: 2,
        dni: "70000002",
        name: "Contacto Norte",
        phone_primary: "+51999999222",
        phone_secondary: null,
        last_contacted_at: null,
        last_contacted_by_user_id: null,
        cooldown_until: null,
        created_at: now,
      },
    ])
    .execute();

  await db
    .insertInto("products")
    .values({
      id: 1,
      name: "Plan Test",
      category: "mobile",
      subtype: "mono",
      price: 10,
      is_active: 1,
    })
    .execute();
}

export interface TestDbContext {
  dbPath: string;
  storageRoot: string;
  db: Kysely<Database>;
  repos: TestRepositories;
  salesRecords: TestSalesRecordCommands;
}

export async function createIsolatedTestDb(
  prefix: string,
): Promise<TestDbContext> {
  await mkdir(ARTIFACT_DIR, { recursive: true });

  const dbPath = join(
    ARTIFACT_DIR,
    `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}.db`,
  );
  const storageRoot = join(
    ARTIFACT_DIR,
    `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}-files`,
  );
  const db = createDb(dbPath);

  for (const module of SCHEMA_MODULES) {
    // eslint-disable-next-line no-await-in-loop
    await module.createTables(db);
  }
  for (const module of SEED_MODULES) {
    // eslint-disable-next-line no-await-in-loop
    await module.run(db);
  }

  const hash = await computeHash(SCHEMA_MODULES, SEED_MODULES);
  await writeStoredHash(db, hash);

  await seedTemplate(db);
  const repos = createTestRepositories(db);
  const mutationDeps: SalesRecordRateLimitedMutationDeps = {
    rateLimitDeps: {
      actionRateLimits: createActionRateLimitsRepo(db),
      auditLogs: repos.auditLogs,
    },
    repos,
    runInTransaction: async <T>(
      operation: (activeRepos: typeof repos) => Promise<T>,
    ): Promise<T> =>
      db
        .transaction()
        .execute((transactionDb) =>
          operation(createTestRepositories(transactionDb)),
        ),
  };
  const salesRecords = createTestSalesRecordCommands(mutationDeps);

  return {
    dbPath,
    storageRoot,
    db,
    repos,
    salesRecords,
  };
}

export async function cleanupTestDb(ctx: TestDbContext): Promise<void> {
  await ctx.db.destroy();

  try {
    await rm(ctx.dbPath, { force: true });
    await rm(ctx.storageRoot, { force: true, recursive: true });
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "EBUSY"
    ) {
      throw error;
    }
  }
}
