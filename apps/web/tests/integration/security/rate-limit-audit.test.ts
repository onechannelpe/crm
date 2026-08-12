import { operationAt } from "@tests/support/operation";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  resetTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import {
  ACTION_RATE_LIMIT_POLICY,
  checkActionRateLimit,
} from "@tests/support/security/kit";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

describe("rate limit audit", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("rate-limit-audit");
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  beforeEach(async () => {
    await resetTestDb(ctx);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(1_700_000_000_000);
  });

  afterEach(async () => {
    vi.useRealTimers();
  });

  it("logs a rate_limit_exceeded audit entry on violation", async () => {
    const userId = ctx.fixtures.users.execOne.id;
    const { userLimit } = ACTION_RATE_LIMIT_POLICY["leads.request"];
    for (let index = 0; index < userLimit; index += 1) {
      await checkActionRateLimit(
        "leads.request",
        userId,
        ctx,
        operationAt(new Date()),
        "198.51.100.1",
      );
    }

    await expect(
      checkActionRateLimit(
        "leads.request",
        userId,
        ctx,
        operationAt(new Date()),
        "198.51.100.1",
      ),
    ).rejects.toBeDefined();

    const entry = await ctx.db
      .selectFrom("events")
      .selectAll()
      .where("type", "=", "rate_limit_exceeded")
      .where("actor_user_id", "=", userId)
      .executeTakeFirst();
    expect(entry).toBeDefined();
    expect(entry?.entity_type).toBe("user");
    expect(entry?.entity_id).toBe(String(userId));
    expect(entry?.payload_json).toMatchObject({
      actionName: "leads.request",
      scope: "user",
    });
    expect(entry?.payload_json).toHaveProperty("retryAfterMs");
  });

  it("cleans up stale counters", async () => {
    const userId = ctx.fixtures.users.execOne.id;
    await checkActionRateLimit(
      "leads.request",
      userId,
      ctx,
      operationAt(new Date()),
      "198.51.100.1",
    );
    const deleted = await ctx.repos.actionRateLimits.deleteUpdatedBefore(
      new Date(Date.now() + 1),
    );
    expect(deleted).toBeGreaterThanOrEqual(1);
  });
});
