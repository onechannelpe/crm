import { describe, expect, it } from "vitest";

import type { LeadState } from "../../src/server/leads/domain/lead-pipeline";
import {
  applyPrioridadReview,
  applyStatusReview,
  completeCommercialInput,
} from "../../src/server/leads/domain/lead-pipeline";

function makeLead(overrides: Partial<LeadState> = {}): LeadState {
  return {
    id: 11,
    ruc: "20100000001",
    razon_social: "Org Test",
    address: "Av. Test 123",
    executive_id: 1,
    stage: "PENDING_EXTERNAL_REVIEW",
    status: null,
    prioridad: null,
    created_at: 100,
    updated_at: 100,
    ...overrides,
  };
}

describe("pipeline lead domain", () => {
  it("rejects the lead when a rejected status arrives during external review", () => {
    const result = applyStatusReview({
      lead: makeLead(),
      status: "CARTERIZADO",
      actorId: 2,
      branchId: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.nextStage).toBe("REJECTED_BY_STATUS");
    expect(result.value.events).toEqual([]);
  });

  it("moves to executive input when prioridad is SIN RESULTADO", () => {
    const result = applyPrioridadReview({
      lead: makeLead({ status: "DISPONIBLE" }),
      prioridad: "SIN RESULTADO",
      branchId: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.nextStage).toBe("NEEDS_EXECUTIVE_INPUT");
    expect(result.value.events).toEqual([
      {
        type: "lead_needs_executive_input",
        leadId: 11,
        executiveId: 1,
        ruc: "20100000001",
      },
    ]);
  });

  it("moves to quotation when status and prioridad are both valid", () => {
    const result = applyStatusReview({
      lead: makeLead({ prioridad: "P1" }),
      status: "DISPONIBLE",
      actorId: 2,
      branchId: 7,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.nextStage).toBe("READY_FOR_QUOTATION");
    expect(result.value.events).toEqual([
      {
        type: "lead_ready_for_quotation",
        leadId: 11,
        branchId: 7,
        ruc: "20100000001",
      },
    ]);
  });

  it("only allows the assigned executive to complete commercial input", () => {
    const result = completeCommercialInput({
      lead: makeLead({
        stage: "NEEDS_EXECUTIVE_INPUT",
        executive_id: 10,
      }),
      actorId: 9,
      proveedorActual: "Banco A",
      tasaActual: 1.2,
      gpv: 1000,
      ticket: 50,
      abono: 10,
      cantidadPos: 2,
      now: 200,
      branchId: 1,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe("not_owner");
  });
});
