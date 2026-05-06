import { createExtensionScenario } from "@tests/support/extension/api";
import {
  createExtensionFixture,
  disposeExtensionFixture,
} from "@tests/support/extension/fixture";
import type { TestDbContext } from "@tests/support/runtime/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("extension runtime token validation", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createExtensionFixture("extension-runtime-token-validation");
  });

  afterEach(async () => {
    await disposeExtensionFixture(ctx);
  });

  it("classifies malformed handoff tokens as handoff_invalid", async () => {
    const scenario = createExtensionScenario(ctx);

    const result = await scenario.service.claimInstallationSession({
      handoffToken: "not-a-jwt",
      installationId: "11111111-1111-4111-8111-111111111111",
    });

    expect(result.ok).toBe(false);
    if (result.ok)
      throw new Error("malformed handoff token should be rejected");
    expect(result.error.reason).toBe("handoff_invalid");
  });

  it("rejects handoff creation when assigned contact has no primary phone", async () => {
    const scenario = createExtensionScenario(ctx);
    const authSessionId = await scenario.session();
    const contactId = await scenario.contactWithoutPhone(1);
    const assignmentId = await scenario.assignment({ userId: 1, contactId });

    const result = await scenario.service.createHandoffToken({
      userId: 1,
      authSessionId,
      branchId: 1,
      assignmentId,
      origin: "http://localhost:3000",
    });

    expect(result.ok).toBe(false);
    if (result.ok)
      throw new Error("handoff should be rejected for contacts without phone");
    expect(result.error.reason).toBe("assignment_inactive");

    const handoffs = await ctx.db
      .selectFrom("extension_handoffs")
      .select(["jti"])
      .where("assignment_id", "=", assignmentId)
      .execute();
    expect(handoffs).toHaveLength(0);
  });

  it("classifies malformed session tokens as session_invalid", async () => {
    const scenario = createExtensionScenario(ctx);

    const result = await scenario.service.ingestRuntimeEvent({
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
    if (result.ok)
      throw new Error("malformed session token should be rejected");
    expect(result.error.reason).toBe("session_invalid");
  });
});
