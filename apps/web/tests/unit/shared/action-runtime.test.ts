import { describe, expect, it, vi } from "vitest";

import { authenticate, authorizePermission } from "~/lib/auth/access/session";
import type { AuthSession } from "~/lib/auth/access/session-types";
import { createActionRunner } from "~/server/platform/action";
import type { AppContext } from "~/server/platform/action/context";
import {
  external,
  forbidden,
  invalid,
  rateLimited,
  unauthenticated,
} from "~/server/shared/domain-error";
import { Err, isErr, Ok } from "~/server/shared/result";

vi.mock("~/lib/auth/access/session", () => ({
  authenticate: vi.fn<() => Promise<unknown>>(),
  authenticateSession: vi.fn<() => Promise<unknown>>(),
  authorizePermission: vi.fn<() => unknown>(),
  authorizeRole: vi.fn<() => unknown>(),
}));

vi.mock("~/server/platform/action/context", () => ({
  createAppContext: vi.fn<
    (actor: AuthSession, now: () => number) => AppContext
  >((actor, now) => ({
    actor,
    requestId: "req",
    traceId: "trace",
    ipAddress: "127.0.0.1",
    userAgent: null,
    publicOrigin: "http://localhost",
    now,
  })),
}));

// oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
const actor = { userId: 7, role: "executive" } as unknown as AuthSession;

function ports() {
  const report = vi.fn<(error: unknown) => void>();
  const record = vi.fn<(row: unknown) => void>();
  return { now: (): number => 1_000, report, record };
}

const okExecute = () =>
  vi.fn<() => Promise<ReturnType<typeof Ok<string>>>>(async () => Ok("x"));

describe("action runtime", () => {
  it("returns a validation wire error from parse before auth, with no telemetry row", async () => {
    const p = ports();
    const { runActionResult } = createActionRunner(p);

    const result = await runActionResult({
      name: "test.parse.validation",
      access: { kind: "auth" },
      parse: () => Err(invalid({ code: "bad_input" })),
      execute: async () => Ok("unreachable"),
    });

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) return;
    expect(result.error).toEqual({
      kind: "validation",
      code: "bad_input",
      message: "Revisa los datos ingresados.",
    });
    expect(authenticate).not.toHaveBeenCalled();
    expect(p.record).not.toHaveBeenCalled();
    expect(p.report).not.toHaveBeenCalled();
  });

  it("reports an unexpected parse throw and surfaces a generic internal error, no row", async () => {
    const p = ports();
    const { runActionResult } = createActionRunner(p);
    const parserError = new Error("raw parser detail");
    const execute = okExecute();

    const result = await runActionResult({
      name: "test.parse.throw",
      access: { kind: "auth" },
      parse: () => {
        throw parserError;
      },
      execute,
    });

    expect(execute).not.toHaveBeenCalled();
    expect(p.report).toHaveBeenCalledWith(parserError);
    expect(p.record).not.toHaveBeenCalled();
    expect(isErr(result)).toBe(true);
    if (!isErr(result)) return;
    expect(result.error).toEqual({
      kind: "internal",
      code: null,
      message: "Ocurrió un error inesperado.",
    });
  });

  it("distinguishes unauthenticated from forbidden", async () => {
    vi.mocked(authenticate).mockResolvedValueOnce(Err(unauthenticated()));
    const p = ports();
    const { runActionResult } = createActionRunner(p);

    const result = await runActionResult({
      name: "test.unauthenticated",
      access: { kind: "permission", permission: "lead:work" },
      execute: async () => Ok("x"),
    });

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) return;
    expect(result.error.kind).toBe("unauthenticated");
    // No actor was established, so no telemetry row.
    expect(p.record).not.toHaveBeenCalled();
  });

  it("records a telemetry row for a forbidden attempt by an authenticated actor", async () => {
    vi.mocked(authenticate).mockResolvedValueOnce(Ok(actor));
    vi.mocked(authorizePermission).mockReturnValueOnce(Err(forbidden()));
    const p = ports();
    const { runActionResult } = createActionRunner(p);
    const execute = okExecute();

    const result = await runActionResult({
      name: "test.forbidden",
      access: { kind: "permission", permission: "lead:work" },
      execute,
    });

    expect(execute).not.toHaveBeenCalled();
    expect(isErr(result)).toBe(true);
    if (!isErr(result)) return;
    expect(result.error.kind).toBe("forbidden");
    expect(p.record).toHaveBeenCalledTimes(1);
    expect(p.record).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error", errorCode: "forbidden" }),
    );
  });

  it("hides an external fault behind a generic internal wire error and reports it", async () => {
    vi.mocked(authenticate).mockResolvedValueOnce(Ok(actor));
    const p = ports();
    const { runActionResult } = createActionRunner(p);
    const fault = external("Stripe 500", {
      code: "provider_down",
      details: { secret: "leak" },
    });

    const result = await runActionResult({
      name: "test.external",
      access: { kind: "auth" },
      execute: async () => Err(fault),
    });

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) return;
    expect(result.error).toEqual({
      kind: "internal",
      code: "provider_down",
      message: "Ocurrió un error inesperado.",
    });
    // details/cause never reach the wire.
    expect(result.error).not.toHaveProperty("details");
    expect(p.report).toHaveBeenCalledWith(fault);
    expect(p.record).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error", errorCode: "internal" }),
    );
  });

  it("carries retryAfterSeconds through a rate-limited failure and records a row", async () => {
    vi.mocked(authenticate).mockResolvedValueOnce(Ok(actor));
    const p = ports();
    const { runActionResult } = createActionRunner(p);

    const result = await runActionResult({
      name: "test.rate_limited",
      access: { kind: "auth" },
      execute: async () => Err(rateLimited(42)),
    });

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) return;
    expect(result.error).toEqual({
      kind: "rate_limit",
      code: null,
      message: "Demasiados intentos. Inténtalo de nuevo en unos momentos.",
      retryAfterSeconds: 42,
    });
    expect(p.record).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error", errorCode: "rate_limit" }),
    );
  });

  it("records a success row and returns the value", async () => {
    vi.mocked(authenticate).mockResolvedValueOnce(Ok(actor));
    const p = ports();
    const { runActionResult } = createActionRunner(p);

    const result = await runActionResult({
      name: "test.ok",
      access: { kind: "auth" },
      audit: () => ({ leadId: "L1" }),
      execute: async () => Ok({ done: true }),
    });

    expect(isErr(result)).toBe(false);
    if (isErr(result)) return;
    expect(result.value).toEqual({ done: true });
    expect(p.record).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ok",
        errorCode: null,
        input: { leadId: "L1" },
      }),
    );
  });
});
