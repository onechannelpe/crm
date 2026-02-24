import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("sales records workflow service", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("sales-records-service");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("creates draft with client snapshot, addresses and products", async () => {
    const result = await ctx.salesRecords.createDraft({
      source: "manual",
      executiveUserId: 1,
      branchId: 1,
      leadAssignmentId: null,
      client: {
        ruc: "20100000999",
        companyName: "Org Perf",
        contactName: "Contacto Lima",
        dni: "70000001",
        phones: ["+51999999111"],
        engineMatchId: null,
        completenessScore: 80,
      },
      addresses: [
        {
          addressType: "installation",
          fullText: "Av. Demo 123",
          department: "Lima",
          province: "Lima",
          district: "Miraflores",
          ubigeo: "150122",
          latitude: null,
          longitude: null,
          isPrimary: true,
        },
      ],
      products: [{ productId: 1, quantity: 2 }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected draft creation success");

    const client = await ctx.repos.salesRecords.findClientByRecord(
      result.value,
    );
    const addresses = await ctx.repos.salesRecords.findAddressesByRecord(
      result.value,
    );
    const products = await ctx.repos.salesRecords.findProductsByRecord(
      result.value,
    );

    expect(client).toBeDefined();
    expect(addresses).toHaveLength(1);
    expect(products).toHaveLength(1);
  });

  it("submits and confirms transitions with branch scope", async () => {
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
    if (!created.ok) throw new Error("Expected draft creation success");

    const submitted = await ctx.salesRecords.submit(created.value, 1);
    expect(submitted.ok).toBe(true);

    const blocked = await ctx.salesRecords.confirm(created.value, 4, 2, false);
    expect(blocked.ok).toBe(false);
    if (blocked.ok) throw new Error("Expected branch scope block");
    expect(blocked.error).toBe(
      "Cannot confirm a sales record from another branch",
    );

    const confirmed = await ctx.salesRecords.confirm(
      created.value,
      2,
      1,
      false,
    );
    expect(confirmed.ok).toBe(true);

    const row = await ctx.repos.salesRecords.findById(created.value);
    expect(row?.status).toBe("confirmed");

    const logs = await ctx.repos.auditLogs.findByEntity(
      "sales_record",
      created.value,
    );
    expect(logs.some((log) => log.action === "sales_record_submitted")).toBe(
      true,
    );
    expect(logs.some((log) => log.action === "sales_record_confirmed")).toBe(
      true,
    );
  });

  it("requires rejection reason", async () => {
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
    if (!created.ok) throw new Error("Expected draft creation success");

    const submitted = await ctx.salesRecords.submit(created.value, 1);
    expect(submitted.ok).toBe(true);

    const rejected = await ctx.salesRecords.reject(
      created.value,
      2,
      1,
      false,
      " ",
    );
    expect(rejected.ok).toBe(false);
    if (rejected.ok) throw new Error("Expected reject validation failure");
    expect(rejected.error).toBe("Rejection reason is required");
  });
});
