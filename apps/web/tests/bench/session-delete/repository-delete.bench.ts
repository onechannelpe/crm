import { afterAll, beforeAll, beforeEach, bench, describe } from "vitest";

import type { UserId } from "~/domain/ids";

import { createBenchDbFixture } from "../_shared/fixture";
import { SINGLE_CALL } from "../_shared/options";
import { SESSIONS_PER_USER, seedBenchUser, setUserSessions } from "./fixtures";

describe("sessions.deleteAllForUser", () => {
  const db = createBenchDbFixture("bench-session-delete");
  let userId: UserId;

  beforeAll(async () => {
    const ctx = await db.setup();
    userId = await seedBenchUser(ctx);
  });

  beforeEach(async () => {
    await setUserSessions(db.ctx(), userId, SESSIONS_PER_USER);
  });

  afterAll(async () => {
    await db.teardown();
  });

  bench(
    "delete all sessions for a heavy user",
    async () => {
      await db.ctx().repos.sessions.deleteAllForUser(userId);
    },
    SINGLE_CALL,
  );
});
