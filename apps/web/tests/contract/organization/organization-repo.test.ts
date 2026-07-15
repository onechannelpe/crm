import {
  cleanupTestDb,
  createIsolatedTestDb,
  resetTestDb,
  TEST_FIXTURES,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

describe("organization repository applyEnrichment", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("organization-repo");
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  beforeEach(async () => {
    await resetTestDb(ctx);
  });

  it("patches only the provided fields and leaves the rest untouched", async () => {
    const { ruc } = TEST_FIXTURES.organizations.lima;

    await ctx.repos.organization.applyEnrichment({
      ruc,
      legalName: "Acme SAC",
      district: "Miraflores",
    });

    const row = await ctx.db
      .selectFrom("organizations")
      .selectAll()
      .where("ruc", "=", ruc)
      .executeTakeFirstOrThrow();

    expect(row.legal_name).toBe("Acme SAC");
    expect(row.district).toBe("Miraflores");
    expect(row.address).toBeNull();
    expect(row.department).toBeNull();
  });

  it("is a no-op against the row when no fields are provided", async () => {
    const { ruc } = TEST_FIXTURES.organizations.lima;
    const before = await ctx.db
      .selectFrom("organizations")
      .selectAll()
      .where("ruc", "=", ruc)
      .executeTakeFirstOrThrow();

    await ctx.repos.organization.applyEnrichment({ ruc });

    const after = await ctx.db
      .selectFrom("organizations")
      .selectAll()
      .where("ruc", "=", ruc)
      .executeTakeFirstOrThrow();
    expect(after).toEqual(before);
  });

  it("does not match a different organization's ruc", async () => {
    const { ruc } = TEST_FIXTURES.organizations.norte;

    await ctx.repos.organization.applyEnrichment({
      ruc: TEST_FIXTURES.organizations.lima.ruc,
      legalName: "Acme SAC",
    });

    const row = await ctx.db
      .selectFrom("organizations")
      .selectAll()
      .where("ruc", "=", ruc)
      .executeTakeFirstOrThrow();
    expect(row.legal_name).toBe("Org Norte");
  });
});
