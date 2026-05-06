import { describe, expect, it, vi } from "vitest";

import {
  getErrorMessage,
  reportBoundaryError,
} from "~/components/feedback/error/boundary-utils";

describe("app error boundary helpers", () => {
  it("returns error message for Error instances", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns fallback message for unknown errors", () => {
    expect(getErrorMessage("boom")).toBe("Unexpected application error");
    expect(getErrorMessage({})).toBe("Unexpected application error");
  });

  it("reports boundary failures with app-root context", () => {
    const errorLog = vi.fn<(event: string, payload: unknown) => void>();
    const error = new Error("render failed");

    reportBoundaryError({ error: errorLog }, error);

    expect(errorLog).toHaveBeenCalledTimes(1);
    expect(errorLog).toHaveBeenCalledWith(
      "ui_boundary_error",
      expect.objectContaining({
        boundary: "app-root",
        error,
      }),
    );
  });
});
