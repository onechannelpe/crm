import { describe, expect, it } from "vitest";

import {
  ensureCanCompleteCommercialInput,
  resolveReviewTransition,
} from "../../src/server/pipeline/domain/workflow";

describe("pipeline workflow domain", () => {
  it("rejects the record when a rejected status arrives during external review", () => {
    const result = resolveReviewTransition({
      currentStage: "PENDING_EXTERNAL_REVIEW",
      status: "CARTERIZADO",
      prioridad: "P1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toBe("REJECTED_BY_STATUS");
  });

  it("moves to executive input when prioridad is SIN RESULTADO", () => {
    const result = resolveReviewTransition({
      currentStage: "PENDING_EXTERNAL_REVIEW",
      status: "DISPONIBLE",
      prioridad: "SIN RESULTADO",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toBe("NEEDS_EXECUTIVE_INPUT");
  });

  it("moves to quotation when status and prioridad are valid", () => {
    const result = resolveReviewTransition({
      currentStage: "PENDING_EXTERNAL_REVIEW",
      status: "DISPONIBLE",
      prioridad: "P1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toBe("READY_FOR_QUOTATION");
  });

  it("only allows the assigned executive to complete commercial input", () => {
    const result = ensureCanCompleteCommercialInput({
      stage: "NEEDS_EXECUTIVE_INPUT",
      executiveId: 10,
      actorUserId: 9,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe("not_owner");
  });
});
