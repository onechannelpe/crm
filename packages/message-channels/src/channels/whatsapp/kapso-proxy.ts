import type { DeliveryProvider } from "../../types";
import {
  sendMetaGraphWhatsAppText,
  type MetaGraphWhatsAppConfig,
} from "./meta-graph-sender";

const KAPSO_META_BASE_URL = "https://api.kapso.ai/meta/whatsapp";

export function sendWithKapsoWhatsAppText(input: {
  apiKey: string;
  phoneNumberId: string;
  metaGraphVersion: string;
  to: string;
  body: string;
}) {
  const config: MetaGraphWhatsAppConfig = {
    providerId: "kapso",
    baseUrl: KAPSO_META_BASE_URL,
    apiVersion: input.metaGraphVersion,
    phoneNumberId: input.phoneNumberId,
    headers: { "X-API-Key": input.apiKey },
  };
  return sendMetaGraphWhatsAppText(config, { to: input.to, body: input.body });
}

export function createKapsoProvider(config: {
  apiKey: string;
  phoneNumberId: string;
  metaGraphVersion: string;
}): DeliveryProvider<"whatsapp"> {
  return {
    id: "kapso",
    channel: "whatsapp",
    send(input) {
      return sendWithKapsoWhatsAppText({
        apiKey: config.apiKey,
        phoneNumberId: config.phoneNumberId,
        metaGraphVersion: config.metaGraphVersion,
        to: input.to,
        body: input.body,
      });
    },
  };
}
