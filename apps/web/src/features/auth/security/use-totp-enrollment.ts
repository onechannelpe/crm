import { createSignal } from "solid-js";

import {
  beginTotpEnrollment,
  finishTotpEnrollment,
} from "~/actions/auth/security/totp";
import { actionErrorMessage } from "~/lib/wire-error";

export interface TotpEnrollmentState {
  qrCodeDataUrl: string;
  otpauthUri: string;
}

interface TotpEnrollmentOptions {
  enqueueSuccessSnackBar: (message: string) => void;
  enqueueErrorSnackBar: (message: string) => void;
  enqueueInfoSnackBar: (message: string) => void;
  refreshStatus: () => void | PromiseLike<unknown>;
  beginInfoMessage?: string;
  beginFailureMessage?: string;
  verifySuccessMessage?: string;
  verifyFailureMessage?: string;
}

export function useTotpEnrollment(options: TotpEnrollmentOptions) {
  const [loading, setLoading] = createSignal(false);
  const [code, setCode] = createSignal("");
  const [enrollment, setEnrollment] = createSignal<TotpEnrollmentState | null>(
    null,
  );
  const [recoveryCodes, setRecoveryCodes] = createSignal<string[]>([]);

  async function beginEnrollment() {
    setLoading(true);
    try {
      const nextEnrollment = await beginTotpEnrollment();
      setEnrollment(nextEnrollment);
      if (options.beginInfoMessage) {
        options.enqueueInfoSnackBar(options.beginInfoMessage);
      }
    } catch (error: unknown) {
      options.enqueueErrorSnackBar(actionErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function verifyEnrollment() {
    setLoading(true);
    try {
      const nextRecoveryCodes = await finishTotpEnrollment(code());
      setRecoveryCodes(nextRecoveryCodes);
      setEnrollment(null);
      setCode("");
      await options.refreshStatus();
      options.enqueueSuccessSnackBar(
        options.verifySuccessMessage ??
          "Aplicación de autenticación configurada",
      );
    } catch (error: unknown) {
      options.enqueueErrorSnackBar(actionErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setLoading(false);
    setCode("");
    setEnrollment(null);
    setRecoveryCodes([]);
  }

  return {
    loading,
    code,
    enrollment,
    recoveryCodes,
    setCode,
    beginEnrollment,
    verifyEnrollment,
    reset,
  };
}
