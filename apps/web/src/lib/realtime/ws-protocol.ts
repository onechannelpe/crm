export interface RealtimeSubscriptionMessage {
  type: "subscribe" | "unsubscribe";
  topic: string;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseRealtimeSubscriptionMessage(
  rawText: string,
): RealtimeSubscriptionMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return null;
  }

  if (!isObjectRecord(parsed)) {
    return null;
  }

  const { type, topic } = parsed;
  if (
    (type !== "subscribe" && type !== "unsubscribe") ||
    typeof topic !== "string" ||
    topic.length === 0
  ) {
    return null;
  }

  return { type, topic };
}

export function buildRealtimeSubscriptionMessage(
  message: RealtimeSubscriptionMessage,
): string {
  return JSON.stringify(message);
}
