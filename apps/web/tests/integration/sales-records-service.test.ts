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

  it("allows incomplete drafts but blocks submission until completed", async () => {
    const result = await ctx.salesRecords.createDraft({
      source: "manual",
      executiveUserId: 1,
      branchId: 1,
      leadAssignmentId: null,
      client: {
        ruc: "20100000001",
        companyName: "Org Lima",
        contactName: "Contacto Lima",
        dni: "70000001",
        phones: ["+51999999111"],
        engineMatchId: null,
        completenessScore: 60,
      },
      addresses: [],
      products: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected draft creation success");

    const row = await ctx.repos.salesRecords.findById(result.value);
    const addresses = await ctx.repos.salesRecords.findAddressesByRecord(
      result.value,
    );
    const products = await ctx.repos.salesRecords.findProductsByRecord(
      result.value,
    );
    expect(row?.status).toBe("draft");
    expect(addresses).toHaveLength(0);
    expect(products).toHaveLength(0);

    const submitted = await ctx.salesRecords.submit(result.value, 1);
    expect(submitted.ok).toBe(false);
    if (submitted.ok) throw new Error("Expected submit validation failure");
    expect(submitted.error.code).toBe("invalid_data");
    expect(submitted.error.message).toBe(
      "At least one address is required before submit",
    );
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
    expect(blocked.error.code).toBe("forbidden");
    expect(blocked.error.message).toBe(
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
      `${created.value}`,
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
    expect(rejected.error.code).toBe("invalid_data");
    expect(rejected.error.message).toBe("Rejection reason is required");
  });

  it("does not persist a draft when product lookup fails", async () => {
    const before = await ctx.repos.salesRecords.listByExecutive(1, 100);

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
      products: [{ productId: 999_999, quantity: 1 }],
    });

    expect(created.ok).toBe(false);
    if (created.ok) throw new Error("Expected product validation failure");
    expect(created.error.code).toBe("not_found");

    const after = await ctx.repos.salesRecords.listByExecutive(1, 100);
    expect(after).toHaveLength(before.length);
  });

  it("updates rejected drafts and allows resubmission", async () => {
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
      "Fix data",
    );
    expect(rejected.ok).toBe(true);

    const updated = await ctx.salesRecords.updateDraft(created.value, 1, {
      client: {
        ruc: "20100000999",
        companyName: "Org Lima Updated",
        contactName: "Contacto Lima Updated",
        dni: "70000009",
        phones: ["+51999999119"],
        engineMatchId: null,
        completenessScore: 90,
      },
      addresses: [
        {
          addressType: "installation",
          fullText: "Av. Updated 456",
          department: null,
          province: null,
          district: null,
          ubigeo: null,
          latitude: null,
          longitude: null,
          isPrimary: true,
        },
      ],
      products: [{ productId: 1, quantity: 3 }],
    });
    expect(updated.ok).toBe(true);

    const client = await ctx.repos.salesRecords.findClientByRecord(
      created.value,
    );
    const addresses = await ctx.repos.salesRecords.findAddressesByRecord(
      created.value,
    );
    const products = await ctx.repos.salesRecords.findProductsByRecord(
      created.value,
    );
    expect(client?.company_name).toBe("Org Lima Updated");
    expect(addresses[0]?.full_text).toBe("Av. Updated 456");
    expect(products[0]?.product_id).toBe(1);
    expect(products[0]?.quantity).toBe(3);

    const resubmitted = await ctx.salesRecords.submit(created.value, 1);
    expect(resubmitted.ok).toBe(true);
    const row = await ctx.repos.salesRecords.findById(created.value);
    expect(row?.status).toBe("submitted_for_confirmation");
  });

  it("registers attempts only while pending confirmation", async () => {
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

    const blockedInDraft = await ctx.salesRecords.registerAttempt(
      created.value,
      2,
      1,
      false,
      "no_answer",
      "Call pending",
      Date.now() + 60_000,
    );
    expect(blockedInDraft.ok).toBe(false);
    if (blockedInDraft.ok) {
      throw new Error("Expected attempt to be blocked for draft state");
    }
    expect(blockedInDraft.error.code).toBe("invalid_state");

    const submitted = await ctx.salesRecords.submit(created.value, 1);
    expect(submitted.ok).toBe(true);

    const recorded = await ctx.salesRecords.registerAttempt(
      created.value,
      2,
      1,
      false,
      "callback_scheduled",
      "Try after lunch",
      Date.now() + 60_000,
    );
    expect(recorded.ok).toBe(true);

    const attempts = await ctx.repos.salesRecords.listAttemptsByRecord(
      created.value,
    );
    expect(attempts).toHaveLength(1);
    expect(attempts[0]?.outcome).toBe("callback_scheduled");
  });
});
