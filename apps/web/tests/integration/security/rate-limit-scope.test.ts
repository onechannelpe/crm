import { createSecurityTestKit } from "@tests/support/security/kit";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "~/lib/app-errors";
import {
  ACTION_RATE_LIMIT_POLICY,
  checkActionRateLimit,
} from "~/lib/security/action-rate-limit";

describe("rate limit scope isolation", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(1_700_000_000_000);
    ctx = await createIsolatedTestDb("rate-limit-scope");
  });

  afterEach(async () => {
    vi.useRealTimers();
    await cleanupTestDb(ctx);
  });

  it("isolates counters by user", async () => {
    const kit = createSecurityTestKit(ctx);
    await kit.consumeUserLimit("leads.request", 1, "198.51.100.1");

    await expect(
      checkActionRateLimit("leads.request", 2, ctx.repos, "198.51.100.1"),
    ).resolves.toBeUndefined();
  });

  it("keeps user counter ip agnostic", async () => {
    const kit = createSecurityTestKit(ctx);
    await kit.consumeUserLimit("leads.request", 1, "198.51.100.1");

    await expect(
      checkActionRateLimit("leads.request", 1, ctx.repos, "198.51.100.2"),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("blocks single ip when ip limit is exceeded across users", async () => {
    const kit = createSecurityTestKit(ctx);
    await kit.consumeIpLimit("leads.request", "198.51.100.99");

    await expect(
      checkActionRateLimit("leads.request", 1, ctx.repos, "198.51.100.99"),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("isolates counters by action name", async () => {
    const { limit } = ACTION_RATE_LIMIT_POLICY["leads.request"];
    for (let index = 0; index < limit; index += 1) {
      await checkActionRateLimit("leads.request", 1, ctx.repos, "198.51.100.1");
    }

    await expect(
      checkActionRateLimit("team.invite.create", 1, ctx.repos, "198.51.100.1"),
    ).resolves.toBeUndefined();
  });
});
