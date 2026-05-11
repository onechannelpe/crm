import { describe, expect, it } from "vitest";

import type { QualifyingLeadSubject } from "~/server/workflow/domain/lead-subjects";
import { resolveReviewTransition } from "~/server/workflow/domain/workflow";

const qualifyingLead: QualifyingLeadSubject = {
  id: "lead-1",
  organizationId: "01974fd5-f261-7a7d-93f5-2f3d0f963111",
  ruc: "20123456789",
  razonSocial: "Acme SAC",
  address: "Lima",
  district: null,
  department: null,
  executiveId: 7,
  createdBy: 7,
  updatedBy: null,
  stage: "QUALIFYING",
  status: null,
  prioridad: null,
  createdAt: 1,
  updatedAt: 1,
};

describe("workflow domain", () => {
  it("disqualifies the record when a rejected status arrives during qualifying", () => {
    const result = resolveReviewTransition({
      lead: qualifyingLead,
      status: "CARTERIZADO",
      prioridad: "P1",
    });

    expect(result).toBe("DISQUALIFIED");
  });

  it("moves to scoping when prioridad is SIN RESULTADO", () => {
    const result = resolveReviewTransition({
      lead: qualifyingLead,
      status: "DISPONIBLE",
      prioridad: "SIN RESULTADO",
    });

    expect(result).toBe("SCOPING");
  });

  it("moves to quoting when status and prioridad are valid", () => {
    const result = resolveReviewTransition({
      lead: qualifyingLead,
      status: "DISPONIBLE",
      prioridad: "P1",
    });

    expect(result).toBe("QUOTING");
  });
});
