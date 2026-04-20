import { copyFile, mkdir, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";

import { sql, type Kysely } from "kysely";

import type { Role } from "../../src/lib/auth/access/rbac";
import { createDb } from "../../src/lib/db/client";
import { migrateToLatest } from "../../src/lib/db/migrate";
import type { Database } from "../../src/lib/db/types";
import { confirmRecord } from "../../src/server/sales-records/application/commands/confirm-record";
import { createDraft } from "../../src/server/sales-records/application/commands/create-draft";
import { registerAttempt } from "../../src/server/sales-records/application/commands/register-attempt";
import { rejectRecord } from "../../src/server/sales-records/application/commands/reject-record";
import type { SalesRecordRateLimitedMutationDeps } from "../../src/server/sales-records/application/commands/shared";
import { submitRecord } from "../../src/server/sales-records/application/commands/submit-draft";
import { updateDraft } from "../../src/server/sales-records/application/commands/update-draft";
import type {
  CreateSalesRecordDraftInput,
  RegisterSalesRecordAttemptInput,
  UpdateSalesRecordDraftInput,
} from "../../src/server/sales-records/application/contracts";
import { createActionRateLimitsRepo } from "../../src/server/security/repos-action-rate-limits";
import type { AppContext } from "../../src/server/shared/action-runtime";
import type { DomainError } from "../../src/server/shared/domain-error";
import {
  asBranchId,
  asContactId,
  asOrganizationId,
  asUserId,
  type BranchId,
  type ContactId,
  type UserId,
} from "../../src/server/shared/ids";
import type { Result } from "../../src/server/shared/result";
import {
  createTestRepositories,
  type TestRepositories,
} from "./test-repositories";

const ARTIFACT_DIR = join(process.cwd(), ".vitest-db");
const TEMPLATE_DB_NAME = "__template-seeded.db";

let templateDbPathPromise: Promise<string> | null = null;

type TestSalesRecordCreateDraftInput = CreateSalesRecordDraftInput & {
  executiveUserId: UserId;
  branchId: BranchId;
};

type TestSalesRecordCommands = {
  createDraft(
    input: TestSalesRecordCreateDraftInput,
  ): Promise<Result<number, DomainError>>;
  submit(
    recordId: number,
    executiveUserId: UserId,
  ): Promise<Result<void, DomainError>>;
  confirm(
    recordId: number,
    reviewerUserId: UserId,
    reviewerBranchId: BranchId,
    bypassBranchScope: boolean,
  ): Promise<Result<void, DomainError>>;
  reject(
    recordId: number,
    reviewerUserId: UserId,
    reviewerBranchId: BranchId,
    bypassBranchScope: boolean,
    reason: string,
  ): Promise<Result<void, DomainError>>;
  updateDraft(
    recordId: number,
    executiveUserId: UserId,
    input: UpdateSalesRecordDraftInput,
    correctionNotes?: string | null,
  ): Promise<Result<void, DomainError>>;
  registerAttempt(
    recordId: number,
    reviewerUserId: UserId,
    reviewerBranchId: BranchId,
    bypassBranchScope: boolean,
    outcome: RegisterSalesRecordAttemptInput["outcome"],
    notes: string | null,
    nextAttemptAt: number | null,
  ): Promise<Result<void, DomainError>>;
};

function createTestAppContext(input: {
  userId: UserId;
  role: Role;
  branchId: BranchId;
}): AppContext {
  return {
    actor: {
      id: `test-session-${input.userId}`,
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
          branchId: asBranchId("00000000-0000-0000-0000-000000000011"),
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
          branchId: asBranchId("00000000-0000-0000-0000-000000000011"),
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

  const branchLima = asBranchId("00000000-0000-0000-0000-000000000011");
  const branchNorte = asBranchId("00000000-0000-0000-0000-000000000012");

  const userExecOne = asUserId("00000000-0000-0000-0000-000000000001");
  const userBackOne = asUserId("00000000-0000-0000-0000-000000000002");
  const userExecTwo = asUserId("00000000-0000-0000-0000-000000000003");
  const userBackTwo = asUserId("00000000-0000-0000-0000-000000000004");
  const userSuper = asUserId("00000000-0000-0000-0000-000000000005");

  const orgLima = asOrganizationId("00000000-0000-0000-0000-000000000101");
  const orgNorte = asOrganizationId("00000000-0000-0000-0000-000000000102");

  const contactLima = asContactId("00000000-0000-0000-0000-000000000201");
  const contactNorte = asContactId("00000000-0000-0000-0000-000000000202");

  await db
    .insertInto("branches")
    .values([
      { id: branchLima, name: "Lima", created_at: now },
      { id: branchNorte, name: "Norte", created_at: now },
    ])
    .execute();

  await db
    .insertInto("users")
    .values([
      {
        id: userExecOne,
        branch_id: branchLima,
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
        id: userBackOne,
        branch_id: branchLima,
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
        id: userExecTwo,
        branch_id: branchNorte,
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
        id: userBackTwo,
        branch_id: branchNorte,
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
        id: userSuper,
        branch_id: branchNorte,
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
        id: orgLima,
        ruc: "20100000001",
        name: "Org Lima",
        created_at: now,
        locked_branch_id: null,
        locked_at: null,
        locked_by_user_id: null,
      },
      {
        id: orgNorte,
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
        id: contactLima,
        organization_id: orgLima,
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
        id: contactNorte,
        organization_id: orgNorte,
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

async function buildSeededTemplateDb(templateDbPath: string): Promise<void> {
  const db = createDb(templateDbPath);

  try {
    await sql`PRAGMA journal_mode=DELETE`.execute(db);

    await migrateToLatest(db);

    await seedTemplate(db);
    await sql`PRAGMA wal_checkpoint(TRUNCATE)`.execute(db);
  } finally {
    await db.destroy();
  }
}

async function ensureSeededTemplateDb(): Promise<string> {
  if (templateDbPathPromise) {
    return templateDbPathPromise;
  }

  templateDbPathPromise = (async () => {
    await mkdir(ARTIFACT_DIR, { recursive: true });
    const templateDbPath = join(ARTIFACT_DIR, TEMPLATE_DB_NAME);

    try {
      await stat(templateDbPath);
      return templateDbPath;
    } catch {
      const tempTemplateDbPath = join(
        ARTIFACT_DIR,
        `${TEMPLATE_DB_NAME}.tmp-${process.pid}-${Date.now()}`,
      );
      await buildSeededTemplateDb(tempTemplateDbPath);
      await rename(tempTemplateDbPath, templateDbPath);
      return templateDbPath;
    }
  })();

  try {
    return await templateDbPathPromise;
  } catch (error) {
    templateDbPathPromise = null;
    throw error;
  }
}

export async function prepareTestDbTemplate(): Promise<void> {
  await ensureSeededTemplateDb();
}

export async function createIsolatedTestDb(
  prefix: string,
): Promise<TestDbContext> {
  const templateDbPath = await ensureSeededTemplateDb();
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const dbPath = join(ARTIFACT_DIR, `${prefix}-${runId}.db`);
  const storageRoot = join(ARTIFACT_DIR, `${prefix}-${runId}-files`);
  await copyFile(templateDbPath, dbPath);
  const db = createDb(dbPath);
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

export async function cleanupTestDb(
  ctx: TestDbContext | null | undefined,
): Promise<void> {
  if (!ctx) {
    return;
  }

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
