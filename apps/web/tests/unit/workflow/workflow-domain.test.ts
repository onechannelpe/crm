import { describe, expect, it } from "vitest";

import { resolveReviewTransition } from "~/server/workflow/domain/workflow";

describe("workflow domain", () => {
  it("disqualifies the record when a rejected status arrives during qualifying", () => {
    const result = resolveReviewTransition({
      status: "CARTERIZADO",
      prioridad: "P1",
    });

    expect(result).toBe("DISQUALIFIED");
  });

  it("moves to pricing when prioridad is SIN RESULTADO", () => {
    const result = resolveReviewTransition({
      status: "DISPONIBLE",
      prioridad: "SIN RESULTADO",
    });

    expect(result).toBe("PRICING");
  });

  it("moves to pricing when status and prioridad are valid", () => {
    const result = resolveReviewTransition({
      status: "DISPONIBLE",
      prioridad: "P1",
    });

    expect(result).toBe("PRICING");
  });
});
