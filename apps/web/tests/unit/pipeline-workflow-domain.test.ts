import { describe, expect, it } from "vitest";

import type { PendingReviewLeadSubject } from "../../src/server/workflow/domain/lead-subjects";
import { resolveReviewTransition } from "../../src/server/workflow/domain/workflow";

const pendingReviewLead: PendingReviewLeadSubject = {
  id: "lead-1",
  ruc: "20123456789",
  razonSocial: "Acme SAC",
  address: "Lima",
  district: null,
  department: null,
  executiveId: 7,
  createdBy: 7,
  updatedBy: null,
  stage: "PENDING_EXTERNAL_REVIEW",
  status: null,
  prioridad: null,
  createdAt: 1,
  updatedAt: 1,
};

describe("pipeline workflow domain", () => {
  it("rejects the record when a rejected status arrives during external review", () => {
    const result = resolveReviewTransition({
      lead: pendingReviewLead,
      status: "CARTERIZADO",
      prioridad: "P1",
    });

    expect(result).toBe("REJECTED_BY_STATUS");
  });

  it("moves to executive input when prioridad is SIN RESULTADO", () => {
    const result = resolveReviewTransition({
      lead: pendingReviewLead,
      status: "DISPONIBLE",
      prioridad: "SIN RESULTADO",
    });

    expect(result).toBe("NEEDS_EXECUTIVE_INPUT");
  });

  it("moves to quotation when status and prioridad are valid", () => {
    const result = resolveReviewTransition({
      lead: pendingReviewLead,
      status: "DISPONIBLE",
      prioridad: "P1",
    });

    expect(result).toBe("READY_FOR_QUOTATION");
  });
});
