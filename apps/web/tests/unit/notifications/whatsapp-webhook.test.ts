import { createApiEvent } from "@tests/support/unit/api-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findAddress:
    vi.fn<
      () => Promise<
        { user_id: number; is_verified: number; address: string } | undefined
      >
    >(),
  markVerified: vi.fn<() => Promise<boolean>>(),
  loggerError:
    vi.fn<(event: string, metadata: Record<string, unknown>) => void>(),
  loggerInfo:
    vi.fn<(event: string, metadata: Record<string, unknown>) => void>(),
  loggerWarn:
    vi.fn<(event: string, metadata: Record<string, unknown>) => void>(),
  openSession: vi.fn<() => Promise<unknown>>(),
  sendReply:
    vi.fn<
      (input: {
        apiKey: string;
        phoneNumberId: string;
        metaGraphVersion: string;
        to: string;
        body: string;
      }) => Promise<{ providerMessageId: string | null }>
    >(),
}));

vi.mock("~/lib/observability/logger", () => ({
  createLogger: () => ({
    error: mocks.loggerError,
    info: mocks.loggerInfo,
    warn: mocks.loggerWarn,
  }),
}));

vi.mock("~/lib/env", () => ({
  notificationsConfig: () => ({
    kapso: {
      apiKey: "test-key",
      whatsappPhoneNumberId: "test-phone-id",
      metaGraphVersion: "v24.0",
    },
  }),
}));

vi.mock("~/lib/phone/pe-mobile", () => ({
  normalizePhoneInput: (value: string) => value,
}));

vi.mock("~/server/notifications/repos/user-channel-address", () => ({
  createUserChannelAddressRepo: () => ({
    findByChannelAndAddress: mocks.findAddress,
    markWhatsAppVerified: mocks.markVerified,
  }),
}));

vi.mock("~/server/notifications/whatsapp-session", () => ({
  openSession: mocks.openSession,
}));

vi.mock("~/server/platform/container", () => ({
  getServerRuntime: () => ({ infra: { db: {} } }),
}));

vi.mock("@crm/message-channels", () => ({
  sendWithKapsoWhatsAppText: (input: {
    apiKey: string;
    phoneNumberId: string;
    metaGraphVersion: string;
    to: string;
    body: string;
  }) => mocks.sendReply(input),
}));

import { POST } from "~/routes/api/webhooks/whatsapp";

function webhookRequest(payload: unknown): Request {
  return new Request("http://localhost/api/webhooks/whatsapp", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function standardPayload(
  from: string,
  body: string | null,
): Record<string, unknown> {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              messages: [
                {
                  from,
                  ...(body === null ? {} : { text: { body } }),
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

describe("POST /api/webhooks/whatsapp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("acknowledges a message after opening its session", async () => {
    mocks.findAddress.mockResolvedValue({
      user_id: 7,
      is_verified: 1,
      address: "51911000001",
    });
    mocks.openSession.mockResolvedValue(undefined);

    const response = await POST(
      createApiEvent(webhookRequest(standardPayload("51911000001", null))),
    );

    expect(response.status).toBe(200);
    expect(mocks.openSession).toHaveBeenCalledOnce();
  });

  it("verifies the address, opens a session, and replies when /verificar is sent by an unverified user", async () => {
    mocks.findAddress.mockResolvedValue({
      user_id: 7,
      is_verified: 0,
      address: "51911000001",
    });
    mocks.markVerified.mockResolvedValue(true);
    mocks.openSession.mockResolvedValue(undefined);
    mocks.sendReply.mockResolvedValue({ providerMessageId: "wamid.test" });

    const response = await POST(
      createApiEvent(
        webhookRequest(standardPayload("51911000001", "/verificar")),
      ),
    );

    expect(response.status).toBe(200);
    expect(mocks.markVerified).toHaveBeenCalledOnce();
    expect(mocks.openSession).toHaveBeenCalledOnce();
    expect(mocks.sendReply).toHaveBeenCalledOnce();
  });

  it("accepts the command case-insensitively and trims whitespace", async () => {
    mocks.findAddress.mockResolvedValue({
      user_id: 7,
      is_verified: 0,
      address: "51911000001",
    });
    mocks.markVerified.mockResolvedValue(true);
    mocks.openSession.mockResolvedValue(undefined);
    mocks.sendReply.mockResolvedValue({ providerMessageId: "wamid.test" });

    const response = await POST(
      createApiEvent(
        webhookRequest(standardPayload("51911000001", "  /VERIFICAR  ")),
      ),
    );

    expect(response.status).toBe(200);
    expect(mocks.markVerified).toHaveBeenCalledOnce();
  });

  it("ignores /verificar sent from an unclaimed number and does not reply", async () => {
    mocks.findAddress.mockResolvedValue(undefined);

    const response = await POST(
      createApiEvent(
        webhookRequest(standardPayload("51999999999", "/verificar")),
      ),
    );

    expect(response.status).toBe(200);
    expect(mocks.markVerified).not.toHaveBeenCalled();
    expect(mocks.openSession).not.toHaveBeenCalled();
    expect(mocks.sendReply).not.toHaveBeenCalled();
  });

  it("does not verify a non-command message even from a claimed number", async () => {
    mocks.findAddress.mockResolvedValue({
      user_id: 7,
      is_verified: 0,
      address: "51911000001",
    });

    const response = await POST(
      createApiEvent(webhookRequest(standardPayload("51911000001", "hola"))),
    );

    expect(response.status).toBe(200);
    expect(mocks.markVerified).not.toHaveBeenCalled();
    expect(mocks.openSession).not.toHaveBeenCalled();
  });

  it("returns a retryable failure when session persistence fails", async () => {
    mocks.findAddress.mockResolvedValue({
      user_id: 7,
      is_verified: 1,
      address: "51911000001",
    });
    mocks.openSession.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(
      createApiEvent(webhookRequest(standardPayload("51911000001", null))),
    );

    expect(response.status).toBe(503);
    expect(mocks.loggerError).toHaveBeenCalledOnce();
  });
});
