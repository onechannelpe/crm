import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { hasPermission } from "../../src/lib/auth/access/rbac";
import { SALES_ERROR_MANIFEST } from "../support/security-manifests";
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

describe("security invariant manifest", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("security-manifest");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("enforces RBAC security invariants for the pipeline roles", () => {
    expect(hasPermission("executive", "lead:register")).toBe(true);
    expect(hasPermission("executive", "lead:review")).toBe(false);
    expect(hasPermission("executive", "quotation:manage")).toBe(false);
    expect(hasPermission("executive", "integration:manage")).toBe(false);

    expect(hasPermission("back_office", "lead:view:all")).toBe(true);
    expect(hasPermission("back_office", "lead:review")).toBe(true);
    expect(hasPermission("back_office", "quotation:manage")).toBe(true);
    expect(hasPermission("back_office", "integration:manage")).toBe(true);
    expect(hasPermission("back_office", "lead:register")).toBe(false);

    expect(hasPermission("supervisor", "sales:approve")).toBe(true);
    expect(hasPermission("supervisor", "lead:register")).toBe(false);

    expect(hasPermission("admin", "lead:reassign")).toBe(true);
    expect(hasPermission("admin", "quotation:manage")).toBe(true);

    expect(hasPermission("superuser", "integration:manage")).toBe(true);
    expect(hasPermission("superuser", "lead:view:all")).toBe(true);
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
});
