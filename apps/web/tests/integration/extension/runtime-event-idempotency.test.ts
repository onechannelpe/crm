import { createExtensionScenario } from "@tests/support/extension/api";
import {
  createExtensionFixture,
  disposeExtensionFixture,
} from "@tests/support/extension/fixture";
import type { TestDbContext } from "@tests/support/runtime/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("extension runtime event idempotency", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createExtensionFixture("extension-runtime-event-idempotency");
  });

  afterEach(async () => {
    await disposeExtensionFixture(ctx);
  });

  it("accepts duplicate event delivery without creating a second runtime event", async () => {
    const scenario = createExtensionScenario(ctx);
    const { sessionToken, assignmentId } = await scenario.claim(
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

    const first = await scenario.service.ingestRuntimeEvent({
      sessionToken,
      event,
    });
    const second = await scenario.service.ingestRuntimeEvent({
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
    const scenario = createExtensionScenario(ctx);
    const authSessionId = await scenario.session();
    const assignmentId = await scenario.assignment();

    const firstHandoff = await scenario.service.createHandoffToken({
      userId: 1,
      authSessionId,
      branchId: 1,
      assignmentId,
      origin: "http://localhost:3000",
    });
    if (!firstHandoff.ok) throw new Error(firstHandoff.error.message);

    const firstClaim = await scenario.service.claimInstallationSession({
      handoffToken: firstHandoff.value.handoffToken,
      installationId: "11111111-1111-4111-8111-111111111111",
    });
    if (!firstClaim.ok) throw new Error(firstClaim.error.message);

    const secondHandoff = await scenario.service.createHandoffToken({
      userId: 1,
      authSessionId,
      branchId: 1,
      assignmentId,
      origin: "http://localhost:3000",
    });
    if (!secondHandoff.ok) throw new Error(secondHandoff.error.message);

    const secondClaim = await scenario.service.claimInstallationSession({
      handoffToken: secondHandoff.value.handoffToken,
      installationId: "22222222-2222-4222-8222-222222222222",
    });
    if (!secondClaim.ok) throw new Error(secondClaim.error.message);

    const oldSessionResult = await scenario.service.ingestRuntimeEvent({
      sessionToken: firstClaim.value.sessionToken,
      event: {
        id: "evt-old-installation",
        sequence: 1,
        type: "executive.heartbeat",
        createdAt: 20_000,
        payload: { occurredAt: 20_000 },
      },
    });
    const newSessionResult = await scenario.service.ingestRuntimeEvent({
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
    if (oldSessionResult.ok)
      throw new Error("old installation should have been revoked");
    expect(oldSessionResult.error.reason).toBe("session_invalid");
    expect(newSessionResult.ok).toBe(true);
  });
});
