import { afterAll, beforeAll, bench, describe } from "vitest";

import { BENCH_NOW } from "../_shared/constants";
import { createBenchDbFixture } from "../_shared/fixture";
import { seedPendingInvite } from "./fixtures";

describe("team invite repository benchmark", () => {
  const db = createBenchDbFixture("bench-team-invite-repository");
  let tokenHash: string;

  beforeAll(async () => {
    const ctx = await db.setup();
    tokenHash = (await seedPendingInvite(ctx)).tokenHash;
  });

  afterAll(async () => {
    await db.teardown();
  });

  bench("repository path: load pending invite by token hash", async () => {
    const row = await db
      .ctx()
      .repos.userInvites.findPendingByTokenHash(tokenHash, BENCH_NOW);
    if (!row) {
      throw new Error("expected pending invite row for token hash");
    }
  });
});
