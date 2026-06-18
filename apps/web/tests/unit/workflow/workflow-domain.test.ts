import { describe, expect, it } from "vitest";

import { resolveReviewTransition } from "~/server/workflow/domain/workflow";

describe("workflow domain", () => {
  it("disqualifies the record when a rejected status arrives during qualifying", () => {
    const result = resolveReviewTransition({
      status: "CARTERIZADO",
      priority: "P1",
    });

    expect(result).toBe("DISQUALIFIED");
  });

  it("moves to pricing when priority is SIN RESULTADO", () => {
    const result = resolveReviewTransition({
      status: "DISPONIBLE",
      priority: "SIN RESULTADO",
    });

    expect(result).toBe("PRICING");
  });

  it("moves to pricing when status and priority are valid", () => {
    const result = resolveReviewTransition({
      status: "DISPONIBLE",
      priority: "P1",
    });

    expect(result).toBe("PRICING");
  });
});
