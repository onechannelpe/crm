import {
  asBranchId,
  asUserId,
  createAssignmentId,
  createContactId,
  type BranchId,
  type ContactId,
  type UserId,
} from "../../src/server/shared/ids";
import { TEST_IDS } from "./identities/seeded-identities";
import type { TestDbContext } from "./test-db";
import { createTestRepositories } from "./test-repositories";

/**
 * Helper to manage extension runtime state in tests.
 */
export function createExtensionTestKit(ctx: TestDbContext) {
  function createTransactionRunner() {
    return <T>(operation: (transactionRepos: typeof ctx.repos) => Promise<T>) =>
      ctx.db.transaction().execute((transactionDb) => {
        return operation(createTestRepositories(transactionDb));
      });
  }

  return {
    /**
     * Creates an active session for an executive user.
     */
    async createServiceSession(
      userId: UserId = asUserId("00000000-0000-0000-0000-000000000001"),
      branchId: BranchId = TEST_IDS.BRANCH_LIMA,
    ) {
      const now = Date.now();
      const authSessionId = crypto.randomUUID();
      await ctx.repos.sessions.create({
        id: authSessionId,
        user_id: userId,
        branch_id: branchId,
        role: "executive",
        session_class: "app",
        primary_auth_method: "password",
        strong_auth_method: null,
        strong_auth_at: null,
        ip_address: "127.0.0.1",
        user_agent: "vitest",
        created_at: now,
        last_activity: now,
        expires_at: now + 60 * 60_000,
      });
      return authSessionId;
    },

    /**
     * Directly inserts a lead assignment into the database.
     */
    async createAssignment(
      userId: UserId = asUserId("00000000-0000-0000-0000-000000000001"),
      contactId: ContactId = TEST_IDS.CONTACT_LIMA,
    ) {
      const now = Date.now();
      const id = createAssignmentId();
      await ctx.db
        .insertInto("lead_assignments")
        .values({
          id,
          user_id: userId,
          contact_id: contactId,
          assigned_at: now,
          expires_at: now + 60 * 60_000,
          status: "active",
        })
        .executeTakeFirstOrThrow();

      return id;
    },

    /**
     * Creates a contact without a primary phone number.
     */
    async createContactWithoutPhone() {
      const now = Date.now();
      const id = createContactId();
      await ctx.db
        .insertInto("contacts")
        .values({
          id,
          organization_id: TEST_IDS.ORG_LIMA,
          dni: `7000${Math.floor(Math.random() * 100000)
            .toString()
            .padStart(5, "0")}`,
          name: "Contacto sin telefono",
          phone_primary: null,
          phone_secondary: null,
          last_contacted_at: null,
          last_contacted_by_user_id: null,
          cooldown_until: null,
          created_at: now,
        })
        .executeTakeFirstOrThrow();

      return id;
    },

    /**
     * High-level helper to setup a claimed installation session.
     */
    async claimSession(
      createExtensionService: any,
      installationId: string,
      userId: UserId = asUserId("00000000-0000-0000-0000-000000000001"),
      branchId: BranchId = TEST_IDS.BRANCH_LIMA,
    ) {
      const authSessionId = await this.createServiceSession(userId, branchId);
      const assignmentId = (await this.createAssignment(userId)) as any;
      const service = createExtensionService(ctx.repos, {
        runInTransaction: createTransactionRunner(),
      });

      const handoffResult = await service.createHandoffToken({
        userId,
        authSessionId,
        branchId,
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
        service,
        authSessionId,
        assignmentId,
        sessionToken: claimResult.value.sessionToken,
      };
    },
  };
}
