import type { Logger } from "~/lib/observability/logger-shared";
import type { Phone } from "~/lib/phone/pe-mobile";
import type { UserId } from "~/server/shared/ids";

import type { WhatsAppInboundMessage } from "./kapso-payload";

const VERIFY_COMMAND = "/verificar";
const STOP_COMMANDS = new Set(["baja", "stop"]);

export interface WhatsAppInboundPorts {
  addresses: {
    findClaim(address: Phone): Promise<
      | {
          userId: UserId;
          address: string;
          verified: boolean;
        }
      | undefined
    >;
    markVerified(input: {
      userId: UserId;
      address: string;
      now: Date;
    }): Promise<boolean>;
  };
  sessions: {
    open(userId: UserId, now: Date): Promise<void>;
  };
  preferences: {
    muteWhatsApp(userId: UserId, now: Date): Promise<void>;
  };
  replies: {
    sendVerificationReply(address: string): Promise<void>;
    sendOptOutReply(address: string): Promise<void>;
  };
  logger: Pick<Logger, "info" | "error">;
}

function isVerifyCommand(body: string | null): boolean {
  return body?.trim().toLowerCase() === VERIFY_COMMAND;
}

function isStopCommand(body: string | null): boolean {
  return body !== null && STOP_COMMANDS.has(body.trim().toLowerCase());
}

export async function handleWhatsAppInboundMessage(
  message: WhatsAppInboundMessage,
  now: Date,
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

  // A registered number can opt out at any time, verified or not
  if (isStopCommand(message.body)) {
    await ports.preferences.muteWhatsApp(claim.userId, now);

    try {
      await ports.replies.sendOptOutReply(message.rawAddress);
    } catch (error) {
      ports.logger.error("opt_out_reply_failed", {
        to: message.rawAddress,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    ports.logger.info("whatsapp_webhook_opted_out", {
      userId: claim.userId,
      from: message.rawAddress,
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
