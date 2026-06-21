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

  // After crossing the action boundary the client no longer holds an ActionError
  // instance, but seroval preserves the `wire` own property on the deserialized
  // error. parseWireError recovers it from that carried shape.
  it("recovers the wire from a serialized rate-limit error with retry metadata", () => {
    expect(
      parseWireError({
        wire: {
          kind: "rate_limit",
          code: "login_rate_limited",
          message: "Inténtalo nuevamente.",
          retryAfterSeconds: 30,
        },
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
        wire: {
          kind: "validation",
          code: "invalid_input",
          message: "Entrada inválida.",
          retryAfterSeconds: 30,
        },
      }),
    ).toEqual({
      kind: "internal",
      code: null,
      message: "Ocurrió un error inesperado.",
    });
  });
});
