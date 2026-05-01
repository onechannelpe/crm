import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import {
  registerLead,
  registerLeadAndLoadSnapshot,
} from "@tests/support/workflow/register";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
      enrichByRuc: async () => ({
        razonSocial: "Should Not Replace Existing Org",
        address: "Should Not Replace Existing Address",
      }),
    });

    expect(snapshot.organizationRuc).toBe("20100000001");
    expect(snapshot.organizationName).toBe("Org Lima");
  });

  it("creates organization from enrichment when RUC is new", async () => {
    const auditLog = vi.fn<() => Promise<void>>(async () => undefined);

    const result = await registerLead({
      runtime,
      ruc: "20912345671",
      enrichByRuc: async () => ({
        razonSocial: "Acme SAC",
        address: "Av. Lima 123",
      }),
      commandOverrides: {
        auditService: { log: auditLog },
      },
    });

    expect(result.snapshot.organizationRuc).toBe("20912345671");
    expect(result.snapshot.organizationName).toBe("Acme SAC");
    expect(result.snapshot.organizationAddress).toBe("Av. Lima 123");
    expect(result.historyEventTypes).toEqual([
      "lead_registered",
      "lead_assigned",
    ]);
    expect(auditLog).toHaveBeenCalledTimes(1);
  });

  it("creates organization with RUC fallback when enrichment is unavailable", async () => {
    const snapshot = await registerLeadAndLoadSnapshot({
      runtime,
      ruc: "20912345672",
      enrichByRuc: async () => null,
    });

    expect(snapshot.organizationRuc).toBe("20912345672");
    expect(snapshot.organizationName).toBe("20912345672");
    expect(snapshot.organizationAddress).toBeNull();
  });
});
