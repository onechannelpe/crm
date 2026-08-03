import { operationAt } from "@tests/support/operation";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  resetTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { createSecurityTestKit } from "@tests/support/security/kit";
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

import { ActionError } from "~/contracts/errors";
import {
  ACTION_RATE_LIMIT_POLICY,
  checkActionRateLimit,
} from "~/server/security/action-rate-limit";

describe("rate limit policy enforcement", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("rate-limit-policy-enforcement");
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

  it("allows requests up to the per action limit", async () => {
    const userId = ctx.fixtures.users.execOne.id;
    const userLimit = ACTION_RATE_LIMIT_POLICY["leads.request"].userLimit;
    for (let index = 0; index < userLimit; index += 1) {
      await expect(
        checkActionRateLimit(
          "leads.request",
          userId,
          ctx.repos,
          operationAt(new Date()),
          "198.51.100.1",
        ),
      ).resolves.toBeUndefined();
    }
  });

  it("blocks the next request after limit is reached", async () => {
    const kit = createSecurityTestKit(ctx);
    const userId = ctx.fixtures.users.execOne.id;
    await kit.consumeUserLimit("leads.request", userId, "198.51.100.1");

    await expect(
      checkActionRateLimit(
        "leads.request",
        userId,
        ctx.repos,
        operationAt(new Date()),
        "198.51.100.1",
      ),
    ).rejects.toBeInstanceOf(ActionError);
  });

  it("enforces longer hourly window for team invites", async () => {
    const { windowMs } = ACTION_RATE_LIMIT_POLICY["team.invite.create"];
    expect(windowMs).toBe(60 * 60_000);

    const kit = createSecurityTestKit(ctx);
    const userId = ctx.fixtures.users.execOne.id;
    await kit.consumeUserLimit("team.invite.create", userId, "198.51.100.1");

    vi.setSystemTime(Date.now() + 30 * 60_000);
    await expect(
      checkActionRateLimit(
        "team.invite.create",
        userId,
        ctx.repos,
        operationAt(new Date()),
        "198.51.100.1",
      ),
    ).rejects.toBeInstanceOf(ActionError);
  });
});
