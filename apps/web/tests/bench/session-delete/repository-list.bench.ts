import { afterAll, beforeAll, bench, describe } from "vitest";

import type { UserId } from "~/server/shared/ids";

import { createBenchDbFixture } from "../_shared/fixture";
import { SESSIONS_PER_USER, seedBenchUser, setUserSessions } from "./fixtures";

describe("sessions.listForUser", () => {
  const db = createBenchDbFixture("bench-session-list");
  let userId: UserId;

  beforeAll(async () => {
    const ctx = await db.setup();
    userId = await seedBenchUser(ctx);
    await setUserSessions(ctx, userId, SESSIONS_PER_USER);

    // Guard against a silently empty benchmark: verify the seed produced the
    // expected working set once, outside the measured call.
    const rows = await ctx.repos.sessions.listForUser(userId);
    if (rows.length !== SESSIONS_PER_USER) {
      throw new Error(
        `expected ${SESSIONS_PER_USER} sessions, seeded ${rows.length}`,
      );
    }
  });

  afterAll(async () => {
    await db.teardown();
  });

  // Read path: idempotent, so CodSpeed measures one call and repeats it itself.
  bench("list sessions for a heavy user", async () => {
    await db.ctx().repos.sessions.listForUser(userId);
  });
});
