import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { asUserId, asBranchId } from "../../src/server/shared/ids";
import { SALES_ERROR_MANIFEST } from "../support/security-manifests";
import type { TestDbContext } from "../support/test-db";
import { cleanupTestDb, createIsolatedTestDb } from "../support/test-db";

describe("security invariants manifest", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("security-invariants");
    await ctx.db
      .insertInto("users")
      .values([
        {
          id: asUserId("1"),
          branch_id: asBranchId("1"),
          team_id: null,
          username: "admin.one",
          email: "admin1@test.local",
          password_hash: "hash",
          names: "Admin",
          first_surname: "One",
          second_surname: "Alpha",
          phone_e164: "+51990000111",
          onboarding_completed_at: Date.now(),
          role: "admin",
          is_active: 1,
          created_at: Date.now(),
        },
      ])
      .execute();
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  const emptyClient = {
    ruc: null,
    companyName: null,
    contactName: null,
    dni: null,
    phones: [],
    engineMatchId: null,
    completenessScore: 0,
  };

  async function createSubmittableRecord(ctx: TestDbContext) {
    const res = await ctx.salesRecords.createDraft({
      executiveUserId: asUserId("1"),
      branchId: asBranchId("1"),
      source: "manual",
      leadAssignmentId: null,
      client: { ...emptyClient, companyName: "Org Lima" },
      addresses: [
        {
          addressType: "installation",
          fullText: "Lima",
          department: "Lima",
          province: "Lima",
          district: "Lima",
          ubigeo: "150101",
          latitude: null,
          longitude: null,
          isPrimary: true,
        },
      ],
      products: [{ productId: 1, quantity: 1 }],
    });
    if (!res.ok) throw new Error("Failed to create draft");
    const recordId = res.value;

    return recordId;
  }

  it("denies confirmation to cross-branch users", async () => {
    await ctx.db
      .insertInto("users")
      .values([
        {
          id: asUserId("2"),
          branch_id: asBranchId("2"),
          team_id: null,
          username: "admin.two",
          email: "admin2@test.local",
          password_hash: "hash",
          names: "Admin",
          first_surname: "Two",
          second_surname: "Beta",
          phone_e164: "+51990000112",
          onboarding_completed_at: Date.now(),
          role: "admin",
          is_active: 1,
          created_at: Date.now(),
        },
      ])
      .execute();

    const recordId = await createSubmittableRecord(ctx);
    const res = await ctx.salesRecords.submit(recordId, asUserId("1"));
    if (!res.ok) throw new Error("Failed to submit");

    const denied = await ctx.salesRecords.confirm(
      recordId,
      asUserId("2"),
      asBranchId("2"),
      false,
    );
    expect(denied.ok).toBe(false);
    if (denied.ok) throw new Error("Expected cross-branch confirm to fail");

    expect(denied.error.message).toBe(SALES_ERROR_MANIFEST.crossBranchConfirm);
  });

  it("denies rejection to users without permissions", async () => {
    await ctx.db
      .insertInto("users")
      .values([
        {
          id: asUserId("3"),
          branch_id: asBranchId("1"),
          team_id: null,
          username: "exec.one",
          email: "exec1@test.local",
          password_hash: "hash",
          names: "Exec",
          first_surname: "One",
          second_surname: "Gamma",
          phone_e164: "+51990000113",
          onboarding_completed_at: Date.now(),
          role: "executive",
          is_active: 1,
          created_at: Date.now(),
        },
      ])
      .execute();

    const recordId = await createSubmittableRecord(ctx);
    const res = await ctx.salesRecords.submit(recordId, asUserId("1"));
    if (!res.ok) throw new Error("Failed to submit");

    const denied = await ctx.salesRecords.reject(
      recordId,
      asUserId("3"),
      asBranchId("1"),
      false,
      "Reason",
    );
    expect(denied.ok).toBe(false);
    if (denied.ok)
      throw new Error("Expected reject without permission to fail");
  });

  it("validates data integrity before allowing submission", async () => {
    const rB = await ctx.salesRecords.createDraft({
      executiveUserId: asUserId("1"),
      branchId: asBranchId("1"),
      source: "manual",
      leadAssignmentId: null,
      client: emptyClient,
      addresses: [],
      products: [],
    });
    if (!rB.ok) {
      throw new Error("Expected incomplete draft creation to succeed");
    }
    const missingProductsSubmit = await ctx.salesRecords.submit(
      rB.value,
      asUserId("1"),
    );
    expect(missingProductsSubmit.ok).toBe(false);
    if (missingProductsSubmit.ok) {
      throw new Error("Expected missing-products submit contract to fail");
    }

    const recordId = await createSubmittableRecord(ctx);
    const submitted = await ctx.salesRecords.submit(recordId, asUserId("1"));
    expect(submitted.ok).toBe(true);

    const denied = await ctx.salesRecords.confirm(
      recordId,
      asUserId("2"),
      asBranchId("2"),
      false,
    );
    expect(denied.ok).toBe(false);
    if (denied.ok) {
      throw new Error("Expected cross-branch confirm deny contract to fail");
    }

    expect(denied.error.message).toBe(SALES_ERROR_MANIFEST.crossBranchConfirm);

    const rejected = await ctx.salesRecords.reject(
      recordId,
      asUserId("1"),
      asBranchId("1"),
      false,
      " ",
    );
    expect(rejected.ok).toBe(false);
    if (rejected.ok) {
      throw new Error("Expected empty-reason reject deny contract to fail");
    }

    expect(rejected.error.message).toBe(
      SALES_ERROR_MANIFEST.emptyRejectionReason,
    );
  });
});
