import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("client search views repository", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("client-search-views");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("creates and lists views for a user", async () => {
    await ctx.repos.clientSearchViews.create({
      user_id: 1,
      name: "Mis DNIs",
      search_type: "dni",
      query_value: "12345678",
      limit_value: 20,
      is_default: 0,
    });

    const list = await ctx.repos.clientSearchViews.listByUser(1);
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe("Mis DNIs");
    expect(list[0]?.search_type).toBe("dni");
  });

  it("sets a default view atomically for the user", async () => {
    const first = await ctx.repos.clientSearchViews.create({
      user_id: 1,
      name: "View A",
      search_type: "dni",
      query_value: "12345678",
      limit_value: 20,
      is_default: 1,
    });
    const second = await ctx.repos.clientSearchViews.create({
      user_id: 1,
      name: "View B",
      search_type: "ruc",
      query_value: "20100000001",
      limit_value: 20,
      is_default: 0,
    });

    await ctx.repos.clientSearchViews.setDefault(second.id, 1);

    const views = await ctx.repos.clientSearchViews.listByUser(1);
    const viewA = views.find((view) => view.id === first.id);
    const viewB = views.find((view) => view.id === second.id);
    expect(viewA?.is_default).toBe(0);
    expect(viewB?.is_default).toBe(1);
  });
});
