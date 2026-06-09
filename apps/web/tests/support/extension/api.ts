import { createExtensionService } from "~/server/extension/service";
import { Err, type Result } from "~/server/shared/result";

import type { TestDbContext } from "../runtime/db";
import { createTestRepositories } from "../runtime/repos";

export function createTransactionRunner(ctx: TestDbContext) {
  class TestRollbackError<TError> extends Error {
    constructor(readonly error: TError) {
      super("rollback");
    }
  }

  return {
    async run<T, TError>(
      work: (
        transactionRepos: TestDbContext["repos"],
      ) => Promise<Result<T, TError>>,
    ): Promise<Result<T, TError>> {
      try {
        return await ctx.db.transaction().execute(async (transactionDb) => {
          const result = await work(createTestRepositories(transactionDb));
          if (!result.ok) {
            throw new TestRollbackError(result.error);
          }
          return result;
        });
      } catch (error) {
        if (error instanceof TestRollbackError) {
          return Err(error.error);
        }
        throw error;
      }
    },
  };
}

export function createExtensionScenario(
  ctx: TestDbContext,
  now: () => number = () => Date.now(),
) {
  const service = createExtensionService(ctx.repos, {
    uow: createTransactionRunner(ctx),
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
      const dni = `7999${sequence.toString().padStart(4, "0")}`;
      const person = await ctx.db
        .insertInto("people")
        .values({
          dni,
          full_name: "Contacto sin telefono",
          email: null,
          created_at: nowMs,
          updated_at: nowMs,
        })
        .onConflict((oc) => oc.column("dni").doNothing())
        .executeTakeFirstOrThrow();
      const personId =
        Number(person.insertId) ||
        (
          await ctx.db
            .selectFrom("people")
            .select("id")
            .where("dni", "=", dni)
            .executeTakeFirstOrThrow()
        ).id;
      const result = await ctx.db
        .insertInto("organization_people")
        .values({
          person_id: personId,
          organization_id: ctx.fixtures.organizations.lima.id,
          dni,
          nombres: "Contacto",
          apellido_paterno: "Sin",
          apellido_materno: "Telefono",
          telefono: null,
          email: null,
          last_contacted_at: null,
          last_contacted_by_user_id: null,
          cooldown_until: null,
          created_at: nowMs,
          updated_at: nowMs,
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
        throw new Error(handoffResult.error.code ?? handoffResult.error.kind);
      }
      const claimResult = await service.claimInstallationSession({
        handoffToken: handoffResult.value.handoffToken,
        installationId,
      });
      if (!claimResult.ok) {
        throw new Error(claimResult.error.code ?? claimResult.error.kind);
      }
      return {
        authSessionId,
        assignmentId,
        sessionToken: claimResult.value.sessionToken,
      };
    },
  };
}
