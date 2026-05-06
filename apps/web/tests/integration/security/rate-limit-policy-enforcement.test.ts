import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { createSecurityTestKit } from "@tests/support/security/kit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "~/lib/app-errors";
import {
  ACTION_RATE_LIMIT_POLICY,
  checkActionRateLimit,
} from "~/lib/security/action-rate-limit";

describe("rate limit policy enforcement", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(1_700_000_000_000);
    ctx = await createIsolatedTestDb("rate-limit-policy-enforcement");
  });

  afterEach(async () => {
    vi.useRealTimers();
    await cleanupTestDb(ctx);
  });

  it("allows requests up to the per action limit", async () => {
    const limit = ACTION_RATE_LIMIT_POLICY["leads.request"].limit;
    for (let index = 0; index < limit; index += 1) {
      await expect(
        checkActionRateLimit("leads.request", 1, ctx.repos, "198.51.100.1"),
      ).resolves.toBeUndefined();
    }
  });

  it("blocks the next request after limit is reached", async () => {
    const kit = createSecurityTestKit(ctx);
    await kit.consumeUserLimit("leads.request", 1, "198.51.100.1");

    await expect(
      checkActionRateLimit("leads.request", 1, ctx.repos, "198.51.100.1"),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("enforces longer hourly window for team invites", async () => {
    const { windowMs } = ACTION_RATE_LIMIT_POLICY["team.invite.create"];
    expect(windowMs).toBe(60 * 60_000);

    const kit = createSecurityTestKit(ctx);
    await kit.consumeUserLimit("team.invite.create", 1, "198.51.100.1");

    vi.setSystemTime(Date.now() + 30 * 60_000);
    await expect(
      checkActionRateLimit("team.invite.create", 1, ctx.repos, "198.51.100.1"),
    ).rejects.toBeInstanceOf(AppError);
  });
});
