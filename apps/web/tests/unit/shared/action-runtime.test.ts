import { captureException } from "@sentry/bun";
import { describe, expect, it, vi } from "vitest";

import { runActionResult } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok } from "~/server/shared/result";

vi.mock("@sentry/bun", () => ({
  captureException: vi.fn<(error: unknown) => void>(),
}));

describe("action runtime", () => {
  it("returns sanitized validation errors from parse before auth", async () => {
    const result = await runActionResult({
      actionName: "test.parse.validation",
      access: { kind: "session" },
      parse: () => Err(domainError("validation", "bad_input", "Bad input")),
      execute: async () => Ok("unreachable"),
    });

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) return;

    expect(result.error).toMatchObject({
      code: "validation",
      publicMessage: "Bad input",
      domainCode: "bad_input",
    });
    expect(result.error.stack).toBeUndefined();
  });

  it("sanitizes unexpected parse throws before auth", async () => {
    const parserError = new Error("raw parser detail");
    const execute = vi.fn<() => Promise<ReturnType<typeof Ok<string>>>>(
      async () => Ok("unreachable"),
    );

    const result = await runActionResult<unknown, string, DomainError>({
      actionName: "test.parse.throw",
      access: { kind: "session" },
      parse: () => {
        throw parserError;
      },
      execute,
    });

    expect(execute).not.toHaveBeenCalled();
    expect(captureException).toHaveBeenCalledWith(parserError);
    expect(isErr(result)).toBe(true);
    if (!isErr(result)) return;

    expect(result.error).toMatchObject({
      code: "internal",
      publicMessage: "An unexpected error occurred",
      domainCode: null,
      internalMessage: null,
    });
    expect(result.error.message).toBe("An unexpected error occurred");
    expect(result.error.stack).toBeUndefined();
  });
});
