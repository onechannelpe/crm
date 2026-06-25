// Signs a sample Kapso payload for manual endpoint probes.
import { createHmac } from "node:crypto";

const secret = "tendSGiiGmLA+WbPZwkNs6mupYPnr2kS6ZR0dn7M+0o";
const body = JSON.stringify({
  message: {
    id: "wamid.test",
    timestamp: "1700000000",
    type: "text",
    text: { body: "/verificar" },
    kapso: {
      direction: "inbound",
      status: "received",
      processing_status: "pending",
      origin: "cloud_api",
      has_media: false,
      content: "/verificar",
    },
  },
  conversation: {
    id: "conv.test",
    phone_number: "+51911000001",
    status: "active",
    last_active_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    metadata: {},
    phone_number_id: "1246623188523844",
    kapso: {},
  },
  is_new_conversation: true,
  phone_number_id: "1246623188523844",
});

const sig = createHmac("sha256", secret).update(body).digest("hex");
console.log("computed sig:", sig);
console.log("body length:", body.length);

const res = await fetch(
  "https://beta.crmprosolutions.com/api/webhooks/whatsapp",
  {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-webhook-event": "whatsapp.message.received",
      "x-webhook-signature": sig,
    },
    body,
  },
);

console.log("status:", res.status);
console.log("headers:", Object.fromEntries(res.headers.entries()));
console.log("body:", await res.text());
