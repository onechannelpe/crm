import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createLogger } from "~/lib/observability/logger";

describe("createLogger", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  it("filters logs below configured LOG_LEVEL", () => {
    process.env.LOG_LEVEL = "error";
    process.env.LOG_FORMAT = "text";

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logger = createLogger("test");

    logger.info("info_message");
    logger.error("error_message");

    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("writes JSON payload in production mode", () => {
    process.env.NODE_ENV = "production";
    delete process.env.LOG_FORMAT;

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logger = createLogger("boundary", { traceId: "abc123" });

    logger.error("ui_boundary_error", { boundary: "app-root" });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(errorSpy.mock.calls[0]?.[0]));
    expect(payload).toMatchObject({
      level: "error",
      component: "boundary",
      message: "ui_boundary_error",
      traceId: "abc123",
      boundary: "app-root",
    });
    expect(typeof payload.timestamp).toBe("string");
  });
});
