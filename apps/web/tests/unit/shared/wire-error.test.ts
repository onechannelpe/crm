import { describe, expect, it } from "vitest";

import { ActionError, parseWireError } from "~/lib/wire-error";

describe("parseWireError", () => {
  it("preserves an ActionError", () => {
    const error = new ActionError({
      kind: "validation",
      code: "invalid_input",
      message: "Entrada inválida.",
    });

    expect(parseWireError(error)).toEqual({
      kind: "validation",
      code: "invalid_input",
      message: "Entrada inválida.",
    });
  });

  it("accepts a serialized rate-limit error with retry metadata", () => {
    expect(
      parseWireError({
        kind: "rate_limit",
        code: "login_rate_limited",
        message: "Inténtalo nuevamente.",
        retryAfterSeconds: 30,
      }),
    ).toEqual({
      kind: "rate_limit",
      code: "login_rate_limited",
      message: "Inténtalo nuevamente.",
      retryAfterSeconds: 30,
    });
  });

  it("hides unknown thrown values behind the internal fallback", () => {
    expect(parseWireError(new Error("database credentials"))).toEqual({
      kind: "internal",
      code: null,
      message: "Ocurrió un error inesperado.",
    });
  });

  it("rejects retry metadata on non-rate-limit errors", () => {
    expect(
      parseWireError({
        kind: "validation",
        code: "invalid_input",
        message: "Entrada inválida.",
        retryAfterSeconds: 30,
      }),
    ).toEqual({
      kind: "internal",
      code: null,
      message: "Ocurrió un error inesperado.",
    });
  });
});
