import type { Logger } from "~/lib/observability/logger-shared";
import type { Phone } from "~/lib/phone/pe-mobile";

import type { WhatsAppInboundMessage } from "./kapso-payload";

const VERIFY_COMMAND = "/verificar";

export interface WhatsAppInboundPorts {
  addresses: {
    findClaim(address: Phone): Promise<
      | {
          userId: number;
          address: string;
          verified: boolean;
        }
      | undefined
    >;
    markVerified(input: {
      userId: number;
      address: string;
      now: number;
    }): Promise<boolean>;
  };
  sessions: {
    open(userId: number, now: number): Promise<void>;
  };
  replies: {
    sendVerificationReply(address: string): Promise<void>;
  };
  logger: Pick<Logger, "info" | "error">;
}

function isVerifyCommand(body: string | null): boolean {
  return body?.trim().toLowerCase() === VERIFY_COMMAND;
}

export async function handleWhatsAppInboundMessage(
  message: WhatsAppInboundMessage,
  now: number,
  ports: WhatsAppInboundPorts,
): Promise<void> {
  const claim = await ports.addresses.findClaim(message.address);
  if (!claim) {
    ports.logger.info("whatsapp_webhook_unknown_sender", {
      from: message.rawAddress,
      command: isVerifyCommand(message.body),
    });
    return;
  }

  if (!claim.verified && isVerifyCommand(message.body)) {
    await ports.addresses.markVerified({
      userId: claim.userId,
      address: claim.address,
      now,
    });
    await ports.sessions.open(claim.userId, now);

    try {
      await ports.replies.sendVerificationReply(message.rawAddress);
    } catch (error) {
      ports.logger.error("verify_reply_failed", {
        to: message.rawAddress,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    ports.logger.info("whatsapp_webhook_verified", {
      userId: claim.userId,
      from: message.rawAddress,
    });
    return;
  }

  if (claim.verified) {
    await ports.sessions.open(claim.userId, now);
  }
}
