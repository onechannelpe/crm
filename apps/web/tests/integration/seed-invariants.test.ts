import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { asUserId } from "../../src/server/shared/ids";
import { cleanupTestDb, createIsolatedTestDb } from "../support/test-db";

describe("seed invariants", () => {
  let ctx: any;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("seed-invariants");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("ensures superuser exists after seed", async () => {
    const superuser = await ctx.db
      .selectFrom("users")
      .selectAll()
      .where("id", "=", asUserId("1"))
      .executeTakeFirst();

    expect(superuser).toBeDefined();
    expect(superuser?.role).toBe("superuser");
  });
});
