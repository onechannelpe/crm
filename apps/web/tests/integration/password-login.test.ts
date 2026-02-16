import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "../../src/lib/auth/password/password";
import { authenticatePasswordLogin } from "../../src/lib/auth/password/password-login";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("password login service", () => {
  let ctx: TestDbContext;
  const ipAddress = "198.51.100.44";
  const userAgent = "vitest-agent";
  const email = "exec1@test.local";
  const rightPassword = "Secret123!";

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    ctx = await createIsolatedTestDb("password-login");
    await ctx.db
      .updateTable("users")
      .set({ password_hash: await hashPassword(rightPassword) })
      .where("id", "=", 1)
      .execute();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await cleanupTestDb(ctx);
  });

  function runSeries(
    count: number,
    task: (index: number) => Promise<void>,
  ): Promise<void> {
    return Array.from({ length: count }).reduce<Promise<void>>(
      (prev, _, index) => prev.then(() => task(index)),
      Promise.resolve(),
    );
  }

  it("blocks further attempts after repeated failures", async () => {
    await runSeries(6, async () => {
      try {
        await authenticatePasswordLogin(
          { email, password: "wrong", ipAddress, userAgent },
          ctx.repos,
        );
      } catch {}
    });

    await expect(
      authenticatePasswordLogin(
        { email, password: rightPassword, ipAddress, userAgent },
        ctx.repos,
      ),
    ).rejects.toThrow("Invalid credentials");
  });

  it("creates session with request metadata on successful auth", async () => {
    const result = await authenticatePasswordLogin(
      { email, password: rightPassword, ipAddress, userAgent },
      ctx.repos,
    );

    expect(result.userId).toBe(1);
    const session = await ctx.repos.sessions.listForUser(1);
    expect(session[0]?.ip_address).toBe(ipAddress);
    expect(session[0]?.user_agent).toBe(userAgent);
  });
});
