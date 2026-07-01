import type { DeliveryProvider } from "../../types";
import {
  sendMetaGraphWhatsAppText,
  type MetaGraphWhatsAppConfig,
} from "./meta-graph-sender";

const META_GRAPH_BASE_URL = "https://graph.facebook.com";

export function sendWithWhatsAppCloudText(input: {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
  to: string;
  body: string;
}) {
  const config: MetaGraphWhatsAppConfig = {
    providerId: "whatsapp_cloud",
    baseUrl: META_GRAPH_BASE_URL,
    apiVersion: input.apiVersion,
    phoneNumberId: input.phoneNumberId,
    headers: { Authorization: `Bearer ${input.accessToken}` },
  };
  return sendMetaGraphWhatsAppText(config, { to: input.to, body: input.body });
}

export function createWhatsAppCloudProvider(config: {
  accessToken: string;
  phoneNumberId: string;
  graphVersion: string;
}): DeliveryProvider<"whatsapp"> {
  return {
    id: "whatsapp_cloud",
    channel: "whatsapp",
    send(input) {
      return sendWithWhatsAppCloudText({
        accessToken: config.accessToken,
        phoneNumberId: config.phoneNumberId,
        apiVersion: config.graphVersion,
        to: input.to,
        body: input.body,
      });
    },
  };
}
