import { createApiEvent } from "@tests/support/unit/api-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission:
    vi.fn<() => Promise<{ userId: number; id: string; branchId: number }>>(),
  claimInstallationSession: vi.fn<() => Promise<unknown>>(),
  refreshInstallationSession: vi.fn<() => Promise<unknown>>(),
  ingestRuntimeEvent: vi.fn<() => Promise<unknown>>(),
  createHandoffToken: vi.fn<() => Promise<unknown>>(),
}));

vi.mock("~/lib/auth/access/session", () => ({
  requirePermission: mocks.requirePermission,
}));

vi.mock("~/server/runtime", () => ({
  getServerRuntime: () => ({
    extension: {
      extensionService: {
        claimInstallationSession: mocks.claimInstallationSession,
        refreshInstallationSession: mocks.refreshInstallationSession,
        ingestRuntimeEvent: mocks.ingestRuntimeEvent,
        createHandoffToken: mocks.createHandoffToken,
      },
    },
  }),
}));

import { POST as postEvents } from "~/routes/api/extension/events";
import { POST as postHandoffToken } from "~/routes/api/extension/handoff-token";
import { POST as postClaim } from "~/routes/api/extension/session/claim";
import { POST as postRefresh } from "~/routes/api/extension/session/refresh";

function invalidJsonRequest(url: string): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
      authorization: "Bearer token",
    },
    body: "{",
  });
}

describe("extension api routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermission.mockResolvedValue({
      userId: 1,
      id: "session-1",
      branchId: 1,
    });
  });

  it("returns 400 for malformed JSON in the handoff token route", async () => {
    const response = await postHandoffToken(
      createApiEvent(
        invalidJsonRequest("http://localhost/api/extension/handoff-token"),
      ),
    );

    expect(response.status).toBe(400);
    expect(mocks.createHandoffToken).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON in the claim route", async () => {
    const response = await postClaim(
      createApiEvent(
        invalidJsonRequest("http://localhost/api/extension/session/claim"),
      ),
    );

    expect(response.status).toBe(400);
    expect(mocks.claimInstallationSession).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON in the refresh route", async () => {
    const response = await postRefresh(
      createApiEvent(
        invalidJsonRequest("http://localhost/api/extension/session/refresh"),
      ),
    );

    expect(response.status).toBe(400);
    expect(mocks.refreshInstallationSession).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON in the events route", async () => {
    const response = await postEvents(
      createApiEvent(
        invalidJsonRequest("http://localhost/api/extension/events"),
      ),
    );

    expect(response.status).toBe(400);
    expect(mocks.ingestRuntimeEvent).not.toHaveBeenCalled();
  });
});
