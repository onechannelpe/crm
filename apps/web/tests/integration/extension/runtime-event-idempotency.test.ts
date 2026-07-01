import { expectErr, expectOk } from "@tests/support/_core/assertions";
import { createExtensionScenario } from "@tests/support/extension/api";
import {
  createExtensionFixture,
  disposeExtensionFixture,
  resetExtensionFixture,
} from "@tests/support/extension/fixture";
import type { TestDbContext } from "@tests/support/runtime/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

describe("extension runtime event idempotency", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await createExtensionFixture("extension-runtime-event-idempotency");
  });

  afterAll(async () => {
    await disposeExtensionFixture(ctx);
  });

  beforeEach(async () => {
    await resetExtensionFixture(ctx);
  });

  it("accepts duplicate event delivery without creating a second runtime event", async () => {
    const scenario = createExtensionScenario(ctx);
    const { lima: contact } = ctx.fixtures.organizationPeople;
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
        contactId: contact.id,
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

    expectOk(first);
    expectOk(second);

    const events = await ctx.db
      .selectFrom("extension_runtime_events")
      .select(["id"])
      .where("id", "=", event.id)
      .execute();
    expect(events).toHaveLength(1);
  });

  it("revokes older installations when a new installation claims the user session", async () => {
    const scenario = createExtensionScenario(ctx);
    const { execOne } = ctx.fixtures.users;
    const { lima } = ctx.fixtures.branches;
    const authSessionId = await scenario.session();
    const assignmentId = await scenario.assignment();

    const firstHandoff = await scenario.service.createHandoffToken({
      userId: execOne.id,
      authSessionId,
      branchId: lima.id,
      assignmentId,
      origin: "http://localhost:3000",
    });
    const firstHandoffValue = expectOk(firstHandoff);

    const firstClaim = await scenario.service.claimInstallationSession({
      handoffToken: firstHandoffValue.handoffToken,
      installationId: "11111111-1111-4111-8111-111111111111",
    });
    const firstClaimValue = expectOk(firstClaim);

    const secondHandoff = await scenario.service.createHandoffToken({
      userId: execOne.id,
      authSessionId,
      branchId: lima.id,
      assignmentId,
      origin: "http://localhost:3000",
    });
    const secondHandoffValue = expectOk(secondHandoff);

    const secondClaim = await scenario.service.claimInstallationSession({
      handoffToken: secondHandoffValue.handoffToken,
      installationId: "22222222-2222-4222-8222-222222222222",
    });
    const secondClaimValue = expectOk(secondClaim);

    const oldSessionResult = await scenario.service.ingestRuntimeEvent({
      sessionToken: firstClaimValue.sessionToken,
      event: {
        id: "evt-old-installation",
        sequence: 1,
        type: "executive.heartbeat",
        createdAt: 20_000,
        payload: { occurredAt: 20_000 },
      },
    });
    const newSessionResult = await scenario.service.ingestRuntimeEvent({
      sessionToken: secondClaimValue.sessionToken,
      event: {
        id: "evt-new-installation",
        sequence: 1,
        type: "executive.heartbeat",
        createdAt: 21_000,
        payload: { occurredAt: 21_000 },
      },
    });

    const oldSessionError = expectErr(oldSessionResult);
    expect(oldSessionError.code).toBe("extension_session_invalid");
    expectOk(newSessionResult);
  });
});
