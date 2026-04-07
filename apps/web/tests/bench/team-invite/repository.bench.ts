import { afterAll, beforeAll, bench, describe } from "vitest";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../../support/test-db";
import { BENCH_NOW } from "../_shared/constants";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { QUERY_POOL_SIZE, seedTeamInviteFixtures } from "./fixtures";

describe("team invite repository benchmark", () => {
  let ctx: TestDbContext | null = null;
  let pendingInviteTokenHashes: string[] = [];
  const queryCursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-team-invite-repository");
    const fixtures = await seedTeamInviteFixtures(ctx);
    pendingInviteTokenHashes = fixtures.pendingInviteTokenHashes;
  });

  afterAll(async () => {
    if (!ctx) return;
    await cleanupTestDb(ctx);
    ctx = null;
  });

  bench(
    "repository path: load pending invite by token hash",
    async () => {
      const tokenHash = takeFromPool(
        pendingInviteTokenHashes,
        queryCursor,
        "team-invite repository pool exhausted before iterations completed",
      );

      const row = await ctx!.repos.userInvites.findPendingByTokenHash(
        tokenHash,
        BENCH_NOW,
      );
      if (!row) {
        throw new Error("expected pending invite row for token hash");
      }
    },
    fixedIterations(QUERY_POOL_SIZE),
  );
});
