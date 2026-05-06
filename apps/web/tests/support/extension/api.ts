import { createExtensionService } from "~/server/extension/service";

import type { TestDbContext } from "../runtime/db";
import { createTestRepositories } from "../runtime/repos";

export function createTransactionRunner(ctx: TestDbContext) {
  return <T>(
    operation: (transactionRepos: TestDbContext["repos"]) => Promise<T>,
  ) =>
    ctx.db.transaction().execute((transactionDb) => {
      return operation(createTestRepositories(transactionDb));
    });
}

export function createExtensionScenario(
  ctx: TestDbContext,
  now: () => number = () => Date.now(),
) {
  const service = createExtensionService(ctx.repos, {
    runInTransaction: createTransactionRunner(ctx),
    now,
  });

  return {
    service,
    async session(
      input: { userId?: number; branchId?: number; sessionId?: string } = {},
    ) {
      const authSessionId = input.sessionId ?? crypto.randomUUID();
      const nowMs = now();
      await ctx.repos.sessions.create({
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
        created_at: nowMs,
        last_activity: nowMs,
        expires_at: nowMs + 60 * 60_000,
      });
      return authSessionId;
    },
    async assignment(input: { userId?: number; contactId?: number } = {}) {
      const nowMs = now();
      const result = await ctx.db
        .insertInto("lead_assignments")
        .values({
          user_id: input.userId ?? 1,
          contact_id: input.contactId ?? 1,
          assigned_at: nowMs,
          expires_at: nowMs + 60 * 60_000,
          status: "active",
        })
        .executeTakeFirstOrThrow();
      return Number(result.insertId);
    },
    async contactWithoutPhone(sequence: number) {
      const nowMs = now();
      const result = await ctx.db
        .insertInto("contacts")
        .values({
          organization_id: ctx.fixtures.organizations.lima.id,
          dni: `7999${sequence.toString().padStart(4, "0")}`,
          name: "Contacto sin telefono",
          phone_primary: null,
          phone_secondary: null,
          last_contacted_at: null,
          last_contacted_by_user_id: null,
          cooldown_until: null,
          created_at: nowMs,
        })
        .executeTakeFirstOrThrow();
      return Number(result.insertId);
    },
    async claim(installationId: string) {
      const authSessionId = await this.session();
      const assignmentId = await this.assignment();
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
        installationId,
      });
      if (!claimResult.ok) {
        throw new Error(claimResult.error.message);
      }
      return {
        authSessionId,
        assignmentId,
        sessionToken: claimResult.value.sessionToken,
      };
    },
  };
}
