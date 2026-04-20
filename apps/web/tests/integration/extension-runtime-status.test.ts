import { generateKeyPairSync } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { asUserId } from "../../src/server/shared/ids";
import { createExtensionTestKit } from "../support/extension-test-kit";
import { TEST_IDS } from "../support/identities/seeded-identities";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";
import { createTestRepositories } from "../support/test-repositories";

function createTransactionRunner(ctx: TestDbContext) {
  return <T>(
    operation: (transactionRepos: TestDbContext["repos"]) => Promise<T>,
  ) =>
    ctx.db.transaction().execute((transactionDb) => {
      return operation(createTestRepositories(transactionDb));
    });
}

describe("extension runtime status invariants", () => {
  let ctx: TestDbContext;
  let kit: ReturnType<typeof createExtensionTestKit>;
  let createExtensionService: typeof import("../../src/server/extension/service").createExtensionService;

  beforeEach(async () => {
    const { privateKey } = generateKeyPairSync("ed25519");
    process.env.EXTENSION_HANDOFF_PRIVATE_KEY_PKCS8_BASE64 = Buffer.from(
      privateKey.export({
        format: "der",
        type: "pkcs8",
      }),
    ).toString("base64");
    process.env.EXTENSION_EXPECTED_ORIGIN = "http://localhost:3000";
    vi.resetModules();
    ({ createExtensionService } =
      await import("../../src/server/extension/service"));
    ctx = await createIsolatedTestDb("extension-runtime-status");
    kit = createExtensionTestKit(ctx);
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("keeps the newest presence projection regardless of write order", async () => {
    const branch1 = TEST_IDS.BRANCH_LIMA;
    const user1 = asUserId("00000000-0000-0000-0000-000000000001");

    await ctx.repos.extensionRuntime.upsertExecutivePresence({
      user_id: user1,
      branch_id: branch1,
      assignment_id: null,
      contact_id: null,
      call_session_id: "call-new",
      presence_status: "active",
      presence_updated_at: 2_000,
      source_event_id: "evt-new",
      source_event_sequence: 2,
    });

    await ctx.repos.extensionRuntime.upsertExecutivePresence({
      user_id: user1,
      branch_id: branch1,
      assignment_id: null,
      contact_id: null,
      call_session_id: "call-old",
      presence_status: "dialing",
      presence_updated_at: 1_000,
      source_event_id: "evt-old",
      source_event_sequence: 1,
    });

    const current =
      await ctx.repos.extensionRuntime.findCurrentStatusByUser(user1);
    expect(current?.presence_status).toBe("active");
  });

  it("breaks equal-timestamp ties by higher source sequence", async () => {
    const user1 = asUserId("00000000-0000-0000-0000-000000000001");
    await ctx.repos.extensionRuntime.upsertExecutivePresence({
      user_id: user1,
      branch_id: TEST_IDS.BRANCH_LIMA,
      assignment_id: null,
      contact_id: null,
      call_session_id: "call-low",
      presence_status: "dialing",
      presence_updated_at: 3_000,
      source_event_id: "evt-low",
      source_event_sequence: 1,
    });

    await ctx.repos.extensionRuntime.upsertExecutivePresence({
      user_id: user1,
      branch_id: TEST_IDS.BRANCH_LIMA,
      assignment_id: null,
      contact_id: null,
      call_session_id: "call-high",
      presence_status: "active",
      presence_updated_at: 3_000,
      source_event_id: "evt-high",
      source_event_sequence: 2,
    });

    const current =
      await ctx.repos.extensionRuntime.findCurrentStatusByUser(user1);
    expect(current?.presence_status).toBe("active");
  });

  it("keeps shared sync ok when heartbeat freshness is recent", async () => {
    const fixedNow = 1_000_000;
    const user1 = asUserId("00000000-0000-0000-0000-000000000001");
    const branch1 = TEST_IDS.BRANCH_LIMA;

    await ctx.db
      .insertInto("extension_executive_statuses")
      .values({
        user_id: user1,
        branch_id: branch1,
        assignment_id: null,
        contact_id: null,
        call_session_id: null,
        presence_status: "ready",
        presence_updated_at: fixedNow - 5 * 60_000,
        sync_health: "ok",
        sync_updated_at: fixedNow - 30_000,
        source_event_id: "heartbeat",
        source_event_sequence: 7,
      })
      .execute();

    const service = createExtensionService(ctx.repos, {
      now: () => fixedNow,
    });
    const result = await service.listTeamExecutiveStatuses({
      role: "sales_manager",
      userId: asUserId("00000000-0000-0000-0000-000000000002"),
      branchId: branch1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.error.message);
    }

    expect(result.value[0]?.presenceStatus).toBe("offline");
    expect(result.value[0]?.syncHealth).toBe("ok");
  });

  it("marks shared sync stale when heartbeat freshness expires", async () => {
    const fixedNow = 1_000_000;
    const user1 = asUserId("00000000-0000-0000-0000-000000000001");
    const branch1 = TEST_IDS.BRANCH_LIMA;

    await ctx.db
      .insertInto("extension_executive_statuses")
      .values({
        user_id: user1,
        branch_id: branch1,
        assignment_id: null,
        contact_id: null,
        call_session_id: null,
        presence_status: "ready",
        presence_updated_at: fixedNow - 30_000,
        sync_health: "ok",
        sync_updated_at: fixedNow - 5 * 60_000,
        source_event_id: "heartbeat-old",
        source_event_sequence: 6,
      })
      .execute();

    const service = createExtensionService(ctx.repos, {
      now: () => fixedNow,
    });
    const result = await service.listTeamExecutiveStatuses({
      role: "sales_manager",
      userId: asUserId("00000000-0000-0000-0000-000000000002"),
      branchId: branch1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.error.message);
    }

    expect(result.value[0]?.presenceStatus).toBe("ready");
    expect(result.value[0]?.syncHealth).toBe("stale");
  });

  it("classifies malformed handoff tokens as handoff_invalid", async () => {
    const service = createExtensionService(ctx.repos, {
      runInTransaction: createTransactionRunner(ctx),
    });

    const result = await service.claimInstallationSession({
      handoffToken: "not-a-jwt",
      installationId: "11111111-1111-4111-8111-111111111111",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("malformed handoff token should be rejected");
    }
    expect(result.error.reason).toBe("handoff_invalid");
  });

  it("rejects handoff creation when the assigned contact has no primary phone", async () => {
    const authSessionId = await kit.createServiceSession();
    const contactId = await kit.createContactWithoutPhone();
    const assignmentId = (await kit.createAssignment(
      asUserId("00000000-0000-0000-0000-000000000001"),
      contactId,
    )) as any;
    const service = createExtensionService(ctx.repos, {
      runInTransaction: createTransactionRunner(ctx),
    });

    const result = await service.createHandoffToken({
      userId: asUserId("00000000-0000-0000-0000-000000000001"),
      authSessionId,
      branchId: TEST_IDS.BRANCH_LIMA,
      assignmentId,
      origin: "http://localhost:3000",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("handoff should be rejected for contacts without phone");
    }
    expect(result.error.reason).toBe("assignment_inactive");

    const handoffs = await ctx.db
      .selectFrom("extension_handoffs")
      .select(["jti"])
      .where("assignment_id", "=", assignmentId)
      .execute();
    expect(handoffs).toHaveLength(0);
  });

  it("classifies malformed session tokens as session_invalid", async () => {
    const service = createExtensionService(ctx.repos, {
      runInTransaction: createTransactionRunner(ctx),
    });

    const result = await service.ingestRuntimeEvent({
      sessionToken: "not-a-jwt",
      event: {
        id: "evt-invalid-session",
        sequence: 1,
        type: "executive.heartbeat",
        createdAt: 10_000,
        payload: { occurredAt: 10_000 },
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("malformed session token should be rejected");
    }
    expect(result.error.reason).toBe("session_invalid");
  });

  it("accepts duplicate event delivery without creating a second runtime event", async () => {
    const { service, sessionToken, assignmentId } = await kit.claimSession(
      createExtensionService,
      "11111111-1111-4111-8111-111111111111",
    );
    const event = {
      id: "evt-duplicate",
      sequence: 1,
      type: "executive.presence" as const,
      createdAt: 10_000,
      payload: {
        presenceStatus: "ready" as const,
        assignmentId,
        contactId: TEST_IDS.CONTACT_LIMA,
        callSessionId: null,
        updatedAt: 10_000,
      },
    };

    const first = await service.ingestRuntimeEvent({
      sessionToken,
      event,
    });
    const second = await service.ingestRuntimeEvent({
      sessionToken,
      event,
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);

    const events = await ctx.db
      .selectFrom("extension_runtime_events")
      .select(["id"])
      .where("id", "=", event.id)
      .execute();
    expect(events).toHaveLength(1);
  });

  it("revokes older installations when a new installation claims the user session", async () => {
    const user1 = asUserId("00000000-0000-0000-0000-000000000001");
    const branch1 = TEST_IDS.BRANCH_LIMA;
    const authSessionId = await kit.createServiceSession(user1, branch1);
    const assignmentId = (await kit.createAssignment(user1)) as any;
    const service = createExtensionService(ctx.repos, {
      runInTransaction: createTransactionRunner(ctx),
    });

    const firstHandoff = await service.createHandoffToken({
      userId: user1,
      authSessionId,
      branchId: branch1,
      assignmentId,
      origin: "http://localhost:3000",
    });
    if (!firstHandoff.ok) {
      throw new Error(firstHandoff.error.message);
    }

    const firstClaim = await service.claimInstallationSession({
      handoffToken: firstHandoff.value.handoffToken,
      installationId: "11111111-1111-4111-8111-111111111111",
    });
    if (!firstClaim.ok) {
      throw new Error(firstClaim.error.message);
    }

    const secondHandoff = await service.createHandoffToken({
      userId: user1,
      authSessionId,
      branchId: branch1,
      assignmentId,
      origin: "http://localhost:3000",
    });
    if (!secondHandoff.ok) {
      throw new Error(secondHandoff.error.message);
    }

    const secondClaim = await service.claimInstallationSession({
      handoffToken: secondHandoff.value.handoffToken,
      installationId: "22222222-2222-4222-8222-222222222222",
    });
    if (!secondClaim.ok) {
      throw new Error(secondClaim.error.message);
    }

    const oldSessionResult = await service.ingestRuntimeEvent({
      sessionToken: firstClaim.value.sessionToken,
      event: {
        id: "evt-old-installation",
        sequence: 1,
        type: "executive.heartbeat",
        createdAt: 20_000,
        payload: { occurredAt: 20_000 },
      },
    });
    const newSessionResult = await service.ingestRuntimeEvent({
      sessionToken: secondClaim.value.sessionToken,
      event: {
        id: "evt-new-installation",
        sequence: 1,
        type: "executive.heartbeat",
        createdAt: 21_000,
        payload: { occurredAt: 21_000 },
      },
    });

    expect(oldSessionResult.ok).toBe(false);
    if (oldSessionResult.ok) {
      throw new Error("old installation should have been revoked");
    }
    expect(oldSessionResult.error.reason).toBe("session_invalid");
    expect(newSessionResult.ok).toBe(true);
  });
});
