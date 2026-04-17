export interface ProviderSendFailure {
  provider: "resend" | "whatsapp_cloud";
  code: string;
  statusCode: number | null;
  message: string;
  retryable: boolean;
}

export interface ProviderSendResult {
  providerMessageId: string | null;
}

export function isProviderSendFailure(
  value: unknown,
): value is ProviderSendFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    "provider" in value &&
    "code" in value &&
    "message" in value &&
    "retryable" in value
  );
}
