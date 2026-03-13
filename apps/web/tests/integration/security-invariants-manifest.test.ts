import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getPermissions, ROLES } from "../../src/lib/auth/access/rbac";
import { createQuotaService } from "../../src/server/quota/service";
import {
  PERMISSION_MANIFEST,
  QUOTA_ERROR_MANIFEST,
  SALES_ERROR_MANIFEST,
} from "../support/security-manifests";
import type { TestDbContext } from "../support/test-db";
import { cleanupTestDb, createIsolatedTestDb } from "../support/test-db";

async function createSubmittableRecord(ctx: TestDbContext) {
  const created = await ctx.salesRecords.createDraft({
    source: "manual",
    executiveUserId: 1,
    branchId: 1,
    leadAssignmentId: null,
    client: {
      ruc: null,
      companyName: "Org Lima",
      contactName: "Contacto Lima",
      dni: "70000001",
      phones: ["+51999999111"],
      engineMatchId: null,
      completenessScore: 60,
    },
    addresses: [
      {
        addressType: "installation",
        fullText: "Av. Demo 123",
        department: null,
        province: null,
        district: null,
        ubigeo: null,
        latitude: null,
        longitude: null,
        isPrimary: true,
      },
    ],
    products: [{ productId: 1, quantity: 1 }],
  });
  expect(created.ok).toBe(true);
  if (!created.ok) {
    throw new Error("Expected sales record draft creation to succeed");
  }
  return created.value;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

describe("security invariant manifest", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("security-manifest");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("enforces exact RBAC permission manifest", () => {
    for (const role of ROLES) {
      const expected = PERMISSION_MANIFEST[role];
      const actual = [...getPermissions(role)].toSorted();
      expect(actual).toEqual([...expected].toSorted());
    }
  });

  it("enforces sales workflow deny contracts", async () => {
    const rA = await ctx.salesRecords.createDraft({
      source: "manual",
      executiveUserId: 1,
      branchId: 1,
      leadAssignmentId: null,
      client: {
        ruc: null,
        companyName: "Org A",
        contactName: "Contact A",
        dni: "70000011",
        phones: [],
        engineMatchId: null,
        completenessScore: 10,
      },
      addresses: [],
      products: [{ productId: 1, quantity: 1 }],
    });
    expect(rA.ok).toBe(true);
    if (!rA.ok) {
      throw new Error("Expected incomplete draft creation to succeed");
    }
    const missingAddressesSubmit = await ctx.salesRecords.submit(rA.value, 1);
    expect(missingAddressesSubmit.ok).toBe(false);
    if (missingAddressesSubmit.ok) {
      throw new Error("Expected missing-addresses submit contract to fail");
    }
    expect(missingAddressesSubmit.error.message).toBe(
      SALES_ERROR_MANIFEST.submitMissingAddresses,
    );

    const rB = await ctx.salesRecords.createDraft({
      source: "manual",
      executiveUserId: 1,
      branchId: 1,
      leadAssignmentId: null,
      client: {
        ruc: null,
        companyName: "Org B",
        contactName: "Contact B",
        dni: "70000012",
        phones: [],
        engineMatchId: null,
        completenessScore: 10,
      },
      addresses: [
        {
          addressType: "installation",
          fullText: "Av. Demo 123",
          department: null,
          province: null,
          district: null,
          ubigeo: null,
          latitude: null,
          longitude: null,
          isPrimary: true,
        },
      ],
      products: [],
    });
    expect(rB.ok).toBe(true);
    if (!rB.ok) {
      throw new Error("Expected incomplete draft creation to succeed");
    }
    const missingProductsSubmit = await ctx.salesRecords.submit(rB.value, 1);
    expect(missingProductsSubmit.ok).toBe(false);
    if (missingProductsSubmit.ok) {
      throw new Error("Expected missing-products submit contract to fail");
    }
    expect(missingProductsSubmit.error.message).toBe(
      SALES_ERROR_MANIFEST.submitMissingProducts,
    );

    const recordId = await createSubmittableRecord(ctx);
    const submitted = await ctx.salesRecords.submit(recordId, 1);
    expect(submitted.ok).toBe(true);

    const denied = await ctx.salesRecords.confirm(recordId, 4, 2, false);
    expect(denied.ok).toBe(false);
    if (denied.ok) {
      throw new Error("Expected cross-branch confirm deny contract to fail");
    }

    expect(denied.error.message).toBe(SALES_ERROR_MANIFEST.crossBranchConfirm);

    const rejected = await ctx.salesRecords.reject(recordId, 2, 1, false, " ");
    expect(rejected.ok).toBe(false);
    if (rejected.ok) {
      throw new Error("Expected empty-reason reject deny contract to fail");
    }
    expect(rejected.error.message).toBe(
      SALES_ERROR_MANIFEST.emptyRejectionReason,
    );
  });

  it("enforces quota deny contracts", async () => {
    const quota = createQuotaService(ctx.repos);
    const day = today();

    const first = await quota.allocate(2, 1, 2, day);
    expect(first.ok).toBe(true);

    const duplicate = await quota.allocate(2, 1, 1, day);
    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) {
      throw new Error("Expected duplicate daily allocation to fail");
    }
    expect(duplicate.error.message).toBe(
      QUOTA_ERROR_MANIFEST.duplicateDailyAllocation,
    );

    const c1 = await quota.consume(1, 1);
    const c2 = await quota.consume(1, 1);
    expect(c1.ok).toBe(true);
    expect(c2.ok).toBe(true);
    if (!c1.ok || !c2.ok) {
      throw new Error("Expected first two quota consume calls to succeed");
    }
    expect(c1.value).toBe(1);
    expect(c2.value).toBe(0);

    const exhausted = await quota.consume(1, 1);
    expect(exhausted.ok).toBe(false);
    if (exhausted.ok) {
      throw new Error("Expected exhausted quota contract to fail");
    }
    expect(exhausted.error.message).toBe(QUOTA_ERROR_MANIFEST.exhausted2of2);
  });
});
