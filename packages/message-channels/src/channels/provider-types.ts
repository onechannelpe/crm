import { isDeliveryProviderId, type DeliveryProviderId } from "../types";

export interface ProviderSendFailure {
  provider: DeliveryProviderId;
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
    typeof value.provider === "string" &&
    isDeliveryProviderId(value.provider) &&
    "code" in value &&
    typeof value.code === "string" &&
    "statusCode" in value &&
    (typeof value.statusCode === "number" || value.statusCode === null) &&
    "message" in value &&
    typeof value.message === "string" &&
    "retryable" in value &&
    typeof value.retryable === "boolean"
  );
}
