import { describe, expect, it, vi } from "vitest";

import {
  handleWhatsAppInboundMessage,
  type WhatsAppInboundPorts,
} from "~/server/notifications/whatsapp-inbound/handle-inbound-message";
import { parseKapsoInboundMessage } from "~/server/notifications/whatsapp-inbound/kapso-payload";

function kapsoInbound(input: {
  phoneNumber: string;
  body: string | null;
  direction?: "inbound" | "outbound";
}): unknown {
  return {
    message: {
      type: input.body === null ? "image" : "text",
      ...(input.body === null ? {} : { text: { body: input.body } }),
      kapso: { direction: input.direction ?? "inbound" },
    },
    conversation: { phone_number: input.phoneNumber },
  };
}

function createPorts(
  claim: { userId: number; address: string; verified: boolean } | undefined,
) {
  const findClaim = vi.fn().mockResolvedValue(claim);
  const markVerified = vi.fn().mockResolvedValue(true);
  const open = vi.fn().mockResolvedValue(undefined);
  const sendVerificationReply = vi.fn().mockResolvedValue(undefined);
  const info = vi.fn();
  const error = vi.fn();
  const ports: WhatsAppInboundPorts = {
    addresses: { findClaim, markVerified },
    sessions: { open },
    replies: { sendVerificationReply },
    logger: { info, error },
  };
  return {
    ports,
    findClaim,
    markVerified,
    open,
    sendVerificationReply,
    info,
    error,
  };
}

describe("parseKapsoInboundMessage", () => {
  it("parses an inbound text message and normalizes the address", () => {
    expect(
      parseKapsoInboundMessage(
        kapsoInbound({ phoneNumber: "+51911000001", body: "hola" }),
      ),
    ).toEqual({
      rawAddress: "+51911000001",
      address: "911000001",
      body: "hola",
    });
  });

  it("ignores outbound messages and malformed payloads", () => {
    expect(
      parseKapsoInboundMessage(
        kapsoInbound({
          phoneNumber: "+51911000001",
          body: "hola",
          direction: "outbound",
        }),
      ),
    ).toBeNull();
    expect(parseKapsoInboundMessage({ message: {} })).toBeNull();
  });
});

describe("handleWhatsAppInboundMessage", () => {
  const message = parseKapsoInboundMessage(
    kapsoInbound({
      phoneNumber: "+51911000007",
      body: "/verificar",
    }),
  );
  if (!message) throw new Error("expected valid Kapso message fixture");

  it("verifies a claimed address, opens its session, and replies", async () => {
    const runtime = createPorts({
      userId: 7,
      address: "911000007",
      verified: false,
    });

    await handleWhatsAppInboundMessage(
      message,
      1_700_000_000_000,
      runtime.ports,
    );

    expect(runtime.markVerified).toHaveBeenCalledWith({
      userId: 7,
      address: "911000007",
      now: 1_700_000_000_000,
    });
    expect(runtime.open).toHaveBeenCalledWith(7, 1_700_000_000_000);
    expect(runtime.sendVerificationReply).toHaveBeenCalledWith("+51911000007");
  });

  it("keeps the session alive for an already verified sender", async () => {
    const runtime = createPorts({
      userId: 7,
      address: "911000007",
      verified: true,
    });

    await handleWhatsAppInboundMessage(
      { ...message, body: "hola" },
      1_700_000_000_000,
      runtime.ports,
    );

    expect(runtime.open).toHaveBeenCalledWith(7, 1_700_000_000_000);
    expect(runtime.markVerified).not.toHaveBeenCalled();
    expect(runtime.sendVerificationReply).not.toHaveBeenCalled();
  });

  it("does not write or reply for an unknown sender", async () => {
    const runtime = createPorts(undefined);

    await handleWhatsAppInboundMessage(
      message,
      1_700_000_000_000,
      runtime.ports,
    );

    expect(runtime.markVerified).not.toHaveBeenCalled();
    expect(runtime.open).not.toHaveBeenCalled();
    expect(runtime.sendVerificationReply).not.toHaveBeenCalled();
  });

  it("does not fail verified ownership when the optional reply fails", async () => {
    const runtime = createPorts({
      userId: 7,
      address: "911000007",
      verified: false,
    });
    runtime.sendVerificationReply.mockRejectedValue(new Error("provider down"));

    await handleWhatsAppInboundMessage(
      message,
      1_700_000_000_000,
      runtime.ports,
    );

    expect(runtime.markVerified).toHaveBeenCalledOnce();
    expect(runtime.open).toHaveBeenCalledOnce();
    expect(runtime.error).toHaveBeenCalledWith("verify_reply_failed", {
      to: "+51911000007",
      error: "provider down",
    });
  });
});
