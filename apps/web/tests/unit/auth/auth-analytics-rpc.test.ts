import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  analytics:
    vi.fn<
      (event: unknown, request: unknown, operation: unknown) => Promise<void>
    >(),
}));

vi.mock("~/server/composition/application", () => ({
  getApplication: () => ({
    auth: {
      analytics: mocks.analytics,
    },
  }),
}));

vi.mock("~/server/platform/http/request-context-storage", () => ({
  getRequestOperation: () => ({
    operationAt: new Date("2026-01-01T00:00:00Z"),
  }),
}));

vi.mock("~/server/platform/observability/context", () => ({
  getActionRequestContext: () => ({ requestId: "request-1" }),
}));

import { trackAuthClientEvent } from "~/rpc/auth/analytics";

describe("auth analytics RPC", () => {
  beforeEach(() => {
    mocks.analytics.mockReset();
    mocks.analytics.mockResolvedValue();
  });

  it.each([null, [], {}, { kind: "screen_viewed", screen: "unknown" }])(
    "ignores malformed client telemetry (%j)",
    async (input) => {
      await expect(trackAuthClientEvent(input)).resolves.toBeUndefined();

      expect(mocks.analytics).not.toHaveBeenCalled();
    },
  );

  it("records only the supported event fields", async () => {
    await trackAuthClientEvent({
      kind: "passkey_result",
      outcome: "failed",
      code: "cancelled",
      untrustedField: "ignored",
    });

    expect(mocks.analytics).toHaveBeenCalledWith(
      {
        source: "client",
        kind: "passkey_result",
        outcome: "failed",
        code: "cancelled",
      },
      { requestId: "request-1" },
      { operationAt: new Date("2026-01-01T00:00:00Z") },
    );
  });
});
