import { parsePhone, type Phone } from "~/lib/phone/pe-mobile";
import { isPlainRecord } from "~/lib/type-guards";

export type WhatsAppInboundMessage = {
  rawAddress: string;
  address: Phone;
  body: string | null;
};

export function parseKapsoInboundMessage(
  payload: unknown,
): WhatsAppInboundMessage | null {
  if (!isPlainRecord(payload)) return null;

  const message = isPlainRecord(payload["message"]) ? payload["message"] : null;
  if (!message) return null;

  const kapso = isPlainRecord(message["kapso"]) ? message["kapso"] : null;
  if (!kapso || kapso["direction"] !== "inbound") return null;

  const conversation = isPlainRecord(payload["conversation"])
    ? payload["conversation"]
    : null;
  const rawAddress = conversation?.["phone_number"];
  if (typeof rawAddress !== "string") return null;

  const address = parsePhone(rawAddress);
  if (!address) return null;

  const text = isPlainRecord(message["text"]) ? message["text"] : null;
  const body = text && typeof text["body"] === "string" ? text["body"] : null;

  return { rawAddress, address, body };
}
