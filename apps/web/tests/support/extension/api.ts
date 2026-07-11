import { createExtensionService } from "~/server/extension/service";
import type {
  BranchId,
  OrganizationPersonId,
  UserId,
} from "~/server/shared/ids";
import { ContactAssignmentId } from "~/server/shared/ids";
import { Err, type Result } from "~/server/shared/result";

import { TEST_FIXTURES, type TestDbContext } from "../runtime/db";
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
  now: () => Date = () => new Date(),
) {
  const service = createExtensionService(ctx.repos, {
    uow: createTransactionRunner(ctx),
    now,
  });

  return {
    service,
    async session(
      input: {
        userId?: UserId;
        branchId?: BranchId;
        sessionId?: string;
      } = {},
    ) {
      const authSessionId = input.sessionId ?? crypto.randomUUID();
      const currentTime = now();
      await ctx.repos.sessions.create({
        id: authSessionId,
        user_id: input.userId ?? TEST_FIXTURES.users.execOne.id,
        branch_id: input.branchId ?? TEST_FIXTURES.branches.lima.id,
        role: "executive",
        session_class: "app",
        primary_auth_method: "password",
        strong_auth_method: null,
        strong_auth_at: null,
        ip_address: "127.0.0.1",
        user_agent: "vitest",
        created_at: currentTime,
        last_activity: currentTime,
        expires_at: new Date(currentTime.getTime() + 60 * 60_000),
      });
      return authSessionId;
    },
    async assignment(
      input: { userId?: UserId; contactId?: OrganizationPersonId } = {},
    ): Promise<ContactAssignmentId> {
      const currentTime = now();
      const assignmentId = ContactAssignmentId.trust(crypto.randomUUID());
      await ctx.db
        .insertInto("contact_assignments")
        .values({
          id: assignmentId,
          user_id: input.userId ?? TEST_FIXTURES.users.execOne.id,
          contact_id:
            input.contactId ?? TEST_FIXTURES.organizationPeople.lima.id,
          assigned_at: currentTime,
          expires_at: new Date(currentTime.getTime() + 60 * 60_000),
          status: "active",
        })
        .executeTakeFirstOrThrow();
      return assignmentId;
    },
    async contactWithoutPhone(sequence: number) {
      const currentTime = now();
      const dni = `7999${sequence.toString().padStart(4, "0")}`;
      // `id` defaults to `uuidv7()` on both tables (nothing constructs it
      // manually in production), so the seed leaves it unset.
      const person = await ctx.db
        .insertInto("people")
        .values({
          dni,
          names: "Contacto sin telefono",
          first_surname: null,
          second_surname: null,
          email: null,
          created_at: currentTime,
          updated_at: currentTime,
        })
        .onConflict((oc) => oc.column("dni").doNothing())
        .returning("id")
        .executeTakeFirstOrThrow();
      const organizationPerson = await ctx.db
        .insertInto("organization_people")
        .values({
          person_id: person.id,
          organization_id: ctx.fixtures.organizations.lima.id,
          phone: null,
          email: null,
          created_at: currentTime,
          updated_at: currentTime,
        })
        .returning("id")
        .executeTakeFirstOrThrow();
      return organizationPerson.id;
    },
    async claim(installationId: string) {
      const authSessionId = await this.session();
      const assignmentId = await this.assignment();
      const handoffResult = await service.createHandoffToken({
        userId: TEST_FIXTURES.users.execOne.id,
        authSessionId,
        branchId: TEST_FIXTURES.branches.lima.id,
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
