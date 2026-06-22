import { createApiEvent } from "@tests/support/unit/api-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findAddress:
    vi.fn<
      () => Promise<
        | { user_id: number; is_verified: number; address: string }
        | undefined
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
  sendReply: vi.fn<
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
  normalizePhoneInput: (value: string) => {
    // Match the production behavior: strip non-digits, drop a leading
    // 51 country code if present so the result is the local 9-digit form.
    const digits = value.replace(/\D+/g, "");
    if (digits.length === 11 && digits.startsWith("51")) {
      return digits.slice(2);
    }
    return digits;
  },
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

function kapsoV2Inbound(payload: {
  phoneNumber: string;
  textBody: string | null;
  direction?: "inbound" | "outbound";
}): Record<string, unknown> {
  return {
    message: {
      id: "wamid.test",
      timestamp: "1700000000",
      type: payload.textBody === null ? "image" : "text",
      ...(payload.textBody === null
        ? {}
        : { text: { body: payload.textBody } }),
      kapso: {
        direction: payload.direction ?? "inbound",
        status: "received",
        processing_status: "pending",
        origin: "cloud_api",
        has_media: payload.textBody === null,
        content: payload.textBody ?? "(image)",
      },
    },
    conversation: {
      id: "conv_test",
      phone_number: payload.phoneNumber,
      status: "active",
      last_active_at: "2026-01-01T00:00:00Z",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      metadata: {},
      phone_number_id: "test-phone-id",
      kapso: {},
    },
    is_new_conversation: true,
    phone_number_id: "test-phone-id",
  };
}

function webhookRequest(
  payload: unknown,
  event = "whatsapp.message.received",
): Request {
  return new Request("http://localhost/api/webhooks/whatsapp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-webhook-event": event,
    },
    body: JSON.stringify(payload),
  });
}

describe("POST /api/webhooks/whatsapp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("acknowledges a message after opening its session", async () => {
    mocks.findAddress.mockResolvedValue({
      user_id: 7,
      is_verified: 1,
      address: "911000001",
    });
    mocks.openSession.mockResolvedValue(undefined);

    const response = await POST(
      createApiEvent(
        webhookRequest(kapsoV2Inbound({ phoneNumber: "+51911000001", textBody: "hola" })),
      ),
    );

    expect(response.status).toBe(200);
    expect(mocks.openSession).toHaveBeenCalledOnce();
  });

  it("verifies the address, opens a session, and replies when /verificar is sent by an unverified user", async () => {
    mocks.findAddress.mockResolvedValue({
      user_id: 7,
      is_verified: 0,
      address: "911000007",
    });
    mocks.markVerified.mockResolvedValue(true);
    mocks.openSession.mockResolvedValue(undefined);
    mocks.sendReply.mockResolvedValue({ providerMessageId: "wamid.reply" });

    const response = await POST(
      createApiEvent(
        webhookRequest(
          kapsoV2Inbound({ phoneNumber: "+51911000007", textBody: "/verificar" }),
        ),
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
      address: "911000007",
    });
    mocks.markVerified.mockResolvedValue(true);
    mocks.openSession.mockResolvedValue(undefined);
    mocks.sendReply.mockResolvedValue({ providerMessageId: "wamid.reply" });

    const response = await POST(
      createApiEvent(
        webhookRequest(
          kapsoV2Inbound({ phoneNumber: "+51911000007", textBody: "  /VERIFICAR  " }),
        ),
      ),
    );

    expect(response.status).toBe(200);
    expect(mocks.markVerified).toHaveBeenCalledOnce();
  });

  it("ignores /verificar sent from an unclaimed number and does not reply", async () => {
    mocks.findAddress.mockResolvedValue(undefined);

    const response = await POST(
      createApiEvent(
        webhookRequest(
          kapsoV2Inbound({ phoneNumber: "+51999999999", textBody: "/verificar" }),
        ),
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
      address: "911000007",
    });

    const response = await POST(
      createApiEvent(
        webhookRequest(
          kapsoV2Inbound({ phoneNumber: "+51911000007", textBody: "hola" }),
        ),
      ),
    );

    expect(response.status).toBe(200);
    expect(mocks.markVerified).not.toHaveBeenCalled();
    expect(mocks.openSession).not.toHaveBeenCalled();
  });

  it("ignores outbound message events", async () => {
    mocks.findAddress.mockResolvedValue({
      user_id: 7,
      is_verified: 1,
      address: "911000007",
    });

    const response = await POST(
      createApiEvent(
        webhookRequest(
          kapsoV2Inbound({
            phoneNumber: "+51911000007",
            textBody: "outbound",
            direction: "outbound",
          }),
          "whatsapp.message.sent",
        ),
      ),
    );

    expect(response.status).toBe(200);
    expect(mocks.openSession).not.toHaveBeenCalled();
  });

  it("ignores non-message events entirely", async () => {
    const response = await POST(
      createApiEvent(
        webhookRequest(
          kapsoV2Inbound({ phoneNumber: "+51911000007", textBody: "hola" }),
          "whatsapp.conversation.created",
        ),
      ),
    );

    expect(response.status).toBe(200);
    expect(mocks.openSession).not.toHaveBeenCalled();
  });

  it("returns a retryable failure when session persistence fails", async () => {
    mocks.findAddress.mockResolvedValue({
      user_id: 7,
      is_verified: 1,
      address: "911000007",
    });
    mocks.openSession.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(
      createApiEvent(
        webhookRequest(
          kapsoV2Inbound({ phoneNumber: "+51911000007", textBody: "hola" }),
        ),
      ),
    );

    expect(response.status).toBe(503);
    expect(mocks.loggerError).toHaveBeenCalledOnce();
  });
});
