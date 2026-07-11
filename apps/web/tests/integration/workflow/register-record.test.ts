import {
  registerLead,
  registerLeadAndLoadSnapshot,
} from "@tests/support/integration/register-lead";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

describe("register lead", () => {
  let runtime: TestRuntime;

  beforeAll(async () => {
    runtime = await createTestRuntime("workflow-register-record");
  });

  afterAll(async () => {
    await runtime.dispose();
  });

  beforeEach(async () => {
    await runtime.reset();
  });

  it("reuses an existing organization for the same RUC", async () => {
    const snapshot = await registerLeadAndLoadSnapshot({
      runtime,
      ruc: "20100000001",
    });

    expect(snapshot.organizationRuc).toBe("20100000001");
    expect(snapshot.organizationLegalName).toBe("Org Lima");
  });

  it("creates organization with pending identity when RUC is new", async () => {
    const result = await registerLead({
      runtime,
      ruc: "20912345671",
    });

    expect(result.snapshot.organizationRuc).toBe("20912345671");
    expect(result.snapshot.organizationLegalName).toBeNull();
    expect(result.snapshot.organizationAddress).toBeNull();
    expect(result.historyEventTypes).toEqual([
      "lead_registered",
      "lead_assigned",
    ]);
  });

  it("seeds organization identity from enrichment when available", async () => {
    runtime.engine.company("20912345672", {
      legalName: "Acme SAC",
      address: "Av. Lima 123",
    });
    const snapshot = await registerLeadAndLoadSnapshot({
      runtime,
      ruc: "20912345672",
    });

    expect(snapshot.organizationRuc).toBe("20912345672");
    expect(snapshot.organizationLegalName).toBe("Acme SAC");
    expect(snapshot.organizationAddress).toBe("Av. Lima 123");
  });

  it("stores the commercial snapshot on the lead row", async () => {
    const result = await registerLead({
      runtime,
      ruc: "20912345673",
      currentProvider: "Izipay",
      currentDebitRate: 2.9,
      currentCreditRate: 3.4,
      gpv: 80000,
      ticket: 150,
      lineOfBusiness: "Gastronomía",
      posCount: 4,
    });

    expect(result.commercial).toEqual({
      currentProvider: "Izipay",
      currentDebitRate: 2.9,
      currentCreditRate: 3.4,
      gpv: 80000,
      ticket: 150,
      settlementBank: expect.any(String),
      posCount: 4,
    });
    expect(result.snapshot.organizationLineOfBusiness).toBe("Gastronomía");
  });
});
