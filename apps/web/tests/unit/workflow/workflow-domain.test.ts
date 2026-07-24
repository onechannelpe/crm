import { describe, expect, it } from "vitest";

import { resolveReviewTransition } from "~/server/workflow/lead/domain/review";

describe("workflow domain", () => {
  it("disqualifies the record when a rejected status arrives during qualifying", () => {
    expect(resolveReviewTransition("CARTERIZADO")).toBe("DISQUALIFIED");
    expect(resolveReviewTransition("STOCK")).toBe("DISQUALIFIED");
  });

  it("moves to pricing when the status is available", () => {
    expect(resolveReviewTransition("DISPONIBLE")).toBe("PRICING");
  });

  it("moves to pricing when the status is SIN RESULTADO", () => {
    expect(resolveReviewTransition("SIN RESULTADO")).toBe("PRICING");
  });
});
