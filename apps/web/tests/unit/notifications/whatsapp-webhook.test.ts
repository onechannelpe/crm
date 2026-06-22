import { createApiEvent } from "@tests/support/unit/api-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findAddress:
    vi.fn<
      () => Promise<{ user_id: number; is_verified: number } | undefined>
    >(),
  loggerError:
    vi.fn<(event: string, metadata: Record<string, unknown>) => void>(),
  openSession: vi.fn<() => Promise<unknown>>(),
}));

vi.mock("~/lib/observability/logger", () => ({
  createLogger: () => ({ error: mocks.loggerError }),
}));

vi.mock("~/lib/phone/pe-mobile", () => ({
  normalizePhoneInput: (value: string) => value,
}));

vi.mock("~/server/notifications/repos/user-channel-address", () => ({
  createUserChannelAddressRepo: () => ({
    findByChannelAndAddress: mocks.findAddress,
  }),
}));

vi.mock("~/server/notifications/whatsapp-session", () => ({
  openSession: mocks.openSession,
}));

vi.mock("~/server/platform/container", () => ({
  getServerRuntime: () => ({ infra: { db: {} } }),
}));

import { POST } from "~/routes/api/webhooks/whatsapp";

function webhookRequest(): Request {
  return new Request("http://localhost/api/webhooks/whatsapp", {
    method: "POST",
    body: JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: { messages: [{ from: "51911000001" }] },
            },
          ],
        },
      ],
    }),
  });
}

describe("POST /api/webhooks/whatsapp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("acknowledges a message after opening its session", async () => {
    mocks.findAddress.mockResolvedValue({ user_id: 7, is_verified: 1 });
    mocks.openSession.mockResolvedValue(undefined);

    const response = await POST(createApiEvent(webhookRequest()));

    expect(response.status).toBe(200);
    expect(mocks.openSession).toHaveBeenCalledOnce();
  });

  it("returns a retryable failure when session persistence fails", async () => {
    mocks.findAddress.mockResolvedValue({ user_id: 7, is_verified: 1 });
    mocks.openSession.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(createApiEvent(webhookRequest()));

    expect(response.status).toBe(503);
    expect(mocks.loggerError).toHaveBeenCalledOnce();
  });
});
