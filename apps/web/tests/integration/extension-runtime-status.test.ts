import { generateKeyPairSync } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  async function createServiceSession(userId = 1, branchId = 1) {
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
  }

  async function createAssignment(userId = 1, contactId = 1) {
    const now = Date.now();
    const result = await ctx.db
      .insertInto("lead_assignments")
      .values({
        user_id: userId,
        contact_id: contactId,
        assigned_at: now,
        expires_at: now + 60 * 60_000,
        status: "active",
      })
      .executeTakeFirstOrThrow();

    return Number(result.insertId);
  }

  async function createContactWithoutPhone() {
    const now = Date.now();
    const result = await ctx.db
      .insertInto("contacts")
      .values({
        organization_id: 1,
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

    return Number(result.insertId);
  }

  async function claimSession(installationId: string) {
    const authSessionId = await createServiceSession();
    const assignmentId = await createAssignment();
    const service = createExtensionService(ctx.repos, {
      runInTransaction: createTransactionRunner(ctx),
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
  }

  it("keeps the newest presence projection regardless of write order", async () => {
    await ctx.repos.extensionRuntime.upsertExecutivePresence({
      user_id: 1,
      branch_id: 1,
      assignment_id: null,
      contact_id: null,
      call_session_id: "call-new",
      presence_status: "active",
      presence_updated_at: 2_000,
      source_event_id: "evt-new",
      source_event_sequence: 2,
    });

    await ctx.repos.extensionRuntime.upsertExecutivePresence({
      user_id: 1,
      branch_id: 1,
      assignment_id: null,
      contact_id: null,
      call_session_id: "call-old",
      presence_status: "dialing",
      presence_updated_at: 1_000,
      source_event_id: "evt-old",
      source_event_sequence: 1,
    });

    const current = await ctx.repos.extensionRuntime.findCurrentStatusByUser(1);
    expect(current?.presence_status).toBe("active");
    expect(current?.presence_updated_at).toBe(2_000);
    expect(current?.call_session_id).toBe("call-new");
    expect(current?.source_event_sequence).toBe(2);
  });

  it("breaks equal-timestamp ties by higher source sequence", async () => {
    await ctx.repos.extensionRuntime.upsertExecutivePresence({
      user_id: 1,
      branch_id: 1,
      assignment_id: null,
      contact_id: null,
      call_session_id: "call-low",
      presence_status: "dialing",
      presence_updated_at: 3_000,
      source_event_id: "evt-low",
      source_event_sequence: 1,
    });

    await ctx.repos.extensionRuntime.upsertExecutivePresence({
      user_id: 1,
      branch_id: 1,
      assignment_id: null,
      contact_id: null,
      call_session_id: "call-high",
      presence_status: "active",
      presence_updated_at: 3_000,
      source_event_id: "evt-high",
      source_event_sequence: 2,
    });

    const current = await ctx.repos.extensionRuntime.findCurrentStatusByUser(1);
    expect(current?.presence_status).toBe("active");
    expect(current?.call_session_id).toBe("call-high");
    expect(current?.source_event_sequence).toBe(2);
  });

  it("keeps shared sync ok when heartbeat freshness is recent", async () => {
    const fixedNow = 1_000_000;
    await ctx.db
      .insertInto("extension_executive_statuses")
      .values({
        user_id: 1,
        branch_id: 1,
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
      userId: 2,
      branchId: 1,
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
    await ctx.db
      .insertInto("extension_executive_statuses")
      .values({
        user_id: 1,
        branch_id: 1,
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
      userId: 2,
      branchId: 1,
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
    const authSessionId = await createServiceSession();
    const contactId = await createContactWithoutPhone();
    const assignmentId = await createAssignment(1, contactId);
    const service = createExtensionService(ctx.repos, {
      runInTransaction: createTransactionRunner(ctx),
    });

    const result = await service.createHandoffToken({
      userId: 1,
      authSessionId,
      branchId: 1,
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
    const { service, sessionToken, assignmentId } = await claimSession(
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
        contactId: 1,
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
    const authSessionId = await createServiceSession();
    const assignmentId = await createAssignment();
    const service = createExtensionService(ctx.repos, {
      runInTransaction: createTransactionRunner(ctx),
    });

    const firstHandoff = await service.createHandoffToken({
      userId: 1,
      authSessionId,
      branchId: 1,
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
      userId: 1,
      authSessionId,
      branchId: 1,
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
