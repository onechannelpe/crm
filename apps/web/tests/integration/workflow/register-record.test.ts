import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import {
  registerLead,
  registerLeadAndLoadSnapshot,
} from "@tests/support/workflow/register";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("register lead", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("workflow-register-record");
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("reuses an existing organization for the same RUC", async () => {
    const snapshot = await registerLeadAndLoadSnapshot({
      runtime,
      ruc: "20100000001",
    });

    expect(snapshot.organizationRuc).toBe("20100000001");
    expect(snapshot.organizationName).toBe("Org Lima");
  });

  it("creates organization with RUC as name when RUC is new", async () => {
    const result = await registerLead({
      runtime,
      ruc: "20912345671",
    });

    expect(result.snapshot.organizationRuc).toBe("20912345671");
    expect(result.snapshot.organizationName).toBe("20912345671");
    expect(result.snapshot.organizationAddress).toBeNull();
    expect(result.historyEventTypes).toEqual([
      "lead_registered",
      "lead_assigned",
    ]);
  });

  it("creates organization with RUC fallback when enrichment is unavailable", async () => {
    const snapshot = await registerLeadAndLoadSnapshot({
      runtime,
      ruc: "20912345672",
    });

    expect(snapshot.organizationRuc).toBe("20912345672");
    expect(snapshot.organizationName).toBe("20912345672");
    expect(snapshot.organizationAddress).toBeNull();
  });

  it("seeds the commercial profile so the lead is qualifiable from the export", async () => {
    const result = await registerLead({
      runtime,
      ruc: "20912345673",
      currentProvider: "Izipay",
      currentDebitRate: 2.9,
      currentCreditRate: 3.4,
      gpv: 80000,
      ticket: 150,
      giroNegocio: "Gastronomía",
      posCount: 4,
    });

    expect(result.profile).toEqual({
      currentProvider: "Izipay",
      currentDebitRate: 2.9,
      currentCreditRate: 3.4,
      gpv: 80000,
      ticket: 150,
      settlementBank: expect.any(String),
      posCount: 4,
    });
    expect(result.snapshot.organizationGiroNegocio).toBe("Gastronomía");
  });
});
