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

describe("rate limit scope isolation", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("rate-limit-scope");
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

  it("isolates counters by user", async () => {
    const kit = createSecurityTestKit(ctx);
    await kit.consumeUserLimit(
      "leads.request",
      ctx.fixtures.users.execOne.id,
      "198.51.100.1",
    );

    await expect(
      checkActionRateLimit(
        "leads.request",
        ctx.fixtures.users.backOne.id,
        ctx.repos,
        operationAt(new Date()),
        "198.51.100.1",
      ),
    ).resolves.toBeUndefined();
  });

  it("keeps user counter ip agnostic", async () => {
    const kit = createSecurityTestKit(ctx);
    const userId = ctx.fixtures.users.execOne.id;
    await kit.consumeUserLimit("leads.request", userId, "198.51.100.1");

    await expect(
      checkActionRateLimit(
        "leads.request",
        userId,
        ctx.repos,
        operationAt(new Date()),
        "198.51.100.2",
      ),
    ).rejects.toBeInstanceOf(ActionError);
  });

  it("blocks single ip when ip limit is exceeded across users", async () => {
    const kit = createSecurityTestKit(ctx);
    await kit.consumeIpLimit("leads.request", "198.51.100.99");

    await expect(
      checkActionRateLimit(
        "leads.request",
        ctx.fixtures.users.execOne.id,
        ctx.repos,
        operationAt(new Date()),
        "198.51.100.99",
      ),
    ).rejects.toBeInstanceOf(ActionError);
  });

  it("isolates counters by action name", async () => {
    const { userLimit } = ACTION_RATE_LIMIT_POLICY["leads.request"];
    const userId = ctx.fixtures.users.execOne.id;
    for (let index = 0; index < userLimit; index += 1) {
      await checkActionRateLimit(
        "leads.request",
        userId,
        ctx.repos,
        operationAt(new Date()),
        "198.51.100.1",
      );
    }

    await expect(
      checkActionRateLimit(
        "team.invite.create",
        userId,
        ctx.repos,
        operationAt(new Date()),
        "198.51.100.1",
      ),
    ).resolves.toBeUndefined();
  });
});
