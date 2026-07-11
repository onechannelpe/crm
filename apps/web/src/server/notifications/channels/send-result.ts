import type {
  DeliveryError,
  DeliveryProviderId,
  DeliveryReceipt,
  Result,
} from "@crm/message-channels";

export type SendClassification =
  | { ok: true; provider: DeliveryProviderId; providerMessageId: string | null }
  | {
      ok: false;
      retryable: boolean;
      provider: DeliveryProviderId | null;
      code: string;
      message: string;
    };

export function classifySendReceipt(
  receipt: Result<DeliveryReceipt, DeliveryError>,
): SendClassification {
  if (receipt.ok) {
    return {
      ok: true,
      provider: receipt.value.provider,
      providerMessageId: receipt.value.providerMessageId,
    };
  }

  const provider =
    receipt.error.kind === "provider_error" ? receipt.error.provider : null;
  return {
    ok: false,
    retryable: receipt.error.retryable,
    provider,
    code: receipt.error.code,
    message: receipt.error.message,
  };
}
