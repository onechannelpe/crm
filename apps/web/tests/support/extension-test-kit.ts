import { createExtensionService } from "~/server/extension/service";

import type { TestDbContext } from "./test-db";
import { createTestRepositories } from "./test-repositories";

export function createTransactionRunner(ctx: TestDbContext) {
  return <T>(
    operation: (transactionRepos: TestDbContext["repos"]) => Promise<T>,
  ) =>
    ctx.db.transaction().execute((transactionDb) => {
      return operation(createTestRepositories(transactionDb));
    });
}

export function createTestExtensionService(
  ctx: TestDbContext,
  now?: () => number,
) {
  return createExtensionService(ctx.repos, {
    runInTransaction: createTransactionRunner(ctx),
    ...(now ? { now } : {}),
  });
}

export async function createServiceSession(input: {
  ctx: TestDbContext;
  nowMs: number;
  userId?: number;
  branchId?: number;
  sessionId?: string;
}) {
  const authSessionId = input.sessionId ?? crypto.randomUUID();
  await input.ctx.repos.sessions.create({
    id: authSessionId,
    user_id: input.userId ?? 1,
    branch_id: input.branchId ?? 1,
    role: "executive",
    session_class: "app",
    primary_auth_method: "password",
    strong_auth_method: null,
    strong_auth_at: null,
    ip_address: "127.0.0.1",
    user_agent: "vitest",
    created_at: input.nowMs,
    last_activity: input.nowMs,
    expires_at: input.nowMs + 60 * 60_000,
  });
  return authSessionId;
}

export async function createAssignment(input: {
  ctx: TestDbContext;
  nowMs: number;
  userId?: number;
  contactId?: number;
}) {
  const result = await input.ctx.db
    .insertInto("lead_assignments")
    .values({
      user_id: input.userId ?? 1,
      contact_id: input.contactId ?? 1,
      assigned_at: input.nowMs,
      expires_at: input.nowMs + 60 * 60_000,
      status: "active",
    })
    .executeTakeFirstOrThrow();
  return Number(result.insertId);
}

export async function createContactWithoutPhone(input: {
  ctx: TestDbContext;
  nowMs: number;
  sequence: number;
}) {
  const result = await input.ctx.db
    .insertInto("contacts")
    .values({
      organization_id: 1,
      dni: `7999${input.sequence.toString().padStart(4, "0")}`,
      name: "Contacto sin telefono",
      phone_primary: null,
      phone_secondary: null,
      last_contacted_at: null,
      last_contacted_by_user_id: null,
      cooldown_until: null,
      created_at: input.nowMs,
    })
    .executeTakeFirstOrThrow();

  return Number(result.insertId);
}

export async function claimSession(input: {
  ctx: TestDbContext;
  nowMs: number;
  installationId: string;
}) {
  const service = createTestExtensionService(input.ctx);
  const authSessionId = await createServiceSession({
    ctx: input.ctx,
    nowMs: input.nowMs,
  });
  const assignmentId = await createAssignment({
    ctx: input.ctx,
    nowMs: input.nowMs,
  });
  const handoffResult = await service.createHandoffToken({
    userId: 1,
    authSessionId,
    branchId: 1,
    assignmentId,
    origin: "http://localhost:3000",
  });
  if (!handoffResult.ok) {
    throw new Error(handoffResult.error.message);
  }
  const claimResult = await service.claimInstallationSession({
    handoffToken: handoffResult.value.handoffToken,
    installationId: input.installationId,
  });
  if (!claimResult.ok) {
    throw new Error(claimResult.error.message);
  }
  return {
    service,
    authSessionId,
    assignmentId,
    sessionToken: claimResult.value.sessionToken,
  };
}
