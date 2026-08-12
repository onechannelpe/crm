import { makeAuthSession } from "@tests/support/unit/factories";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthSession } from "~/domain/auth/access/session-types";
import {
  external,
  forbidden,
  invalid,
  rateLimited,
  unauthenticated,
} from "~/domain/errors";
import type { AppContext } from "~/server/platform/action/context";
import { createServerFunctionExecutor } from "~/server/platform/action/run";
import {
  authenticate,
  authorizePermission,
} from "~/server/platform/action/session";
import { Err, isErr, Ok } from "~/shared/result";

vi.mock("~/server/platform/action/session", () => ({
  authenticate: vi.fn<() => Promise<unknown>>(),
  authenticateSession: vi.fn<() => Promise<unknown>>(),
  authorizePermission: vi.fn<() => unknown>(),
  authorizeRole: vi.fn<() => unknown>(),
}));

vi.mock("~/server/platform/action/context", () => ({
  createAppContext: vi.fn<(actor: AuthSession) => AppContext>((actor) => ({
    actor,
    requestId: "req",
    traceId: "trace",
    ipAddress: "127.0.0.1",
    userAgent: null,
    publicOrigin: "http://localhost",
    operationAt: new Date(1_000),
  })),
}));

const actor = makeAuthSession();

function createPorts() {
  const report = vi.fn<(error: unknown) => void>();
  const record = vi.fn<(row: unknown) => void>();
  const setRetryAfterHeader = vi.fn<(retryAfterSeconds: number) => void>();

  return {
    report,
    record,
    setRetryAfterHeader,
  };
}

function createOkExecute() {
  return vi.fn<() => Promise<ReturnType<typeof Ok<string>>>>(async () =>
    Ok("x"),
  );
}

describe("action runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a validation wire error from parse before auth, with no telemetry row", async () => {
    const ports = createPorts();
    const { executeResult } = createServerFunctionExecutor(ports);

    const result = await executeResult({
      name: "test.parse.validation",
      access: { kind: "auth" },
      parse: () => Err(invalid({ code: "bad_input" })),
      execute: async () => Ok("unreachable"),
    });

    expect(isErr(result)).toBe(true);

    if (!isErr(result)) {
      return;
    }

    expect(result.error).toEqual({
      kind: "validation",
      code: "bad_input",
      message: "Revisa los datos ingresados.",
    });
    expect(authenticate).not.toHaveBeenCalled();
    expect(ports.record).not.toHaveBeenCalled();
    expect(ports.report).not.toHaveBeenCalled();
  });

  it("propagates an unexpected parse throw without recording telemetry", async () => {
    const ports = createPorts();
    const { executeResult } = createServerFunctionExecutor(ports);
    const parserError = new Error("raw parser detail");
    const execute = createOkExecute();

    await expect(
      executeResult({
        name: "test.parse.throw",
        access: { kind: "auth" },
        parse: () => {
          throw parserError;
        },
        execute,
      }),
    ).rejects.toBe(parserError);

    expect(execute).not.toHaveBeenCalled();
    expect(ports.report).not.toHaveBeenCalled();
    expect(ports.record).not.toHaveBeenCalled();
  });

  it("returns unauthenticated without recording telemetry", async () => {
    vi.mocked(authenticate).mockResolvedValueOnce(Err(unauthenticated()));

    const ports = createPorts();
    const { executeResult } = createServerFunctionExecutor(ports);

    const result = await executeResult({
      name: "test.unauthenticated",
      access: { kind: "permission", permission: "lead:work" },
      execute: async () => Ok("x"),
    });

    expect(isErr(result)).toBe(true);

    if (!isErr(result)) {
      return;
    }

    expect(result.error.kind).toBe("unauthenticated");
    expect(ports.record).not.toHaveBeenCalled();
  });

  it("records a forbidden attempt by an authenticated actor", async () => {
    vi.mocked(authenticate).mockResolvedValueOnce(Ok(actor));
    vi.mocked(authorizePermission).mockReturnValueOnce(Err(forbidden()));

    const ports = createPorts();
    const { executeResult } = createServerFunctionExecutor(ports);
    const execute = createOkExecute();

    const result = await executeResult({
      name: "test.forbidden",
      access: { kind: "permission", permission: "lead:work" },
      execute,
    });

    expect(execute).not.toHaveBeenCalled();
    expect(isErr(result)).toBe(true);

    if (!isErr(result)) {
      return;
    }

    expect(result.error.kind).toBe("forbidden");
    expect(ports.record).toHaveBeenCalledTimes(1);
    expect(ports.record).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        errorCode: "forbidden",
      }),
    );
  });

  it("hides and reports an external fault", async () => {
    vi.mocked(authenticate).mockResolvedValueOnce(Ok(actor));

    const ports = createPorts();
    const { executeResult } = createServerFunctionExecutor(ports);
    const fault = external("Stripe 500", {
      code: "provider_down",
      details: { secret: "leak" },
    });

    const result = await executeResult({
      name: "test.external",
      access: { kind: "auth" },
      execute: async () => Err(fault),
    });

    expect(isErr(result)).toBe(true);

    if (!isErr(result)) {
      return;
    }

    expect(result.error).toEqual({
      kind: "internal",
      code: "provider_down",
      message: "Ocurrió un error inesperado.",
    });
    expect(result.error).not.toHaveProperty("details");
    expect(ports.report).toHaveBeenCalledWith(fault);
    expect(ports.record).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        errorCode: "internal",
      }),
    );
  });

  it("returns retry metadata and records a rate-limited failure", async () => {
    vi.mocked(authenticate).mockResolvedValueOnce(Ok(actor));

    const ports = createPorts();
    const { executeResult } = createServerFunctionExecutor(ports);

    const result = await executeResult({
      name: "test.rate_limited",
      access: { kind: "auth" },
      execute: async () => Err(rateLimited(42)),
    });

    expect(isErr(result)).toBe(true);

    if (!isErr(result)) {
      return;
    }

    expect(result.error).toEqual({
      kind: "rate_limit",
      code: null,
      message: "Demasiados intentos. Inténtalo de nuevo en unos momentos.",
      retryAfterSeconds: 42,
    });
    expect(ports.setRetryAfterHeader).toHaveBeenCalledWith(42);
    expect(ports.record).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        errorCode: "rate_limit",
      }),
    );
  });

  it("returns the value and records a successful execution", async () => {
    vi.mocked(authenticate).mockResolvedValueOnce(Ok(actor));

    const ports = createPorts();
    const { executeResult } = createServerFunctionExecutor(ports);

    const result = await executeResult({
      name: "test.ok",
      access: { kind: "auth" },
      telemetry: () => ({ leadId: "L1" }),
      execute: async () => Ok({ done: true }),
    });

    expect(isErr(result)).toBe(false);

    if (isErr(result)) {
      return;
    }

    expect(result.value).toEqual({ done: true });
    expect(ports.record).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ok",
        errorCode: null,
        input: { leadId: "L1" },
      }),
    );
  });
});
